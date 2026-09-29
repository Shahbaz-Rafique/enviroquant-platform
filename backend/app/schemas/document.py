from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


class DocumentUserSummaryRead(ORMModel):
    id: UUID
    email: str
    full_name: str
    status: str


class DocumentProjectSummaryRead(ORMModel):
    id: UUID
    name: str
    status: str


class DocumentVersionRead(ORMModel):
    id: UUID
    tenant_id: UUID
    document_id: UUID
    uploaded_by_id: UUID
    version_number: int
    storage_path: str
    mime_type: str | None
    size_bytes: int
    checksum_sha256: str
    parser_status: str
    version_metadata: dict
    uploaded_at: datetime | None
    uploaded_by: DocumentUserSummaryRead | None = None
    created_at: datetime
    updated_at: datetime


class DocumentChunkRead(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    document_id: UUID
    document_version_id: UUID
    chunk_index: int
    chunk_key: str
    page_number: int | None
    section_number: str | None
    section_title: str | None
    heading_path: list
    content: str
    content_metadata: dict
    created_at: datetime
    updated_at: datetime


class DocumentRead(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    uploaded_by_id: UUID
    current_version_id: UUID | None
    original_filename: str
    document_type: str
    status: str
    document_metadata: dict
    project: DocumentProjectSummaryRead | None = None
    uploaded_by: DocumentUserSummaryRead | None = None
    versions: list[DocumentVersionRead] = []
    created_at: datetime
    updated_at: datetime
