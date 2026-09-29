"""Fill one existing EIA with clearly labelled demonstration content and export DOCX."""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models.eia import EiaDocument, EiaSection
from app.services.eia_document_export_service import build_compiled_eia_docx_bytes


def _plain_question(title: str) -> str:
    return re.sub(r"^(Are|Is|Does)\s+", "", title.rstrip("?")).strip()


def _topic_content(section_number: str, title: str, project) -> tuple[str, list[str], str]:
    q = title.lower()
    project_name = project.name
    location = " / ".join(part for part in (project.country, project.location) if part) or "the project area"
    evidence = "Project design drawings, field survey records, permits, specialist studies and consultation records"
    limitation = "Final quantities, coordinates and thresholds must be confirmed against approved design data and applicable authority requirements."

    if section_number == "1":
        body = (
            f"{project_name} is presented as a proposed development at {location}. This demonstration assessment "
            "describes the construction, commissioning, operation and eventual closure activities that could interact "
            "with environmental and social receptors. The project need is to deliver the proposed facility while "
            "controlling land, resource, emissions, waste, traffic and community impacts through its full life cycle."
        )
        actions = [
            "Confirm the final design basis, footprint, schedule and workforce profile.",
            "Insert approved layout drawings, access routes, utilities and temporary work areas.",
            "Quantify material, water, energy, waste, emission and traffic estimates by phase.",
        ]
    elif section_number == "2":
        body = (
            "The alternatives assessment compares the no-project option with feasible site, layout, technology, "
            "construction and operating options. Each option should be assessed consistently for land take, sensitive "
            "receptors, resource efficiency, pollution, climate resilience, community effects, constructability and cost. "
            "The preferred option should be the one that best avoids impacts before relying on mitigation."
        )
        actions = [
            "Add an alternatives matrix with consistent environmental and social criteria.",
            "Document the no-project scenario and reasons rejected options were not carried forward.",
            "Record the decision-makers, consultation inputs and date of the preferred-option decision.",
        ]
    elif section_number == "3":
        body = (
            f"The baseline study area must cover the project footprint at {location}, associated facilities, transport "
            "routes and the wider zone in which indirect or cumulative effects could occur. Baseline information should "
            "describe current land use, soils, water, air, noise, biodiversity, cultural heritage, material assets and "
            "socio-economic conditions, including seasonal variation and vulnerable receptors."
        )
        actions = [
            "Add dated survey results, coordinates, maps and laboratory accreditation details.",
            "Identify sensitive receptors and explain the spatial and temporal study boundaries.",
            "List data gaps, survey limitations and the assumptions used to address them.",
        ]
    elif section_number == "4":
        body = (
            "Potential effects are assessed by linking each project activity to an environmental or social receptor. "
            "Significance should consider magnitude, receptor sensitivity, geographic extent, duration, frequency, "
            "reversibility, likelihood and confidence. The assessment should cover direct, indirect, induced, cumulative, "
            "temporary, permanent, positive and adverse effects, with credible worst-case assumptions where uncertainty remains."
        )
        actions = [
            "Add an impact register connecting activities, pathways, receptors and significance ratings.",
            "State the prediction method, assessment criteria and evidence for each material effect.",
            "Separate pre-mitigation effects from residual effects after committed measures.",
        ]
    elif section_number == "5":
        body = (
            "Mitigation should follow the hierarchy of avoidance, minimization, restoration and, where appropriate, "
            "compensation for significant residual effects. Each commitment should be specific, measurable and linked "
            "to an owner, implementation phase, completion date, performance indicator and corrective-action trigger."
        )
        actions = [
            "Add a commitments register with accountable owners and implementation dates.",
            "Define monitoring locations, methods, frequency, thresholds and escalation actions.",
            "Explain residual effects and any impacts introduced by the mitigation itself.",
        ]
    elif section_number == "6":
        body = (
            f"In plain language, {project_name} is a proposed development at {location}. Its principal potential effects "
            "relate to land disturbance, construction traffic, resource use, emissions, waste, biodiversity and nearby "
            "communities. The preferred design and management measures should avoid sensitive areas, control pollution, "
            "monitor performance and provide a route for concerns to be raised and resolved."
        )
        actions = [
            "Add a simple location figure and project layout.",
            "Summarize the most important effects, mitigation and residual effects without technical jargon.",
            "Explain the approval process and how readers can access the full assessment and submit comments.",
        ]
    elif section_number == "7":
        body = (
            "The project is being assessed for the State of Kuwait. The regulatory register is anchored to official "
            "Kuwait Environment Public Authority sources, including Environmental Protection Law No. 42 of 2014 as "
            "amended by Law No. 99 of 2015 and the applicable KEPA executive regulations. Each requirement must be "
            "screened for project applicability and linked to source evidence, an assessment, identified gaps, actions "
            "and the authorised reviewer's decision before issue. KOC requirements apply only where the project, client "
            "or contract makes them applicable."
        )
        actions = [
            "Confirm the current KEPA approval pathway, permits and executive regulations with a qualified Kuwait practitioner.",
            "Record why each KEPA, ministry, municipal or KOC requirement applies to the project.",
            "Complete the legal register with requirement, official source, version, evidence, assessment, gap, action and reviewer decision.",
        ]
        limitation = "The Kuwait legal register is a decision-support aid and must be verified by the authorised local professional before controlled issue."
    else:
        body = (
            "The final report should read as one controlled document with consistent terminology, numbering and cross-"
            "references. Conclusions must trace to evidence, while detailed data, drawings, calculations and consultation "
            "records should be placed in clearly referenced appendices. Tables and figures should include titles, sources, "
            "dates, units, legends and accessible explanatory text."
        )
        actions = [
            "Generate and verify the table of contents, lists of figures and tables, and appendix references.",
            "Run a final terminology, unit, citation and cross-reference consistency check.",
            "Complete technical, legal and editorial quality assurance before controlled issue.",
        ]

    if any(word in q for word in ("waste", "effluent", "emission", "noise", "hazard", "accident")):
        evidence = "Waste inventories, emissions calculations, safety studies, monitoring plans and licensed contractor records"
    elif any(word in q for word in ("flora", "fauna", "habitat", "biodiversity")):
        evidence = "Seasonally appropriate ecological surveys, habitat maps, species records and conservation-status sources"
    elif any(word in q for word in ("social", "people", "employment", "displac", "consult")):
        evidence = "Census and livelihood data, stakeholder records, workforce estimates and grievance-management records"
    elif any(word in q for word in ("water", "hydrolog")):
        evidence = "Catchment maps, borehole and surface-water surveys, laboratory results and water-balance calculations"

    return body, actions, f"{evidence}. {limitation}"


def _content_html(section_number: str, section_title: str, subsection_title: str, project) -> str:
    body, actions, evidence = _topic_content(section_number, subsection_title, project)
    requirement = _plain_question(subsection_title)
    action_html = "".join(f"<li>{item}</li>" for item in actions)
    return (
        f"<h3>Assessment response</h3>"
        f"<p><strong>Demonstration scope:</strong> This illustrative response addresses whether {requirement.lower()}. "
        "It shows the expected structure and level of explanation; project-specific values require verification.</p>"
        f"<p>{body}</p>"
        f"<h3>Information to include in the controlled issue</h3><ul>{action_html}</ul>"
        f"<h3>Evidence and limitations</h3><p>{evidence}</p>"
        f"<p><strong>Section context:</strong> {section_number} — {section_title}.</p>"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--document-id", type=UUID, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("demo_outputs"))
    parser.add_argument("--confirm", action="store_true")
    args = parser.parse_args()
    if not args.confirm:
        raise SystemExit("Pass --confirm to update the selected EIA after creating a backup.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        document = db.scalar(
            select(EiaDocument)
            .options(
                selectinload(EiaDocument.project),
                selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
            )
            .where(EiaDocument.id == args.document_id)
        )
        if document is None:
            raise SystemExit("EIA document not found")

        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        backup_path = args.output_dir / f"{document.id}-before-demo-{stamp}.json"
        backup_path.write_text(
            json.dumps(
                {
                    "document_id": str(document.id),
                    "status": document.status,
                    "metadata": document.document_metadata,
                    "subsections": [
                        {
                            "id": str(sub.id),
                            "content": sub.content,
                            "content_html": sub.content_html,
                            "content_json": sub.content_json,
                            "completion_status": sub.completion_status,
                            "progress_percentage": sub.progress_percentage,
                            "last_edited_by_id": str(sub.last_edited_by_id) if sub.last_edited_by_id else None,
                            "last_edited_at": sub.last_edited_at.isoformat() if sub.last_edited_at else None,
                        }
                        for section in document.sections
                        for sub in section.subsections
                    ],
                },
                indent=2,
                default=str,
            )
        )

        now = datetime.now(UTC)
        for section in document.sections:
            for subsection in section.subsections:
                html = _content_html(section.section_number, section.title, subsection.title, document.project)
                subsection.content = html
                subsection.content_html = html
                subsection.content_json = None
                subsection.completion_status = "APPROVED"
                subsection.progress_percentage = 100.0
                subsection.last_edited_by_id = document.created_by_id
                subsection.last_edited_at = now

        document.status = "complete"
        document.document_metadata = {
            **(document.document_metadata or {}),
            "demonstration_document": True,
            "demonstration_notice": (
                "Illustrative content generated for product review. Verify project facts, evidence and legal "
                "requirements before external use."
            ),
            "demonstration_filled_at": now.isoformat(),
        }
        db.commit()

        creator = document.created_by
        docx = build_compiled_eia_docx_bytes(db, creator, document.id)
        output_path = args.output_dir / f"{document.title.replace(' ', '-')}-completed-demo.docx"
        output_path.write_bytes(docx)
        print(json.dumps({
            "document_id": str(document.id),
            "subsections_filled": sum(len(section.subsections) for section in document.sections),
            "backup": str(backup_path.resolve()),
            "docx": str(output_path.resolve()),
        }))


if __name__ == "__main__":
    main()
