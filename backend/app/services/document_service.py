from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentVersion
from app.models.project import Project
from app.models.user import User
from app.utils.storage import store_document_version, validate_upload


def list_project_documents(db: Session, current_user: User, project_id: UUID) -> list[Document]:
    statement = (
        select(Document)
        .where(Document.tenant_id == current_user.tenant_id, Document.project_id == project_id)
        .order_by(Document.updated_at.desc())
    )
    return list(db.scalars(statement).unique().all())


def get_document_for_tenant(db: Session, current_user: User, document_id: UUID) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


async def create_project_document(
    db: Session,
    current_user: User,
    project: Project,
    file: UploadFile,
    document_type: str,
) -> Document:
    validate_upload(file)
    document = Document(
        tenant_id=current_user.tenant_id,
        project_id=project.id,
        uploaded_by_id=current_user.id,
        original_filename=file.filename or "document",
        document_type=document_type,
    )
    db.add(document)
    db.flush()
    await _create_version_file(db, current_user, document, file, version_number=1)
    db.commit()
    db.refresh(document)
    return document


async def add_document_version(
    db: Session,
    current_user: User,
    document: Document,
    file: UploadFile,
) -> Document:
    validate_upload(file)
    max_version = db.scalar(
        select(func.max(DocumentVersion.version_number)).where(DocumentVersion.document_id == document.id)
    )
    version_number = (max_version or 0) + 1
    await _create_version_file(db, current_user, document, file, version_number=version_number)
    db.commit()
    db.refresh(document)
    return document


async def _create_version_file(
    db: Session,
    current_user: User,
    document: Document,
    file: UploadFile,
    version_number: int,
) -> DocumentVersion:
    stored_file = await store_document_version(
        file=file,
        organization_id=current_user.tenant_id,
        project_id=document.project_id,
        document_id=document.id,
        version_number=version_number,
    )

    version = DocumentVersion(
        tenant_id=current_user.tenant_id,
        document_id=document.id,
        uploaded_by_id=current_user.id,
        version_number=version_number,
        storage_path=stored_file.storage_url,
        mime_type=file.content_type,
        size_bytes=stored_file.size_bytes,
        checksum_sha256=stored_file.checksum_sha256,
        parser_status="pending",
        version_metadata={
            "original_filename": stored_file.original_filename,
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
        uploaded_at=datetime.now(UTC),
    )
    db.add(version)
    db.flush()
    document.current_version_id = version.id
    document.status = "uploaded"
    return version
