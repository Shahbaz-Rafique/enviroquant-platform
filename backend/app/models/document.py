import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class Document(TimestampMixin, Base):
    __tablename__ = "documents"

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
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_versions.id", use_alter=True, name="fk_documents_current_version"),
        nullable=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), default="eia_report", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="uploaded", nullable=False)
    document_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    project = relationship("Project", back_populates="documents")
    uploaded_by = relationship("User", back_populates="uploaded_documents")
    versions = relationship(
        "DocumentVersion",
        back_populates="document",
        cascade="all, delete-orphan",
        foreign_keys="DocumentVersion.document_id",
        order_by="DocumentVersion.version_number.desc()",
    )
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index.asc()",
    )
    current_version = relationship(
        "DocumentVersion",
        foreign_keys=[current_version_id],
        post_update=True,
    )


class DocumentVersion(TimestampMixin, Base):
    __tablename__ = "document_versions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_versions_document_number"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(160), nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    parser_status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)
    version_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(nullable=True)

    document = relationship("Document", back_populates="versions", foreign_keys=[document_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    chunks = relationship(
        "DocumentChunk",
        back_populates="document_version",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index.asc()",
    )
