from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


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
    versions: list[DocumentVersionRead] = []
    created_at: datetime
    updated_at: datetime
