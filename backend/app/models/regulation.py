import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class RegulationStandard(TimestampMixin, Base):
    __tablename__ = "regulation_standards"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", "version", name="uq_regulation_standard_tenant_code_version"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(120), nullable=False)
    authority: Mapped[str | None] = mapped_column(String(200), nullable=True)
    version: Mapped[str] = mapped_column(String(60), nullable=False)
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    standard_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    requirements = relationship(
        "RegulationRequirement",
        back_populates="standard",
        cascade="all, delete-orphan",
        order_by="RegulationRequirement.requirement_code",
    )


class RegulationRequirement(TimestampMixin, Base):
    __tablename__ = "regulation_requirements"
    __table_args__ = (
        UniqueConstraint("standard_id", "requirement_code", name="uq_regulation_requirement_code"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False
    )
    standard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_standards.id", ondelete="CASCADE"), index=True, nullable=False
    )
    requirement_code: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    requirement_text: Mapped[str] = mapped_column(Text, nullable=False)
    section_tags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    requirement_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    standard = relationship("RegulationStandard", back_populates="requirements")

