import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class EiaDocument(TimestampMixin, Base):
    __tablename__ = "eia_documents"

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
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    document_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    tenant = relationship("Tenant", back_populates="eia_documents")
    project = relationship("Project", back_populates="eia_documents")
    created_by = relationship("User", back_populates="created_eia_documents")
    sections = relationship(
        "EiaSection",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="EiaSection.display_order",
    )
    subsections = relationship(
        "EiaSubSection",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="EiaSubSection.display_order",
    )
    attachments = relationship(
        "EiaAttachment",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    members = relationship(
        "EiaDocumentMember",
        back_populates="eia_document",
        cascade="all, delete-orphan",
    )
    source_mappings = relationship(
        "EiaSourceMapping",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    subsection_revisions = relationship(
        "SubSectionRevision",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class EiaSection(TimestampMixin, Base):
    __tablename__ = "eia_sections"
    __table_args__ = (
        UniqueConstraint("eia_document_id", "section_number", name="uq_eia_sections_document_number"),
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
    section_number: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    document = relationship("EiaDocument", back_populates="sections")
    subsections = relationship(
        "EiaSubSection",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="EiaSubSection.display_order",
    )
    attachments = relationship("EiaAttachment", back_populates="section")


class EiaSubSection(TimestampMixin, Base):
    __tablename__ = "eia_subsections"
    __table_args__ = (
        UniqueConstraint("section_id", "subsection_number", name="uq_eia_subsections_section_number"),
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
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_sections.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    subsection_number: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    content_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    completion_status: Mapped[str] = mapped_column(String(40), default="NOT_STARTED", nullable=False)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_edited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    content_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    document = relationship("EiaDocument", back_populates="subsections")
    section = relationship("EiaSection", back_populates="subsections")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    last_edited_by = relationship("User", foreign_keys=[last_edited_by_id])
    attachments = relationship(
        "EiaAttachment",
        back_populates="subsection",
        cascade="all, delete-orphan",
    )
    comments = relationship(
        "SubSectionComment",
        back_populates="subsection",
        cascade="all, delete-orphan",
        order_by="SubSectionComment.created_at",
    )
    checklist_mappings = relationship(
        "ChecklistMapping",
        back_populates="subsection",
        cascade="all, delete-orphan",
        order_by="ChecklistMapping.checklist_section",
    )
    source_mappings = relationship("EiaSourceMapping", back_populates="subsection")
    revisions = relationship(
        "SubSectionRevision",
        back_populates="subsection",
        cascade="all, delete-orphan",
        order_by="SubSectionRevision.revision_number.desc()",
    )


class EiaAttachment(TimestampMixin, Base):
    __tablename__ = "eia_attachments"

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
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_sections.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    subsection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_subsections.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(160), nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(80), default="supporting_evidence", nullable=False)
    checklist_reference: Mapped[str | None] = mapped_column(String(40), nullable=True)
    attachment_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    document = relationship("EiaDocument", back_populates="attachments")
    section = relationship("EiaSection", back_populates="attachments")
    subsection = relationship("EiaSubSection", back_populates="attachments")
    uploaded_by = relationship("User")
    source_document = relationship("Document")
