from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission, require_role_in_tenant
from app.core.permissions import DOCUMENT_UPLOAD_ROLES, PROJECT_MANAGE_ROLES, READ_ONLY_ROLES, Permissions
from app.db.session import get_db
from app.models.document import Document
from app.models.project import Project
from app.models.user import User
from app.schemas.document import DocumentRead
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.document_service import create_project_document, list_project_documents
from app.services.project_service import (
    create_project,
    delete_project,
    get_project_for_tenant,
    list_projects,
    update_project,
)


router = APIRouter()


@router.get("", response_model=list[ProjectRead])
def read_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[Project]:
    return list_projects(db, current_user)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_new_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> Project:
    return create_project(db, current_user, payload)


@router.get("/{project_id}", response_model=ProjectRead)
def read_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> Project:
    return get_project_for_tenant(db, current_user, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def patch_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> Project:
    project = get_project_for_tenant(db, current_user, project_id)
    return update_project(db, project, payload)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> None:
    project = get_project_for_tenant(db, current_user, project_id)
    delete_project(db, project)


@router.get("/{project_id}/documents", response_model=list[DocumentRead])
def read_project_documents_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[Document]:
    project = get_project_for_tenant(db, current_user, project_id)
    return list_project_documents(db, current_user, project.id)


@router.post(
    "/{project_id}/documents/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_project_document_alias(
    project_id: UUID,
    file: UploadFile = File(...),
    document_type: str = Form("eia_report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(DOCUMENT_UPLOAD_ROLES)),
) -> Document:
    project = get_project_for_tenant(db, current_user, project_id)
    return await create_project_document(db, current_user, project, file, document_type)
