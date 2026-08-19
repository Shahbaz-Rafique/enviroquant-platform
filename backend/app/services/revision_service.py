from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaDocument, EiaSubSection
from app.models.subsection_revision import SubSectionRevision
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.eia_service import (
    DOCUMENT_EDIT_ROLES,
    DOCUMENT_READ_ROLES,
    assert_subsection_content_editable,
    assert_subsection_version,
    require_assigned_subsection_author,
    require_subsection_permission,
)


def create_subsection_revision(
    db: Session,
    current_user: User,
    subsection: EiaSubSection,
    *,
    source_type: str = "manual_save",
    change_summary: str | None = None,
    source_mapping_id: UUID | None = None,
    metadata: dict | None = None,
) -> SubSectionRevision:
    revision_number = _next_revision_number(db, subsection.id)
    revision = SubSectionRevision(
        tenant_id=subsection.tenant_id,
        eia_document_id=subsection.eia_document_id,
        subsection_id=subsection.id,
        revision_number=revision_number,
        created_by_id=current_user.id,
        source_mapping_id=source_mapping_id,
        content=subsection.content or "",
        content_html=subsection.content_html,
        content_json=subsection.content_json,
        completion_status=subsection.completion_status,
        progress_percentage=subsection.progress_percentage,
        source_type=source_type,
        change_summary=change_summary,
        revision_metadata=metadata or {},
    )
    db.add(revision)
    db.flush()
    record_audit_event(
        db,
        tenant_id=subsection.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.revision_created",
        entity_type="subsection_revision",
        entity_id=revision.id,
        summary=f"Revision {revision.revision_number} created for subsection {subsection.subsection_number}",
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "subsection_id": str(subsection.id),
            "source_type": source_type,
        },
    )
    return revision


def list_subsection_revisions(
    db: Session,
    current_user: User,
    subsection_id: UUID,
) -> list[SubSectionRevision]:
    subsection = _get_subsection_for_revision(db, current_user, subsection_id)
    require_subsection_permission(subsection, current_user, DOCUMENT_READ_ROLES, "view revisions")
    return list(
        db.scalars(
            select(SubSectionRevision)
            .where(
                SubSectionRevision.tenant_id == current_user.tenant_id,
                SubSectionRevision.subsection_id == subsection.id,
            )
            .order_by(SubSectionRevision.revision_number.desc())
        ).all()
    )


def restore_subsection_revision(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    revision_id: UUID,
    expected_updated_at: datetime | None,
) -> EiaSubSection:
    subsection = _get_subsection_for_revision(db, current_user, subsection_id, lock_for_update=True)
    require_subsection_permission(subsection, current_user, DOCUMENT_EDIT_ROLES, "restore revisions")
    require_assigned_subsection_author(subsection, current_user)
    assert_subsection_version(subsection, expected_updated_at)
    assert_subsection_content_editable(subsection)
    revision = db.get(SubSectionRevision, revision_id)
    if (
        revision is None
        or revision.tenant_id != current_user.tenant_id
        or revision.subsection_id != subsection.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subsection revision not found")

    subsection.content = revision.content
    subsection.content_html = revision.content_html
    subsection.content_json = revision.content_json
    subsection.progress_percentage = revision.progress_percentage
    subsection.last_edited_by_id = current_user.id
    subsection.last_edited_at = datetime.now(UTC)

    restored = create_subsection_revision(
        db,
        current_user,
        subsection,
        source_type="revision_restore",
        change_summary=f"Restored from revision {revision.revision_number}",
        metadata={"restored_revision_id": str(revision.id)},
    )
    record_audit_event(
        db,
        tenant_id=subsection.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.revision_restored",
        entity_type="subsection",
        entity_id=subsection.id,
        summary=f"Subsection restored from revision {revision.revision_number}",
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "restored_revision_id": str(revision.id),
            "new_revision_id": str(restored.id),
        },
    )
    db.commit()
    db.refresh(subsection)
    return subsection


def _get_subsection_for_revision(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    *,
    lock_for_update: bool = False,
) -> EiaSubSection:
    statement = (
        select(EiaSubSection)
        .options(selectinload(EiaSubSection.document).selectinload(EiaDocument.members))
        .where(EiaSubSection.id == subsection_id, EiaSubSection.tenant_id == current_user.tenant_id)
    )
    if lock_for_update:
        statement = statement.with_for_update(of=EiaSubSection)
    subsection = db.scalar(statement)
    if subsection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    return subsection


def _next_revision_number(db: Session, subsection_id: UUID) -> int:
    max_revision = db.scalar(
        select(func.max(SubSectionRevision.revision_number)).where(
            SubSectionRevision.subsection_id == subsection_id
        )
    )
    return (max_revision or 0) + 1
