from __future__ import annotations

import json
import re
from html import escape, unescape
from io import BytesIO
from uuid import UUID

from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_evaluation import EiaEvaluationRun
from app.models.project import Project
from app.models.user import User
from app.services.eia_service import DOCUMENT_READ_ROLES, get_eia_document_progress, require_eia_document_permission


def _create_docx_document():
    try:
        from docx import Document as create_document
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "DOCX export requires python-docx to be installed in the backend environment."
        ) from exc

    return create_document()


def build_compiled_eia_payload(db: Session, current_user: User, document_id: UUID) -> dict[str, object]:
    document = _get_export_document(db, current_user, document_id)
    progress = get_eia_document_progress(db, current_user, document_id)
    latest_run = next((run for run in document.evaluation_runs if run.status == "COMPLETED"), None)
    attachments_by_subsection = _attachments_by_subsection(document)

    return {
        "document": {
            "id": str(document.id),
            "project_id": str(document.project_id),
            "title": document.title,
            "status": document.status,
            "metadata": document.document_metadata,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
        },
        "project": _serialize_project(document.project),
        "progress": json.loads(progress.model_dump_json()),
        "latest_evaluation": _serialize_latest_evaluation(latest_run),
        "sections": [
            {
                "id": str(section.id),
                "section_number": section.section_number,
                "title": section.title,
                "subsections": [
                    {
                        "id": str(subsection.id),
                        "subsection_number": subsection.subsection_number,
                        "title": subsection.title,
                        "completion_status": subsection.completion_status,
                        "progress_percentage": subsection.progress_percentage,
                        "assigned_to_id": str(subsection.assigned_to_id) if subsection.assigned_to_id else None,
                        "last_edited_at": (
                            subsection.last_edited_at.isoformat() if subsection.last_edited_at else None
                        ),
                        "content": _export_content(subsection),
                        "attachments": [
                            {
                                "id": str(attachment.id),
                                "original_filename": attachment.original_filename,
                                "attachment_type": attachment.attachment_type,
                                "mime_type": attachment.mime_type,
                                "size_bytes": attachment.size_bytes,
                                "storage_path": attachment.storage_path,
                            }
                            for attachment in attachments_by_subsection.get(subsection.id, [])
                        ],
                    }
                    for subsection in section.subsections
                ],
            }
            for section in document.sections
        ],
    }


def build_compiled_eia_json_bytes(db: Session, current_user: User, document_id: UUID) -> bytes:
    payload = build_compiled_eia_payload(db, current_user, document_id)
    return json.dumps(payload, indent=2).encode("utf-8")


def build_compiled_eia_docx_bytes(db: Session, current_user: User, document_id: UUID) -> bytes:
    payload = build_compiled_eia_payload(db, current_user, document_id)
    document = _create_docx_document()

    compiled_document = payload["document"]
    project = payload["project"]
    latest_evaluation = payload["latest_evaluation"]

    document.add_heading(str(compiled_document["title"]), 0)
    document.add_paragraph(f"Project: {project['name']}")
    document.add_paragraph(f"Status: {compiled_document['status']}")
    document.add_paragraph(
        f"Location: {project['country'] or 'Unspecified'}"
        + (f" / {project['location']}" if project["location"] else "")
    )
    if latest_evaluation and latest_evaluation["scoring_enabled"]:
        document.add_paragraph(
            "Latest review: "
            f"{latest_evaluation['overall_score']}/10 "
            f"({latest_evaluation['overall_appraisal']})"
        )

    for section in payload["sections"]:
        document.add_heading(f"Section {section['section_number']} - {section['title']}", level=1)
        for subsection in section["subsections"]:
            document.add_heading(
                f"{subsection['subsection_number']} - {subsection['title']}",
                level=2,
            )
            document.add_paragraph(
                f"Status: {subsection['completion_status']} | Progress: "
                f"{round(float(subsection['progress_percentage']))}%"
            )
            content = str(subsection["content"]).strip() or "No draft content yet."
            for paragraph in _split_paragraphs(content):
                document.add_paragraph(paragraph)
            attachments = subsection["attachments"]
            if attachments:
                document.add_paragraph("Supporting attachments:")
                for attachment in attachments:
                    document.add_paragraph(
                        f"{attachment['original_filename']} ({attachment['attachment_type']})",
                        style="List Bullet",
                    )

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def build_compiled_eia_pdf_bytes(db: Session, current_user: User, document_id: UUID) -> bytes:
    payload = build_compiled_eia_payload(db, current_user, document_id)
    styles = getSampleStyleSheet()
    buffer = BytesIO()
    story = []

    compiled_document = payload["document"]
    project = payload["project"]
    latest_evaluation = payload["latest_evaluation"]

    story.extend(
        [
            Paragraph(escape(str(compiled_document["title"])), styles["Title"]),
            Spacer(1, 12),
            Paragraph(f"Project: {escape(str(project['name']))}", styles["Normal"]),
            Paragraph(f"Status: {escape(str(compiled_document['status']))}", styles["Normal"]),
            Paragraph(
                "Location: "
                + escape(
                    f"{project['country'] or 'Unspecified'}"
                    + (f" / {project['location']}" if project["location"] else "")
                ),
                styles["Normal"],
            ),
        ]
    )
    if latest_evaluation and latest_evaluation["scoring_enabled"]:
        story.append(
            Paragraph(
                "Latest review: "
                + escape(
                    f"{latest_evaluation['overall_score']}/10 "
                    f"({latest_evaluation['overall_appraisal']})"
                ),
                styles["Normal"],
            )
        )
    story.append(Spacer(1, 12))

    for section in payload["sections"]:
        story.append(
            Paragraph(
                escape(f"Section {section['section_number']} - {section['title']}"),
                styles["Heading1"],
            )
        )
        for subsection in section["subsections"]:
            story.append(
                Paragraph(
                    escape(f"{subsection['subsection_number']} - {subsection['title']}"),
                    styles["Heading2"],
                )
            )
            story.append(
                Paragraph(
                    escape(
                        f"Status: {subsection['completion_status']} | Progress: "
                        f"{round(float(subsection['progress_percentage']))}%"
                    ),
                    styles["Normal"],
                )
            )
            content = str(subsection["content"]).strip() or "No draft content yet."
            for paragraph in _split_paragraphs(content):
                story.append(Paragraph(_pdf_safe_text(paragraph), styles["Normal"]))
            attachments = subsection["attachments"]
            if attachments:
                attachment_line = ", ".join(
                    f"{attachment['original_filename']} ({attachment['attachment_type']})"
                    for attachment in attachments
                )
                story.append(Paragraph(_pdf_safe_text(f"Attachments: {attachment_line}"), styles["Normal"]))
            story.append(Spacer(1, 8))

    pdf = SimpleDocTemplate(buffer, pagesize=A4)
    pdf.build(story)
    return buffer.getvalue()


def _get_export_document(db: Session, current_user: User, document_id: UUID) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.project),
            selectinload(EiaDocument.members),
            selectinload(EiaDocument.attachments),
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
            selectinload(EiaDocument.evaluation_runs),
        )
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, DOCUMENT_READ_ROLES, "export")
    return document


def _serialize_project(project: Project) -> dict[str, object]:
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "sector": project.sector,
        "country": project.country,
        "location": project.location,
        "status": project.status,
        "metadata": project.project_metadata,
    }


def _serialize_latest_evaluation(run: EiaEvaluationRun | None) -> dict[str, object] | None:
    if run is None:
        return None
    return {
        "id": str(run.id),
        "status": run.status,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "overall_score": run.run_metadata.get("overall_score"),
        "overall_appraisal": run.run_metadata.get("overall_appraisal"),
        "scoring_enabled": run.run_metadata.get("scoring_enabled") is True,
        "checklist_version": run.checklist_version,
        "methodology_version": run.methodology_version,
        "rules_version": run.rules_version,
    }


def _attachments_by_subsection(document: EiaDocument) -> dict[UUID, list[object]]:
    grouped: dict[UUID, list[object]] = {}
    for attachment in document.attachments:
        grouped.setdefault(attachment.subsection_id, []).append(attachment)
    return grouped


def _export_content(subsection: EiaSubSection) -> str:
    if subsection.content_html:
        return _html_to_text(subsection.content_html)
    if subsection.content:
        return _html_to_text(subsection.content)
    return ""


def _html_to_text(value: str) -> str:
    normalized = re.sub(r"<\s*br\s*/?\s*>", "\n", value, flags=re.IGNORECASE)
    normalized = re.sub(r"</p\s*>", "\n\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<li\s*>", "- ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"</li\s*>", "\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<[^>]+>", "", normalized)
    normalized = unescape(normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _split_paragraphs(content: str) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", content) if paragraph.strip()]
    return paragraphs or [content.strip()]


def _pdf_safe_text(value: str) -> str:
    return escape(value).replace("\n", "<br/>")
