import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class EiaSourceMapping(TimestampMixin, Base):
    __tablename__ = "eia_source_mappings"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    eia_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    subsection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_subsections.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    detected_section_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    detected_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detected_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_content_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="SUGGESTED", nullable=False)
    detection_method: Mapped[str] = mapped_column(String(80), default="rule_based", nullable=False)
    assistant_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mapping_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    tenant = relationship("Tenant")
    document = relationship("EiaDocument", back_populates="source_mappings")
    source_document = relationship("Document", foreign_keys=[source_document_id])
    source_version = relationship("DocumentVersion", foreign_keys=[source_version_id])
    subsection = relationship("EiaSubSection", back_populates="source_mappings")
    confirmed_by = relationship("User")
