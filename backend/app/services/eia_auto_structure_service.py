from __future__ import annotations

from datetime import UTC, datetime
from difflib import SequenceMatcher
from html import escape
import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.document import Document, DocumentVersion
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_source_mapping import EiaSourceMapping
from app.models.user import User
from app.schemas.eia import EiaSourceDetectedSection
from app.services.audit_service import record_audit_event


AUTO_MAPPING_METHOD = "auto_parsed_upload"
AUTO_METADATA_KEY = "auto_structure"


def auto_structure_eia_document(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    source_document_id: UUID,
    *,
    source_version_id: UUID | None = None,
    apply_detected_content: bool = True,
) -> dict[str, object]:
    document = db.scalar(
        select(EiaDocument)
        .options(selectinload(EiaDocument.sections).selectinload(EiaSection.subsections))
        .where(EiaDocument.id == eia_document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")

    source_document, source_version = _resolve_source_document_version(
        db,
        current_user,
        project_id=document.project_id,
        source_document_id=source_document_id,
        source_version_id=source_version_id,
    )
    detected_sections = _detected_sections_from_metadata(source_document, source_version)
    if not detected_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected source document does not have parsed sections available for auto-structuring",
        )

    subsections = [subsection for section in document.sections for subsection in section.subsections]
    subsection_lookup = {subsection.id: subsection for subsection in subsections}
    grouped_html: dict[UUID, list[str]] = {}
    grouped_titles: dict[UUID, list[str]] = {}
    grouped_mapping_ids: dict[UUID, list[EiaSourceMapping]] = {}
    applied_subsections = 0
    matched_sections = 0
    unmatched_sections = 0

    for detected_section in detected_sections:
        subsection, confidence = _best_subsection_match(document, detected_section)
        html_fragment = _content_to_html(detected_section)
        mapping = EiaSourceMapping(
            tenant_id=current_user.tenant_id,
            eia_document_id=document.id,
            source_document_id=source_document.id,
            source_version_id=source_version.id if source_version else None,
            subsection_id=subsection.id if subsection else None,
            detected_section_number=detected_section.section_number,
            detected_title=detected_section.title,
            detected_content=detected_section.content,
            suggested_content_html=html_fragment,
            confidence_score=confidence,
            status="NEEDS_REVIEW",
            detection_method=AUTO_MAPPING_METHOD,
            assistant_notes=(
                "Auto-structured from parsed upload into the best-matching checklist subsection."
                if subsection
                else "Auto-structuring could not find a confident checklist subsection match."
            ),
            mapping_metadata={
                "auto_generated": True,
                "input_confidence": detected_section.confidence,
                "detected_metadata": detected_section.metadata,
            },
        )
        db.add(mapping)
        if subsection is None:
            unmatched_sections += 1
            continue

        matched_sections += 1
        grouped_mapping_ids.setdefault(subsection.id, []).append(mapping)
        grouped_titles.setdefault(subsection.id, []).append(_mapping_heading(detected_section))
        if html_fragment:
            grouped_html.setdefault(subsection.id, []).append(html_fragment)

    now = datetime.now(UTC)
    for subsection_id, mapping_group in grouped_mapping_ids.items():
        subsection = subsection_lookup[subsection_id]
        combined_html = _combine_generated_html(grouped_titles.get(subsection_id, []), grouped_html.get(subsection_id, []))
        has_manual_content = _has_meaningful_content(subsection.content_html or subsection.content)
        should_apply = apply_detected_content and combined_html is not None and not has_manual_content

        for mapping in mapping_group:
            mapping.confirmed_by_id = current_user.id
            mapping.confirmed_at = now
            mapping.status = "APPLIED" if should_apply else "CONFIRMED"

        if not should_apply:
            continue

        subsection.content_html = combined_html
        subsection.content = combined_html
        subsection.content_json = None
        subsection.last_edited_by_id = current_user.id
        subsection.last_edited_at = now
        subsection.completion_status = "IN_PROGRESS"
        subsection.progress_percentage = max(subsection.progress_percentage, _auto_progress_score(mapping_group))
        subsection.content_metadata = {
            **(subsection.content_metadata or {}),
            "auto_generated": True,
            "auto_generated_at": now.isoformat(),
            "auto_generated_from_document_id": str(source_document.id),
            "auto_generated_from_version_id": str(source_version.id) if source_version else None,
            "auto_generated_mapping_ids": [str(mapping.id) for mapping in mapping_group],
        }
        applied_subsections += 1

    document.document_metadata = {
        **(document.document_metadata or {}),
        AUTO_METADATA_KEY: {
            "source_document_id": str(source_document.id),
            "source_version_id": str(source_version.id) if source_version else None,
            "detected_sections": len(detected_sections),
            "matched_sections": matched_sections,
            "unmatched_sections": unmatched_sections,
            "applied_subsections": applied_subsections,
            "applied_detected_content": apply_detected_content,
            "updated_at": now.isoformat(),
        },
    }
    if applied_subsections and document.status == "draft":
        document.status = "structured"

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.auto_structure.completed",
        entity_type="eia_document",
        entity_id=document.id,
        summary=f"Auto-structured {applied_subsections} subsections from {source_document.original_filename}",
        metadata={
            "source_document_id": str(source_document.id),
            "source_version_id": str(source_version.id) if source_version else None,
            "matched_sections": matched_sections,
            "applied_subsections": applied_subsections,
            "unmatched_sections": unmatched_sections,
        },
    )

    return {
        "source_document_id": source_document.id,
        "source_version_id": source_version.id if source_version else None,
        "detected_sections": len(detected_sections),
        "matched_sections": matched_sections,
        "unmatched_sections": unmatched_sections,
        "applied_subsections": applied_subsections,
    }


def _resolve_source_document_version(
    db: Session,
    current_user: User,
    *,
    project_id: UUID,
    source_document_id: UUID,
    source_version_id: UUID | None,
) -> tuple[Document, DocumentVersion | None]:
    source_document = db.get(Document, source_document_id)
    if (
        source_document is None
        or source_document.tenant_id != current_user.tenant_id
        or source_document.project_id != project_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document not found")

    resolved_version_id = source_version_id or source_document.current_version_id
    if resolved_version_id is None:
        return source_document, None

    source_version = db.get(DocumentVersion, resolved_version_id)
    if (
        source_version is None
        or source_version.tenant_id != current_user.tenant_id
        or source_version.document_id != source_document.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document version not found")
    return source_document, source_version


def _detected_sections_from_metadata(
    source_document: Document,
    source_version: DocumentVersion | None,
) -> list[EiaSourceDetectedSection]:
    metadata_sections = None
    if source_version and isinstance(source_version.version_metadata, dict):
        metadata_sections = source_version.version_metadata.get("detected_sections")
    if metadata_sections is None and isinstance(source_document.document_metadata, dict):
        metadata_sections = source_document.document_metadata.get("detected_sections")
    if not isinstance(metadata_sections, list):
        return []

    detected_sections: list[EiaSourceDetectedSection] = []
    for item in metadata_sections:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            continue
        detected_sections.append(
            EiaSourceDetectedSection(
                section_number=item.get("section_number") if isinstance(item.get("section_number"), str) else None,
                title=title.strip(),
                content=item.get("content") if isinstance(item.get("content"), str) else None,
                confidence=item.get("confidence") if isinstance(item.get("confidence"), (int, float)) else None,
                metadata=item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
            )
        )
    return detected_sections


def _best_subsection_match(
    document: EiaDocument,
    detected_section: EiaSourceDetectedSection,
) -> tuple[EiaSubSection | None, float]:
    subsections = [subsection for section in document.sections for subsection in section.subsections]
    if detected_section.section_number:
        normalized = detected_section.section_number.strip()
        exact = next((subsection for subsection in subsections if subsection.subsection_number == normalized), None)
        if exact:
            return exact, max(float(detected_section.confidence or 0.0), 0.96)

        top_level = normalized.split(".")[0]
        section_match = next((section for section in document.sections if section.section_number == top_level), None)
        if section_match and section_match.subsections:
            best_in_section = _best_title_match(section_match.subsections, detected_section.title)
            if best_in_section is not None:
                return best_in_section

    return _best_title_match(subsections, detected_section.title)


def _best_title_match(subsections: list[EiaSubSection], detected_title: str) -> tuple[EiaSubSection | None, float]:
    normalized_title = _normalize_text(detected_title)
    best_subsection: EiaSubSection | None = None
    best_score = 0.0
    for subsection in subsections:
        score = SequenceMatcher(None, normalized_title, _normalize_text(subsection.title)).ratio()
        if score > best_score:
            best_score = score
            best_subsection = subsection
    if best_subsection is None or best_score < 0.35:
        return None, 0.0
    return best_subsection, round(min(0.94, best_score), 2)


def _mapping_heading(detected_section: EiaSourceDetectedSection) -> str:
    if detected_section.section_number:
        return f"{detected_section.section_number} {detected_section.title}".strip()
    return detected_section.title


def _content_to_html(detected_section: EiaSourceDetectedSection) -> str | None:
    if not detected_section.content:
        return None
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", detected_section.content) if paragraph.strip()]
    if not paragraphs:
        return None
    heading = escape(_mapping_heading(detected_section))
    html_parts = [f"<h3>{heading}</h3>"]
    html_parts.extend(f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs)
    return "".join(html_parts)


def _combine_generated_html(headings: list[str], fragments: list[str]) -> str | None:
    if not fragments:
        if not headings:
            return None
        return "".join(f"<p>{escape(heading)}</p>" for heading in headings)
    return "".join(fragments)


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _has_meaningful_content(value: str | None) -> bool:
    if not value:
        return False
    compact = re.sub(r"<[^>]+>", " ", value).replace("&nbsp;", " ").strip()
    return bool(compact)


def _auto_progress_score(mappings: list[EiaSourceMapping]) -> float:
    if not mappings:
        return 0.0
    average_confidence = sum(mapping.confidence_score for mapping in mappings) / len(mappings)
    return round(max(40.0, min(85.0, average_confidence * 100)), 2)
