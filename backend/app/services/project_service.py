from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.permissions import Roles
from app.models.eia import EiaDocument
from app.models.eia_document_member import EiaDocumentMember
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


def list_projects(db: Session, current_user: User) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.tenant_id == current_user.tenant_id)
        .order_by(Project.updated_at.desc())
    )
    if not _can_access_tenant_portfolio(current_user):
        statement = statement.where(_project_access_clause(current_user))
    return list(db.scalars(statement).all())


def create_project(db: Session, current_user: User, payload: ProjectCreate) -> Project:
    project = Project(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        description=payload.description,
        sector=payload.sector,
        country=payload.country,
        location=payload.location,
        project_metadata=payload.metadata,
        created_by_id=current_user.id,
    )
    db.add(project)
    db.flush()
    db.add(
        ProjectMember(
            tenant_id=current_user.tenant_id,
            project_id=project.id,
            user_id=current_user.id,
            role="owner",
        )
    )
    db.commit()
    db.refresh(project)
    return project


def get_project_for_tenant(db: Session, current_user: User, project_id: UUID) -> Project:
    statement = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == current_user.tenant_id,
    )
    if not _can_access_tenant_portfolio(current_user):
        statement = statement.where(_project_access_clause(current_user))
    project = db.scalar(statement)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _can_access_tenant_portfolio(current_user: User) -> bool:
    portfolio_roles = {Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER}
    return not portfolio_roles.isdisjoint(
        {role.lower() for role in current_user.role_names}
    )


def _project_access_clause(current_user: User):
    member_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.tenant_id == current_user.tenant_id,
        ProjectMember.user_id == current_user.id,
    )
    document_project_ids = (
        select(EiaDocument.project_id)
        .join(
            EiaDocumentMember,
            EiaDocumentMember.eia_document_id == EiaDocument.id,
        )
        .where(
            EiaDocument.tenant_id == current_user.tenant_id,
            EiaDocumentMember.tenant_id == current_user.tenant_id,
            EiaDocumentMember.user_id == current_user.id,
        )
    )
    return or_(
        Project.created_by_id == current_user.id,
        Project.id.in_(member_project_ids),
        Project.id.in_(document_project_ids),
    )


def update_project(db: Session, project: Project, payload: ProjectUpdate) -> Project:
    update_data = payload.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        project.project_metadata = update_data.pop("metadata") or {}

    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()
