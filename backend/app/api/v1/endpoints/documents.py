from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission, require_role_in_tenant
from app.core.permissions import DOCUMENT_UPLOAD_ROLES, Permissions
from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentChunkRead, DocumentRead
from app.services.document_service import (
    add_document_version,
    create_project_document,
    get_document_for_tenant,
    list_document_version_chunks,
    list_project_documents,
    list_tenant_documents,
)
from app.services.project_service import get_project_for_tenant


router = APIRouter()


@router.get("", response_model=list[DocumentRead])
def read_tenant_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.DOCUMENT_READ)),
) -> list[Document]:
    return list_tenant_documents(db, current_user)


@router.get("/project/{project_id}", response_model=list[DocumentRead])
def read_project_documents(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.DOCUMENT_READ)),
) -> list[Document]:
    project = get_project_for_tenant(db, current_user, project_id)
    return list_project_documents(db, current_user, project.id)


@router.post(
    "/project/{project_id}",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_project_document(
    project_id: UUID,
    file: UploadFile = File(...),
    document_type: str = Form("eia_report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(DOCUMENT_UPLOAD_ROLES)),
) -> Document:
    project = get_project_for_tenant(db, current_user, project_id)
    return await create_project_document(db, current_user, project, file, document_type)


@router.get("/{document_id}", response_model=DocumentRead)
def read_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.DOCUMENT_READ)),
) -> Document:
    return get_document_for_tenant(db, current_user, document_id)


@router.post("/{document_id}/versions", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document_version(
    document_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(DOCUMENT_UPLOAD_ROLES)),
) -> Document:
    document = get_document_for_tenant(db, current_user, document_id)
    return await add_document_version(db, current_user, document, file)


@router.get("/{document_id}/versions/{version_id}/chunks", response_model=list[DocumentChunkRead])
def read_document_version_chunks(
    document_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.DOCUMENT_READ)),
) -> list[object]:
    return list_document_version_chunks(db, current_user, document_id, version_id)
