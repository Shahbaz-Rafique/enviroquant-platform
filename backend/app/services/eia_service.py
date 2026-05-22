from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Roles
from app.models.eia_document_member import EiaDocumentMember
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.user import User
from app.schemas.eia import EiaDocumentCreate, EiaDocumentProgressRead, EiaSectionProgressRead, EiaSubSectionUpdate
from app.seeds.eia_checklist_seed import seed_eia_structure
from app.services.audit_service import record_audit_event
from app.services.project_service import get_project_for_tenant


DOCUMENT_ROLE_EDITOR = "EDITOR"
DOCUMENT_ROLE_COMMENTER = "COMMENTER"
DOCUMENT_ROLE_VIEWER = "VIEWER"
DOCUMENT_ROLE_REVIEWER = "REVIEWER"
DOCUMENT_ROLES = {
    DOCUMENT_ROLE_EDITOR,
    DOCUMENT_ROLE_COMMENTER,
    DOCUMENT_ROLE_VIEWER,
    DOCUMENT_ROLE_REVIEWER,
}
DOCUMENT_READ_ROLES = DOCUMENT_ROLES
DOCUMENT_COMMENT_ROLES = DOCUMENT_ROLES
DOCUMENT_EDIT_ROLES = {DOCUMENT_ROLE_EDITOR}
DOCUMENT_REVIEW_ROLES = {DOCUMENT_ROLE_EDITOR, DOCUMENT_ROLE_REVIEWER}
DOCUMENT_MEMBER_MANAGE_ROLES = {DOCUMENT_ROLE_EDITOR}


def list_project_eia_documents(db: Session, current_user: User, project_id: UUID) -> list[EiaDocument]:
    project = get_project_for_tenant(db, current_user, project_id)
    statement = (
        select(EiaDocument)
        .outerjoin(
            EiaDocumentMember,
            and_(
                EiaDocumentMember.eia_document_id == EiaDocument.id,
                EiaDocumentMember.tenant_id == current_user.tenant_id,
                EiaDocumentMember.user_id == current_user.id,
            ),
        )
        .where(EiaDocument.tenant_id == current_user.tenant_id, EiaDocument.project_id == project.id)
        .order_by(EiaDocument.updated_at.desc())
    )
    if not is_eia_document_admin(current_user):
        statement = statement.where(
            or_(
                EiaDocument.created_by_id == current_user.id,
                EiaDocumentMember.id.is_not(None),
            )
        )
    return list(db.scalars(statement).all())


def create_eia_document(
    db: Session,
    current_user: User,
    project_id: UUID,
    payload: EiaDocumentCreate,
) -> EiaDocument:
    project = get_project_for_tenant(db, current_user, project_id)
    title = payload.title or f"{project.name} EIA Document"
    document = EiaDocument(
        tenant_id=current_user.tenant_id,
        project_id=project.id,
        title=title,
        created_by_id=current_user.id,
        document_metadata=payload.metadata,
    )
    db.add(document)
    db.flush()
    seed_eia_structure(db, document)
    db.add(
        EiaDocumentMember(
            tenant_id=current_user.tenant_id,
            eia_document_id=document.id,
            user_id=current_user.id,
            role=DOCUMENT_ROLE_EDITOR,
        )
    )
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.document.created",
        entity_type="eia_document",
        entity_id=document.id,
        summary=f"EIA document created for project {project.name}",
        metadata={"project_id": str(project.id)},
    )
    db.commit()
    return get_eia_document_structure(db, current_user, document.id)


def get_eia_document_structure(db: Session, current_user: User, document_id: UUID) -> EiaDocument:
    statement = (
        select(EiaDocument)
        .options(selectinload(EiaDocument.sections).selectinload(EiaSection.subsections))
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    document = db.scalars(statement).unique().one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, DOCUMENT_READ_ROLES, "view")
    return document


def get_eia_document_for_tenant(
    db: Session,
    current_user: User,
    document_id: UUID,
    allowed_roles: set[str] | None = None,
    action: str = "view",
) -> EiaDocument:
    document = db.get(EiaDocument, document_id)
    if document is None or document.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, allowed_roles or DOCUMENT_READ_ROLES, action)
    return document


def get_subsection_for_document(
    db: Session,
    current_user: User,
    document_id: UUID,
    subsection_id: UUID,
) -> EiaSubSection: 
    get_eia_document_for_tenant(db, current_user, document_id)
    subsection = db.get(EiaSubSection, subsection_id)
    if (
        subsection is None
        or subsection.tenant_id != current_user.tenant_id
        or subsection.eia_document_id != document_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    return subsection


def update_eia_subsection(
    db: Session,
    current_user: User,
    document_id: UUID,
    subsection_id: UUID,
    payload: EiaSubSectionUpdate,
) -> EiaSubSection:
    subsection = get_subsection_for_document(db, current_user, document_id, subsection_id)
    require_eia_document_permission(subsection.document, current_user, DOCUMENT_EDIT_ROLES, "edit")
    update_data = payload.model_dump(exclude_unset=True)

    if "metadata" in update_data:
        subsection.content_metadata = update_data.pop("metadata") or {}

    for field, value in update_data.items():
        if value is not None:
            setattr(subsection, field, value)

    if "content" in update_data and update_data["content"] is not None:
        subsection.content_html = update_data["content"]
        subsection.last_edited_by_id = current_user.id
        subsection.last_edited_at = datetime.now(UTC)

    if subsection.content and subsection.completion_status == "NOT_STARTED":
        subsection.completion_status = "IN_PROGRESS"
        subsection.progress_percentage = max(subsection.progress_percentage, 25.0)

    from app.services.revision_service import create_subsection_revision

    create_subsection_revision(
        db,
        current_user,
        subsection,
        source_type="manual_patch",
        change_summary="Subsection draft updated",
    )
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.updated",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=f"Subsection {subsection.subsection_number} updated",
        metadata={"eia_document_id": str(document_id)},
    )
    db.commit()
    db.refresh(subsection)
    return subsection


def get_eia_document_progress(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> EiaDocumentProgressRead:
    document = get_eia_document_structure(db, current_user, document_id)
    sections = [_section_progress(section) for section in document.sections]
    total_subsections = sum(section.total_subsections for section in sections)
    completed_subsections = sum(section.completed_subsections for section in sections)
    in_progress_subsections = sum(section.in_progress_subsections for section in sections)
    progress_percentage = (
        round(
            sum(section.progress_percentage * section.total_subsections for section in sections)
            / total_subsections,
            2,
        )
        if total_subsections
        else 0.0
    )
    return EiaDocumentProgressRead(
        eia_document_id=document.id,
        total_subsections=total_subsections,
        completed_subsections=completed_subsections,
        in_progress_subsections=in_progress_subsections,
        progress_percentage=progress_percentage,
        sections=sections,
    )


def require_eia_document_permission(
    document: EiaDocument,
    current_user: User,
    allowed_roles: set[str],
    action: str,
) -> None:
    if document.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid tenant scope")
    if is_eia_document_admin(current_user) or document.created_by_id == current_user.id:
        return

    member_role = get_document_member_role(document, current_user)
    if member_role in allowed_roles:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"EIA document {action} permission required",
    )


def require_subsection_permission(
    subsection: EiaSubSection,
    current_user: User,
    allowed_roles: set[str],
    action: str,
) -> None:
    if subsection.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid tenant scope")
    require_eia_document_permission(subsection.document, current_user, allowed_roles, action)


def get_document_member_role(document: EiaDocument, current_user: User) -> str | None:
    for member in document.members:
        if member.user_id == current_user.id:
            return member.role.upper()
    return None


def normalize_document_role(role: str) -> str:
    normalized = role.upper()
    if normalized not in DOCUMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be EDITOR, COMMENTER, VIEWER, or REVIEWER",
        )
    return normalized


def is_eia_document_admin(current_user: User) -> bool:
    admin_roles = {Roles.OWNER, Roles.ADMIN}
    return any(role.lower() in admin_roles for role in current_user.role_names)


def _section_progress(section: EiaSection) -> EiaSectionProgressRead:
    subsections = list(section.subsections)
    total_subsections = len(subsections)
    completed_subsections = sum(
        1 for subsection in subsections if subsection.completion_status == "COMPLETE"
    )
    in_progress_subsections = sum(
        1
        for subsection in subsections
        if subsection.completion_status in {"IN_PROGRESS", "READY_FOR_REVIEW"}
        or subsection.progress_percentage > 0
    )
    progress_percentage = (
        round(sum(subsection.progress_percentage for subsection in subsections) / total_subsections, 2)
        if total_subsections
        else 0.0
    )
    return EiaSectionProgressRead(
        section_id=section.id,
        section_number=section.section_number,
        title=section.title,
        total_subsections=total_subsections,
        completed_subsections=completed_subsections,
        in_progress_subsections=in_progress_subsections,
        progress_percentage=progress_percentage,
    )
