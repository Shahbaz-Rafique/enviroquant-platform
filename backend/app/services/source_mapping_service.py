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
from app.schemas.eia import (
    EiaSourceDetectedSection,
    EiaSourceMappingConfirmRequest,
    EiaSourceMappingDetectRequest,
    EiaSourceMappingRejectRequest,
)
from app.services.audit_service import record_audit_event
from app.services.eia_service import DOCUMENT_EDIT_ROLES, DOCUMENT_READ_ROLES, require_eia_document_permission
from app.services.revision_service import create_subsection_revision


MAPPING_STATUS_SUGGESTED = "SUGGESTED"
MAPPING_STATUS_NEEDS_REVIEW = "NEEDS_REVIEW"
MAPPING_STATUS_CONFIRMED = "CONFIRMED"
MAPPING_STATUS_APPLIED = "APPLIED"
MAPPING_STATUS_REJECTED = "REJECTED"


def list_source_mappings(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    status_filter: str | None = None,
) -> list[dict[str, object]]:
    document = _get_document_with_mappings(db, current_user, eia_document_id, DOCUMENT_READ_ROLES, "view mappings")
    statement = (
        select(EiaSourceMapping)
        .options(
            selectinload(EiaSourceMapping.subsection),
            selectinload(EiaSourceMapping.source_document),
            selectinload(EiaSourceMapping.source_version),
            selectinload(EiaSourceMapping.confirmed_by),
        )
        .where(
            EiaSourceMapping.tenant_id == current_user.tenant_id,
            EiaSourceMapping.eia_document_id == document.id,
        )
        .order_by(EiaSourceMapping.updated_at.desc())
    )
    if status_filter:
        statement = statement.where(EiaSourceMapping.status == status_filter.upper())
    return [_serialize_mapping(mapping) for mapping in db.scalars(statement).all()]


def detect_source_mappings(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    payload: EiaSourceMappingDetectRequest,
) -> list[dict[str, object]]:
    document = _get_document_with_structure(db, current_user, eia_document_id, DOCUMENT_EDIT_ROLES, "detect mappings")
    source_document, source_version = _get_source_document_version(db, current_user, document, payload)
    detected_sections = _detected_sections_from_payload_or_metadata(payload, source_document, source_version)
    if not detected_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No detected sections were provided. Populate document metadata with detected_sections "
                "or pass detected_sections in the request body."
            ),
        )

    created: list[EiaSourceMapping] = []
    for detected_section in detected_sections:
        candidate, confidence = _best_subsection_match(document, detected_section)
        detected_content = detected_section.content.strip() if detected_section.content else None
        mapping = EiaSourceMapping(
            tenant_id=current_user.tenant_id,
            eia_document_id=document.id,
            source_document_id=source_document.id,
            source_version_id=source_version.id if source_version else None,
            subsection_id=candidate.id if candidate else None,
            detected_section_number=detected_section.section_number,
            detected_title=detected_section.title,
            detected_content=detected_content,
            suggested_content_html=_content_to_html(detected_content),
            confidence_score=confidence,
            status=MAPPING_STATUS_SUGGESTED if candidate else MAPPING_STATUS_NEEDS_REVIEW,
            detection_method=payload.detection_method,
            assistant_notes=_assistant_notes(candidate, confidence),
            mapping_metadata={
                "source": "user_confirmed_assistant_suggestion",
                "input_confidence": detected_section.confidence,
                "detected_metadata": detected_section.metadata,
            },
        )
        db.add(mapping)
        created.append(mapping)

    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.source_mapping.detected",
        entity_type="eia_document",
        entity_id=document.id,
        summary=f"{len(created)} source mapping suggestions created",
        metadata={
            "source_document_id": str(source_document.id),
            "source_version_id": str(source_version.id) if source_version else None,
            "mapping_ids": [str(mapping.id) for mapping in created],
        },
    )
    db.commit()
    return list_source_mappings(db, current_user, document.id)


def confirm_source_mapping(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    mapping_id: UUID,
    payload: EiaSourceMappingConfirmRequest,
) -> dict[str, object]:
    mapping = _get_mapping(db, current_user, eia_document_id, mapping_id, DOCUMENT_EDIT_ROLES, "confirm mappings")
    if mapping.subsection is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mapping must target a subsection before it can be confirmed",
        )

    mapping.confirmed_by_id = current_user.id
    mapping.confirmed_at = datetime.now(UTC)
    mapping.status = MAPPING_STATUS_CONFIRMED

    if payload.apply_content:
        if not mapping.suggested_content_html:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mapping has no suggested content to apply",
            )
        mapping.subsection.content_html = mapping.suggested_content_html
        mapping.subsection.content = mapping.suggested_content_html
        mapping.subsection.content_json = None
        if payload.completion_status:
            mapping.subsection.completion_status = payload.completion_status
        elif mapping.subsection.completion_status == "NOT_STARTED":
            mapping.subsection.completion_status = "IN_PROGRESS"
        if payload.progress_percentage is not None:
            mapping.subsection.progress_percentage = payload.progress_percentage
        else:
            mapping.subsection.progress_percentage = max(mapping.subsection.progress_percentage, 50.0)
        mapping.subsection.last_edited_by_id = current_user.id
        mapping.subsection.last_edited_at = datetime.now(UTC)
        create_subsection_revision(
            db,
            current_user,
            mapping.subsection,
            source_type="source_mapping_apply",
            source_mapping_id=mapping.id,
            change_summary=f"Applied mapped content from {mapping.source_document.original_filename}",
            metadata={"source_document_id": str(mapping.source_document_id)},
        )
        mapping.status = MAPPING_STATUS_APPLIED

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.source_mapping.confirmed",
        entity_type="eia_source_mapping",
        entity_id=mapping.id,
        summary="Source mapping confirmed" + (" and applied" if payload.apply_content else ""),
        metadata={
            "eia_document_id": str(mapping.eia_document_id),
            "subsection_id": str(mapping.subsection_id) if mapping.subsection_id else None,
            "applied": payload.apply_content,
        },
    )
    db.commit()
    return _serialize_mapping(_reload_mapping(db, mapping.id))


def reject_source_mapping(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    mapping_id: UUID,
    payload: EiaSourceMappingRejectRequest,
) -> dict[str, object]:
    mapping = _get_mapping(db, current_user, eia_document_id, mapping_id, DOCUMENT_EDIT_ROLES, "reject mappings")
    mapping.status = MAPPING_STATUS_REJECTED
    mapping.confirmed_by_id = current_user.id
    mapping.confirmed_at = datetime.now(UTC)
    mapping.mapping_metadata = {
        **(mapping.mapping_metadata or {}),
        "rejection_reason": payload.reason,
    }
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.source_mapping.rejected",
        entity_type="eia_source_mapping",
        entity_id=mapping.id,
        summary="Source mapping rejected",
        metadata={"eia_document_id": str(mapping.eia_document_id), "reason": payload.reason},
    )
    db.commit()
    return _serialize_mapping(_reload_mapping(db, mapping.id))


def _get_document_with_mappings(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    allowed_roles: set[str],
    action: str,
) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(selectinload(EiaDocument.members))
        .where(EiaDocument.id == eia_document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, allowed_roles, action)
    return document


def _get_document_with_structure(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    allowed_roles: set[str],
    action: str,
) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.members),
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
        )
        .where(EiaDocument.id == eia_document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, allowed_roles, action)
    return document


def _get_mapping(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    mapping_id: UUID,
    allowed_roles: set[str],
    action: str,
) -> EiaSourceMapping:
    document = _get_document_with_mappings(db, current_user, eia_document_id, allowed_roles, action)
    mapping = db.scalar(
        select(EiaSourceMapping)
        .options(
            selectinload(EiaSourceMapping.subsection),
            selectinload(EiaSourceMapping.source_document),
            selectinload(EiaSourceMapping.source_version),
            selectinload(EiaSourceMapping.confirmed_by),
        )
        .where(
            EiaSourceMapping.id == mapping_id,
            EiaSourceMapping.tenant_id == current_user.tenant_id,
            EiaSourceMapping.eia_document_id == document.id,
        )
    )
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source mapping not found")
    return mapping


def _get_source_document_version(
    db: Session,
    current_user: User,
    eia_document: EiaDocument,
    payload: EiaSourceMappingDetectRequest,
) -> tuple[Document, DocumentVersion | None]:
    source_document = db.get(Document, payload.source_document_id)
    if (
        source_document is None
        or source_document.tenant_id != current_user.tenant_id
        or source_document.project_id != eia_document.project_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document not found")

    source_version_id = payload.source_version_id or source_document.current_version_id
    if source_version_id is None:
        return source_document, None
    source_version = db.get(DocumentVersion, source_version_id)
    if (
        source_version is None
        or source_version.tenant_id != current_user.tenant_id
        or source_version.document_id != source_document.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document version not found")
    return source_document, source_version


def _detected_sections_from_payload_or_metadata(
    payload: EiaSourceMappingDetectRequest,
    source_document: Document,
    source_version: DocumentVersion | None,
) -> list[EiaSourceDetectedSection]:
    if payload.detected_sections:
        return payload.detected_sections

    metadata_sections = None
    if source_version and isinstance(source_version.version_metadata, dict):
        metadata_sections = source_version.version_metadata.get("detected_sections")
    if metadata_sections is None and isinstance(source_document.document_metadata, dict):
        metadata_sections = source_document.document_metadata.get("detected_sections")
    if not isinstance(metadata_sections, list):
        return []

    detected_sections: list[EiaSourceDetectedSection] = []
    for section in metadata_sections:
        if not isinstance(section, dict):
            continue
        title = section.get("title")
        if not isinstance(title, str) or not title.strip():
            continue
        detected_sections.append(
            EiaSourceDetectedSection(
                section_number=(
                    section.get("section_number")
                    if isinstance(section.get("section_number"), str)
                    else None
                ),
                title=title,
                content=section.get("content") if isinstance(section.get("content"), str) else None,
                confidence=section.get("confidence") if isinstance(section.get("confidence"), (int, float)) else None,
                metadata=section.get("metadata") if isinstance(section.get("metadata"), dict) else {},
            )
        )
    return detected_sections


def _best_subsection_match(
    document: EiaDocument,
    detected_section: EiaSourceDetectedSection,
) -> tuple[EiaSubSection | None, float]:
    subsections = [subsection for section in document.sections for subsection in section.subsections]
    if detected_section.section_number:
        normalized_number = detected_section.section_number.strip()
        exact = next(
            (subsection for subsection in subsections if subsection.subsection_number == normalized_number),
            None,
        )
        if exact:
            return exact, max(detected_section.confidence or 0.0, 0.95)

        top_level = normalized_number.split(".")[0]
        section_match = next(
            (
                section
                for section in document.sections
                if section.section_number == top_level and section.subsections
            ),
            None,
        )
        if section_match:
            return section_match.subsections[0], max(detected_section.confidence or 0.0, 0.72)

    title = _normalize_text(detected_section.title)
    best_subsection: EiaSubSection | None = None
    best_score = 0.0
    for subsection in subsections:
        score = SequenceMatcher(None, title, _normalize_text(subsection.title)).ratio()
        if score > best_score:
            best_score = score
            best_subsection = subsection

    if best_subsection is None or best_score < 0.35:
        return None, 0.0
    input_confidence = detected_section.confidence if detected_section.confidence is not None else 0.75
    return best_subsection, round(min(0.94, best_score * input_confidence), 2)


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _content_to_html(content: str | None) -> str | None:
    if not content:
        return None
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", content) if paragraph.strip()]
    if not paragraphs:
        return None
    return "".join(f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs)


def _assistant_notes(candidate: EiaSubSection | None, confidence: float) -> str:
    if candidate is None:
        return "No confident subsection match was found. Manual review is required."
    if confidence >= 0.9:
        return "High-confidence match based on exact checklist section numbering."
    if confidence >= 0.7:
        return "Suggested match based on checklist section family or title similarity."
    return "Low-confidence match. Confirm before using this content."


def _reload_mapping(db: Session, mapping_id: UUID) -> EiaSourceMapping:
    mapping = db.scalar(
        select(EiaSourceMapping)
        .options(
            selectinload(EiaSourceMapping.subsection),
            selectinload(EiaSourceMapping.source_document),
            selectinload(EiaSourceMapping.source_version),
            selectinload(EiaSourceMapping.confirmed_by),
        )
        .where(EiaSourceMapping.id == mapping_id)
    )
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source mapping not found")
    return mapping


def _serialize_mapping(mapping: EiaSourceMapping) -> dict[str, object]:
    return {
        "id": mapping.id,
        "tenant_id": mapping.tenant_id,
        "eia_document_id": mapping.eia_document_id,
        "source_document_id": mapping.source_document_id,
        "source_version_id": mapping.source_version_id,
        "subsection_id": mapping.subsection_id,
        "detected_section_number": mapping.detected_section_number,
        "detected_title": mapping.detected_title,
        "detected_content": mapping.detected_content,
        "suggested_content_html": mapping.suggested_content_html,
        "confidence_score": mapping.confidence_score,
        "status": mapping.status,
        "detection_method": mapping.detection_method,
        "assistant_notes": mapping.assistant_notes,
        "confirmed_by_id": mapping.confirmed_by_id,
        "confirmed_at": mapping.confirmed_at,
        "mapping_metadata": mapping.mapping_metadata,
        "subsection_number": mapping.subsection.subsection_number if mapping.subsection else None,
        "subsection_title": mapping.subsection.title if mapping.subsection else None,
        "source_document_filename": mapping.source_document.original_filename,
        "source_version_number": mapping.source_version.version_number if mapping.source_version else None,
        "created_at": mapping.created_at,
        "updated_at": mapping.updated_at,
    }
