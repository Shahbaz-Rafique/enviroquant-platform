"""One-way migration from the legacy RQEIA-as-builder layout to the report layout."""
from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaDocument, EiaSection
from app.models.user import User
from app.seeds.eia_checklist_seed import EIA_BUILDER_STRUCTURE, RQEIA_REVIEW_STRUCTURE, seed_eia_structure
from app.services.eia_service import DOCUMENT_EDIT_ROLES, require_eia_document_permission


LEGACY_TO_BUILDER = {
    "1": "2.1",
    "2": "4.1",
    "3": "5.1",
    "4": "6.1",
    "5": "7.1",
    "6": "1.1",
    "7": "3.1",
    "8": "13.1",
}


def migrate_legacy_eia_builder_structure(db: Session, user: User, document_id: UUID) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.members),
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
        )
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == user.tenant_id)
    )
    if document is None:
        raise HTTPException(404, "EIA document not found")
    require_eia_document_permission(document, user, DOCUMENT_EDIT_ROLES, "migrate builder structure")

    current = {section.section_number: section for section in document.sections}
    expected_legacy = set(RQEIA_REVIEW_STRUCTURE)
    if set(current) != expected_legacy:
        if set(EIA_BUILDER_STRUCTURE).issubset(set(current)):
            return document
        raise HTTPException(409, "This document does not use the recognised legacy RQEIA builder structure.")

    backup = [
        {
            "section_number": section.section_number,
            "title": section.title,
            "subsections": [
                {
                    "subsection_number": subsection.subsection_number,
                    "title": subsection.title,
                    "content": subsection.content,
                    "content_html": subsection.content_html,
                    "content_json": subsection.content_json,
                }
                for subsection in section.subsections
            ],
        }
        for section in document.sections
    ]

    for section in document.sections:
        section.section_number = f"L{section.section_number}"
    db.flush()
    seed_eia_structure(db, document)
    db.flush()

    new_sections = list(
        db.scalars(
            select(EiaSection)
            .options(selectinload(EiaSection.subsections))
            .where(EiaSection.eia_document_id == document.id)
        ).unique().all()
    )
    new_subsections = {
        subsection.subsection_number: subsection
        for section in new_sections
        if not section.section_number.startswith("L")
        for subsection in section.subsections
    }
    for old_number, target_number in LEGACY_TO_BUILDER.items():
        legacy_section = current[old_number]
        target = new_subsections[target_number]
        blocks = []
        plain_blocks = []
        for subsection in legacy_section.subsections:
            content_html = (subsection.content_html or "").strip()
            content = (subsection.content or "").strip()
            if content_html or content:
                blocks.append(f"<h3>{subsection.subsection_number} {subsection.title}</h3>{content_html or f'<p>{content}</p>'}")
                plain_blocks.append(f"{subsection.subsection_number} {subsection.title}\n{content}")
        target.content_html = "".join(blocks) or None
        target.content = "\n\n".join(plain_blocks)
        target.progress_percentage = 100.0 if blocks else 0.0
        target.completion_status = "IN_PROGRESS" if blocks else "NOT_STARTED"
        target.content_metadata = {
            **(target.content_metadata or {}),
            "migrated_from_rqeia_area": old_number,
            "migration_requires_consultant_review": True,
        }

    for section in list(new_sections):
        if section.section_number.startswith("L"):
            db.delete(section)

    metadata = deepcopy(document.document_metadata or {})
    metadata["builder_template"] = "enviroquant-eia-export-2026.1"
    metadata["legacy_rqeia_builder_backup"] = backup
    metadata["builder_structure_migrated_at"] = datetime.now(UTC).isoformat()
    metadata["migration_notice"] = (
        "Legacy authoring content was mapped into the final EIA report structure. "
        "A consultant must review placement before controlled issue."
    )
    document.document_metadata = metadata
    db.commit()
    return document
