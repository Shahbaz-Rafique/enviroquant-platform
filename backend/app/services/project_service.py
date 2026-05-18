from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


def list_projects(db: Session, current_user: User) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.tenant_id == current_user.tenant_id)
        .order_by(Project.updated_at.desc())
    )
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
    project = db.get(Project, project_id)
    if project is None or project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


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
