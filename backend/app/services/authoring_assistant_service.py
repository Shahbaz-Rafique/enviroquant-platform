from __future__ import annotations

import json
from html import escape
import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.eia import EiaDocument, EiaSubSection
from app.models.user import User
from app.schemas.eia import EiaAuthoringAssistRequest, EiaAuthoringAssistResponse
from app.services.eia_service import DOCUMENT_EDIT_ROLES, require_subsection_permission


def generate_authoring_guidance(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    payload: EiaAuthoringAssistRequest,
) -> EiaAuthoringAssistResponse:
    subsection = db.scalar(
        select(EiaSubSection)
        .options(
            selectinload(EiaSubSection.document).selectinload(EiaDocument.members),
            selectinload(EiaSubSection.section),
            selectinload(EiaSubSection.attachments),
            selectinload(EiaSubSection.checklist_mappings),
            selectinload(EiaSubSection.source_mappings),
        )
        .where(EiaSubSection.id == subsection_id, EiaSubSection.tenant_id == current_user.tenant_id)
    )
    if subsection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    require_subsection_permission(subsection, current_user, DOCUMENT_EDIT_ROLES, "generate authoring guidance for")

    settings = get_settings()
    if settings.openai_api_key:
        result = _generate_with_openai(subsection, payload, settings)
        if result is not None:
            return result
    return _deterministic_authoring_guidance(subsection, payload, settings)


def _generate_with_openai(
    subsection: EiaSubSection,
    payload: EiaAuthoringAssistRequest,
    settings,
) -> EiaAuthoringAssistResponse | None:
    try:
        from openai import OpenAI
    except ImportError:
        return None

    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_evaluation_timeout_seconds)
    schema = {
        "name": "eia_authoring_guidance",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "summary": {"type": "string"},
                "generated_html": {"type": "string"},
                "guidance_points": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["summary", "generated_html", "guidance_points"],
        },
    }
    try:
        response = client.chat.completions.create(
            model=settings.openai_evaluation_model,
            temperature=0.2,
            response_format={"type": "json_schema", "json_schema": schema},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are EnviroQuant's EIA drafting assistant. Produce authoring guidance grounded in the "
                        "subsection checklist, current draft, attachments, and mapped source context. Use only simple "
                        "HTML tags like h2, h3, p, ul, li, strong. Do not invent evidence."
                    ),
                },
                {"role": "user", "content": _build_authoring_prompt(subsection, payload)},
            ],
        )
        output = json.loads(response.choices[0].message.content or "{}")
        return EiaAuthoringAssistResponse(
            action=payload.action,
            engine="openai",
            model_version=settings.openai_evaluation_model,
            summary=str(output.get("summary") or "AI guidance generated.").strip(),
            generated_html=str(output.get("generated_html") or "<p>No guidance generated.</p>").strip(),
            guidance_points=[
                str(item).strip()
                for item in output.get("guidance_points", [])
                if isinstance(item, str) and item.strip()
            ],
            metadata={"used_openai": True},
        )
    except Exception:
        return None


def _deterministic_authoring_guidance(
    subsection: EiaSubSection,
    payload: EiaAuthoringAssistRequest,
    settings,
) -> EiaAuthoringAssistResponse:
    checklist_titles = [mapping.checklist_title for mapping in subsection.checklist_mappings] or [subsection.title]
    evidence_names = [attachment.original_filename for attachment in subsection.attachments[:5]]
    mapped_titles = [mapping.detected_title or mapping.detected_section_number or "Mapped source" for mapping in subsection.source_mappings[:5]]
    generated_html, summary, guidance_points = _build_deterministic_content(
        subsection=subsection,
        action=payload.action,
        checklist_titles=checklist_titles,
        evidence_names=evidence_names,
        mapped_titles=mapped_titles,
        instructions=payload.instructions,
    )
    return EiaAuthoringAssistResponse(
        action=payload.action,
        engine="rules",
        model_version="deterministic-authoring-fallback",
        summary=summary,
        generated_html=generated_html,
        guidance_points=guidance_points,
        metadata={"used_openai": False, "attachment_count": len(evidence_names), "mapped_source_count": len(mapped_titles)},
    )


def _build_authoring_prompt(subsection: EiaSubSection, payload: EiaAuthoringAssistRequest) -> str:
    checklist_lines = "\n".join(f"- {mapping.checklist_title}" for mapping in subsection.checklist_mappings) or f"- {subsection.title}"
    attachment_lines = "\n".join(f"- {attachment.original_filename}" for attachment in subsection.attachments[:8]) or "- No attachments"
    mapping_lines = "\n".join(
        f"- {mapping.detected_title or mapping.detected_section_number or 'Mapped source'}: "
        f"{_plaintext(mapping.detected_content or '')[:1800]}"
        for mapping in subsection.source_mappings[:8]
    ) or "- No mapped sources"
    current_draft = (subsection.content_html or subsection.content or "").strip() or "[no draft]"
    return f"""
Action: {payload.action}
Subsection: {subsection.subsection_number} - {subsection.title}
Section: {subsection.section.section_number} - {subsection.section.title}

Checklist expectations:
{checklist_lines}

Current draft:
{current_draft[:12000]}

Attachments:
{attachment_lines}

Mapped source suggestions:
{mapping_lines}

Evidence rule:
Draft only from the current content and quoted mapped-source text above. If those sources do not support a
project-specific statement, identify the missing evidence instead of completing the statement from general knowledge.

Additional user instructions:
{payload.instructions or "[none]"}
""".strip()


def _build_deterministic_content(
    *,
    subsection: EiaSubSection,
    action: str,
    checklist_titles: list[str],
    evidence_names: list[str],
    mapped_titles: list[str],
    instructions: str | None,
) -> tuple[str, str, list[str]]:
    safe_title = escape(subsection.title)
    safe_number = escape(subsection.subsection_number)
    instruction_block = f"<p><strong>User note:</strong> {escape(instructions)}</p>" if instructions else ""
    evidence_items = (
        "".join(f"<li>{escape(name)}: extract the figure, table, or statement that supports the subsection.</li>" for name in evidence_names)
        if evidence_names
        else "<li>Add source documents, baseline studies, permits, survey outputs, or model results before finalizing the draft.</li>"
    )
    checklist_items = "".join(f"<li>{escape(title)}</li>" for title in checklist_titles)
    mapped_items = (
        "".join(f"<li>{escape(title)}</li>" for title in mapped_titles)
        if mapped_titles
        else "<li>No mapped source sections have been confirmed for this subsection yet.</li>"
    )

    if action == "OUTLINE":
        html = (
            f"<h2>{safe_number} Drafting Outline</h2>"
            f"<p>Structure the subsection so each checklist expectation is covered with project-specific evidence.</p>"
            f"{instruction_block}"
            f"<h3>Checklist Coverage</h3><ul>{checklist_items}</ul>"
            "<h3>Recommended Draft Structure</h3>"
            "<ul>"
            "<li>Existing baseline and receptor context.</li>"
            "<li>Impact pathway, magnitude, duration, and significance.</li>"
            "<li>Mitigation measures, implementation owner, and timing.</li>"
            "<li>Residual effects, monitoring thresholds, and follow-up commitments.</li>"
            "</ul>"
        )
        summary = f"Generated an evidence-aware outline for {subsection.subsection_number}."
        points = [
            "Cover every checklist expectation explicitly rather than implying coverage.",
            "Tie claims to quantified evidence, assumptions, and cited source material.",
            "State mitigation, monitoring, and residual effects clearly.",
        ]
        return html, summary, points

    if action == "EVIDENCE_GAPS":
        html = (
            f"<h2>{safe_number} Evidence Gaps</h2>"
            f"<p>Use this checklist to close the evidence trail for {safe_title}.</p>"
            f"{instruction_block}"
            f"<h3>Expected Evidence</h3><ul>{evidence_items}</ul>"
            f"<h3>Mapped Source Context</h3><ul>{mapped_items}</ul>"
            "<h3>What to Add</h3>"
            "<ul>"
            "<li>Quantified values, thresholds, or modeled outputs where available.</li>"
            "<li>Specific receptor names, affected areas, and implementation commitments.</li>"
            "<li>Any remaining assumptions or unresolved data gaps.</li>"
            "</ul>"
        )
        summary = f"Generated evidence-gap guidance for {subsection.subsection_number}."
        points = [
            "Replace generic claims with cited figures, thresholds, and units.",
            "Record unresolved data gaps explicitly so reviewers can assess residual risk.",
            "Link each substantive claim to a document, figure, page, or dataset.",
        ]
        return html, summary, points

    current_text = _plaintext(subsection.content_html or subsection.content)
    if action == "IMPROVE_DRAFT" and current_text:
        html = (
            f"<h2>{safe_number} Improved Draft Direction</h2>"
            f"<p>Retain the current draft core, but tighten the reasoning and evidence trail.</p>"
            f"{instruction_block}"
            "<h3>Revision Priorities</h3>"
            "<ul>"
            "<li>Make significance judgments explicit and tied to receptors, thresholds, or compliance obligations.</li>"
            "<li>Replace broad statements with quantified detail wherever the evidence supports it.</li>"
            "<li>Close the draft with mitigation, residual effects, and monitoring commitments.</li>"
            "</ul>"
            f"<h3>Checklist Targets</h3><ul>{checklist_items}</ul>"
            "<h3>Revision Prompt</h3>"
            f"<p>Rewrite the existing subsection so it addresses {safe_title} in a project-specific, evidence-backed way, preserving only statements that can be supported by uploaded material.</p>"
        )
        summary = f"Generated an improvement brief for the existing {subsection.subsection_number} draft."
        points = [
            "Keep only claims that can be traced to evidence or project metadata.",
            "Strengthen significance reasoning and receptor-specific implications.",
            "End with monitoring and implementation commitments.",
        ]
        return html, summary, points

    html = (
        f"<h2>{safe_number} Draft Starter</h2>"
        f"<p>This starter draft is structured for {safe_title} and should be refined against project evidence before review.</p>"
        f"{instruction_block}"
        "<h3>Baseline and Existing Conditions</h3>"
        "<p>Describe the current environmental setting, sensitive receptors, spatial boundary, and relevant constraints for this subsection.</p>"
        "<h3>Impact and Significance</h3>"
        "<p>Explain the impact pathway, magnitude, duration, reversibility, and significance, citing any quantitative thresholds, standards, or modeled values available.</p>"
        "<h3>Mitigation and Monitoring</h3>"
        "<p>Set out the proposed mitigation measures, implementation responsibilities, residual effects, and monitoring triggers or indicators.</p>"
        f"<h3>Checklist Targets</h3><ul>{checklist_items}</ul>"
        f"<h3>Evidence To Pull In</h3><ul>{evidence_items}</ul>"
    )
    summary = f"Generated a draft starter for {subsection.subsection_number}."
    points = [
        "Adapt the starter to the specific project and site context.",
        "Add cited evidence, quantified assumptions, and compliance references.",
        "State residual impacts and monitoring expectations explicitly.",
    ]
    return html, summary, points


def _plaintext(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"<[^>]+>", " ", value).replace("&nbsp;", " ").strip()
