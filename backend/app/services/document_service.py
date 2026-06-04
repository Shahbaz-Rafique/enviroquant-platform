from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.models.document import Document, DocumentVersion
from app.models.project import Project
from app.models.user import User
from app.services.document_parsing_service import parse_document_bytes
from app.services.audit_service import record_audit_event
from app.utils.storage import store_document_version_bytes, validate_upload


ALLOWED_DOCUMENT_TYPES = {
    "eia_report",
    "previous_eia",
    "legacy_report",
    "supporting_document",
    "baseline_study",
    "permit",
}


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


def list_document_version_chunks(
    db: Session,
    current_user: User,
    document_id: UUID,
    version_id: UUID,
) -> list[DocumentChunk]:
    document = get_document_for_tenant(db, current_user, document_id)
    version = db.get(DocumentVersion, version_id)
    if version is None or version.tenant_id != current_user.tenant_id or version.document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document version not found")
    statement = (
        select(DocumentChunk)
        .where(
            DocumentChunk.tenant_id == current_user.tenant_id,
            DocumentChunk.document_id == document.id,
            DocumentChunk.document_version_id == version.id,
        )
        .order_by(DocumentChunk.chunk_index.asc())
    )
    return list(db.scalars(statement).all())


async def create_project_document(
    db: Session,
    current_user: User,
    project: Project,
    file: UploadFile,
    document_type: str,
) -> Document:
    validate_upload(file)
    document_type = _normalize_document_type(document_type)
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
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="document.created",
        entity_type="document",
        entity_id=document.id,
        summary=f"Document uploaded: {document.original_filename}",
        metadata={"project_id": str(project.id), "document_type": document.document_type},
    )
    db.commit()
    db.refresh(document)
    return document


def _normalize_document_type(document_type: str) -> str:
    normalized = document_type.strip().lower()
    if normalized not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document type",
        )
    return normalized


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
    version = await _create_version_file(db, current_user, document, file, version_number=version_number)
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="document.version_created",
        entity_type="document_version",
        entity_id=version.id,
        summary=f"Version {version.version_number} uploaded for {document.original_filename}",
        metadata={"document_id": str(document.id), "project_id": str(document.project_id)},
    )
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
    original_filename = file.filename or "document"
    content = await file.read()
    await file.close()
    parsed_document = parse_document_bytes(content, original_filename, file.content_type)
    stored_file = store_document_version_bytes(
        content=content,
        filename=original_filename,
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
        parser_status=parsed_document.parser_status,
        version_metadata={
            "original_filename": stored_file.original_filename,
            "storage_backend": "cloudinary",
            **parsed_document.metadata,
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
    _replace_document_version_chunks(db, version, document, parsed_document.chunks)
    document.current_version_id = version.id
    document.status = "uploaded"
    return version


def _replace_document_version_chunks(
    db: Session,
    version: DocumentVersion,
    document: Document,
    chunks,
) -> None:
    db.query(DocumentChunk).filter(DocumentChunk.document_version_id == version.id).delete()
    for chunk in chunks:
        db.add(
            DocumentChunk(
                tenant_id=version.tenant_id,
                project_id=document.project_id,
                document_id=document.id,
                document_version_id=version.id,
                chunk_index=chunk.chunk_index,
                chunk_key=f"{version.id}:chunk:{chunk.chunk_index}",
                page_number=chunk.page_number,
                section_number=chunk.section_number,
                section_title=chunk.section_title,
                heading_path=chunk.heading_path,
                content=chunk.content,
                content_metadata=chunk.content_metadata,
            )
        )
