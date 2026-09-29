import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class DocumentChunk(TimestampMixin, Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_version_id", "chunk_index", name="uq_document_chunks_version_index"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_versions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_key: Mapped[str] = mapped_column(String(100), nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    heading_path: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    document = relationship("Document", back_populates="chunks")
    document_version = relationship("DocumentVersion", back_populates="chunks")
