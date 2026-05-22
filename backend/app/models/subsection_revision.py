import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class SubSectionRevision(TimestampMixin, Base):
    __tablename__ = "subsection_revisions"
    __table_args__ = (
        UniqueConstraint("subsection_id", "revision_number", name="uq_subsection_revisions_number"),
    )

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
    subsection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_subsections.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_mapping_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_source_mappings.id", ondelete="SET NULL"),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    content_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    completion_status: Mapped[str] = mapped_column(String(40), nullable=False)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    source_type: Mapped[str] = mapped_column(String(60), default="manual_save", nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    tenant = relationship("Tenant")
    document = relationship("EiaDocument", back_populates="subsection_revisions")
    subsection = relationship("EiaSubSection", back_populates="revisions")
    created_by = relationship("User")
    source_mapping = relationship("EiaSourceMapping")
