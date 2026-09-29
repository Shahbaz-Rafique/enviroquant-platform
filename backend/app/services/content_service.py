import re
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.checklist_mapping import ChecklistMapping
from app.models.document import Document, DocumentVersion
from app.models.eia import EiaAttachment, EiaDocument, EiaSubSection
from app.models.user import User
from app.schemas.eia import EiaSubSectionContentUpdate, EiaSourceDocumentAttachmentCreate
from app.services.audit_service import record_audit_event
from app.services.eia_service import (
    DOCUMENT_EDIT_ROLES,
    DOCUMENT_READ_ROLES,
    assert_subsection_content_editable,
    assert_subsection_version,
    assert_workflow_status_unchanged,
    require_assigned_subsection_author,
    require_subsection_permission,
)
from app.services.revision_service import create_subsection_revision
from app.utils.storage import store_subsection_attachment


HTML_TAG_RE = re.compile(r"<[^>]+>")


def get_subsection_workspace(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    tenant_id: UUID | None = None,
) -> dict[str, object]:
    subsection = _get_subsection_for_tenant(db, current_user, subsection_id, tenant_id)
    require_subsection_permission(subsection, current_user, DOCUMENT_READ_ROLES, "view")
    attachments = sorted(subsection.attachments, key=lambda item: item.created_at, reverse=True)

    return {
        "subsection": subsection,
        "project_id": subsection.document.project_id,
        "eia_document_id": subsection.eia_document_id,
        "eia_document_title": subsection.document.title,
        "section_number": subsection.section.section_number,
        "section_title": subsection.section.title,
        "attachments": attachments,
        "checklist_items": _build_checklist_items(db, subsection),
    }


def save_subsection_content(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    payload: EiaSubSectionContentUpdate,
) -> dict[str, object]:
    subsection = _get_subsection_for_tenant(
        db,
        current_user,
        subsection_id,
        payload.tenant_id,
        lock_for_update=True,
    )
    require_subsection_permission(subsection, current_user, DOCUMENT_EDIT_ROLES, "edit")
    require_assigned_subsection_author(subsection, current_user)
    assert_subsection_version(subsection, payload.expected_updated_at)
    has_content = payload.content_html is not None or payload.content_json is not None
    auto_start = (
        has_content
        and subsection.completion_status in ("NOT_STARTED", "ASSIGNED")
        and payload.completion_status in (None, "IN_PROGRESS")
    )
    if auto_start:
        subsection.completion_status = "IN_PROGRESS"
    else:
        assert_workflow_status_unchanged(subsection, payload.completion_status)
        if has_content:
            assert_subsection_content_editable(subsection, current_user)

    if payload.content_html is not None:
        subsection.content_html = payload.content_html
        subsection.content = payload.content_html

    if payload.content_json is not None:
        subsection.content_json = payload.content_json

    if payload.progress_percentage is not None:
        subsection.progress_percentage = payload.progress_percentage
    else:
        _update_progress_from_content(subsection)

    if subsection.completion_status in {"APPROVED", "COMPLETE"}:
        subsection.progress_percentage = 100.0

    subsection.last_edited_by_id = current_user.id
    subsection.last_edited_at = datetime.now(UTC)
    create_subsection_revision(
        db,
        current_user,
        subsection,
        source_type="manual_save",
        change_summary=payload.change_summary or "Draft saved",
    )
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.content_saved",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=f"Subsection {subsection.subsection_number} content saved",
        metadata={"eia_document_id": str(subsection.eia_document_id)},
    )

    db.commit()
    return get_subsection_workspace(db, current_user, subsection_id, payload.tenant_id)


async def upload_subsection_attachment(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    file: UploadFile,
    tenant_id: UUID | None = None,
    attachment_type: str = "supporting_evidence",
    checklist_reference: str | None = None,
) -> EiaAttachment:
    subsection = _get_subsection_for_tenant(db, current_user, subsection_id, tenant_id)
    require_subsection_permission(subsection, current_user, DOCUMENT_EDIT_ROLES, "upload attachments to")
    require_assigned_subsection_author(subsection, current_user)
    assert_subsection_content_editable(subsection)
    stored_file = await store_subsection_attachment(
        file=file,
        organization_id=current_user.tenant_id,
        project_id=subsection.document.project_id,
        eia_document_id=subsection.eia_document_id,
        subsection_id=subsection.id,
    )

    attachment = EiaAttachment(
        tenant_id=current_user.tenant_id,
        eia_document_id=subsection.eia_document_id,
        section_id=subsection.section_id,
        subsection_id=subsection.id,
        uploaded_by_id=current_user.id,
        original_filename=stored_file.original_filename,
        storage_path=stored_file.storage_url,
        mime_type=file.content_type,
        size_bytes=stored_file.size_bytes,
        checksum_sha256=stored_file.checksum_sha256,
        attachment_type=attachment_type,
        checklist_reference=checklist_reference,
        attachment_metadata={
            "storage_backend": "cloudinary",
            "cloudinary": {
                "asset_id": stored_file.asset_id,
                "public_id": stored_file.public_id,
                "resource_type": stored_file.resource_type,
                "format": stored_file.format,
                "version": stored_file.version,
                "secure_url": stored_file.storage_url,
            },
        },
    )
    db.add(attachment)
    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.attachment.uploaded",
        entity_type="eia_attachment",
        entity_id=attachment.id,
        summary=f"Attachment uploaded to subsection {subsection.subsection_number}",
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "subsection_id": str(subsection.id),
            "filename": attachment.original_filename,
        },
    )
    db.commit()
    db.refresh(attachment)
    return attachment


def link_source_document_attachment(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    payload: EiaSourceDocumentAttachmentCreate,
) -> EiaAttachment:
    subsection = _get_subsection_for_tenant(db, current_user, subsection_id, payload.tenant_id)
    require_subsection_permission(subsection, current_user, DOCUMENT_EDIT_ROLES, "link source documents to")
    require_assigned_subsection_author(subsection, current_user)
    assert_subsection_content_editable(subsection)
    source_document = db.get(Document, payload.source_document_id)
    if (
        source_document is None
        or source_document.tenant_id != current_user.tenant_id
        or source_document.project_id != subsection.document.project_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document not found")

    source_version_id = payload.source_version_id or source_document.current_version_id
    if source_version_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source document does not have a version to link",
        )
    source_version = db.get(DocumentVersion, source_version_id)
    if (
        source_version is None
        or source_version.tenant_id != current_user.tenant_id
        or source_version.document_id != source_document.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document version not found")

    attachment = EiaAttachment(
        tenant_id=current_user.tenant_id,
        eia_document_id=subsection.eia_document_id,
        section_id=subsection.section_id,
        subsection_id=subsection.id,
        uploaded_by_id=current_user.id,
        source_document_id=source_document.id,
        original_filename=source_document.original_filename,
        storage_path=source_version.storage_path,
        mime_type=source_version.mime_type,
        size_bytes=source_version.size_bytes,
        checksum_sha256=source_version.checksum_sha256,
        attachment_type=payload.attachment_type,
        checklist_reference=payload.checklist_reference or subsection.subsection_number,
        attachment_metadata={
            "link_type": "existing_document_version",
            "source_document_id": str(source_document.id),
            "source_version_id": str(source_version.id),
            "source_version_number": source_version.version_number,
            "storage_backend": source_version.version_metadata.get("storage_backend")
            if isinstance(source_version.version_metadata, dict)
            else None,
        },
    )
    db.add(attachment)
    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.attachment.linked",
        entity_type="eia_attachment",
        entity_id=attachment.id,
        summary=f"Source document linked to subsection {subsection.subsection_number}",
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "subsection_id": str(subsection.id),
            "source_document_id": str(source_document.id),
            "source_version_id": str(source_version.id),
        },
    )
    db.commit()
    db.refresh(attachment)
    return attachment


def _get_subsection_for_tenant(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    tenant_id: UUID | None = None,
    *,
    lock_for_update: bool = False,
) -> EiaSubSection:
    _validate_tenant_scope(current_user, tenant_id)
    statement = (
        select(EiaSubSection)
        .options(
            selectinload(EiaSubSection.document).selectinload(EiaDocument.members),
            selectinload(EiaSubSection.section),
            selectinload(EiaSubSection.attachments),
            selectinload(EiaSubSection.checklist_mappings),
        )
        .where(EiaSubSection.id == subsection_id, EiaSubSection.tenant_id == current_user.tenant_id)
    )
    if lock_for_update:
        statement = statement.with_for_update(of=EiaSubSection)
    subsection = db.scalars(statement).unique().one_or_none()
    if subsection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    return subsection


def _validate_tenant_scope(current_user: User, tenant_id: UUID | None) -> None:
    if tenant_id is not None and tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid tenant scope")


def _update_progress_from_content(subsection: EiaSubSection) -> None:
    has_content = _has_content(subsection.content_html or subsection.content)
    if has_content:
        subsection.progress_percentage = max(subsection.progress_percentage, 25.0)


def _has_content(content_html: str | None) -> bool:
    if not content_html:
        return False
    text = HTML_TAG_RE.sub(" ", content_html).replace("&nbsp;", " ").strip()
    return bool(text)


def _build_checklist_items(db: Session, subsection: EiaSubSection) -> list[dict[str, object]]:
    mappings = list(subsection.checklist_mappings)
    if not mappings:
        mappings = list(
            db.scalars(
                select(ChecklistMapping)
                .where(
                    ChecklistMapping.tenant_id == subsection.tenant_id,
                    ChecklistMapping.subsection_id == subsection.id,
                )
                .order_by(ChecklistMapping.checklist_section)
            ).all()
        )
    if not mappings:
        return [_checklist_item_from_subsection(subsection)]
    return [
        {
            "id": subsection.id,
            "mapping_id": mapping.id,
            "subsection_id": subsection.id,
            "subsection_number": subsection.subsection_number,
            "title": subsection.title,
            "checklist_section": mapping.checklist_section,
            "checklist_title": mapping.checklist_title,
            "importance": mapping.importance,
            "completion_status": subsection.completion_status,
            "progress_percentage": subsection.progress_percentage,
            "compliance_status": _compliance_status(subsection),
        }
        for mapping in mappings
    ]


def _checklist_item_from_subsection(subsection: EiaSubSection) -> dict[str, object]:
    return {
        "id": subsection.id,
        "mapping_id": None,
        "subsection_id": subsection.id,
        "subsection_number": subsection.subsection_number,
        "title": subsection.title,
        "checklist_section": subsection.subsection_number,
        "checklist_title": subsection.title,
        "importance": "HIGH",
        "completion_status": subsection.completion_status,
        "progress_percentage": subsection.progress_percentage,
        "compliance_status": _compliance_status(subsection),
    }


def _compliance_status(subsection: EiaSubSection) -> str:
    if subsection.completion_status in {"APPROVED", "COMPLETE"}:
        return "Compliant"
    if subsection.completion_status not in {"NOT_STARTED", "ASSIGNED"} or subsection.progress_percentage > 0:
        return "Partially Compliant"
    return "Missing"
