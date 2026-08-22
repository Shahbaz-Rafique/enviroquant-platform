import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk


class ChecklistMapping(Base):
    __tablename__ = "checklist_mappings"
    __table_args__ = (
        UniqueConstraint("subsection_id", "checklist_section", name="uq_checklist_mappings_subsection_section"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    subsection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_subsections.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    checklist_section: Mapped[str] = mapped_column(String(20), nullable=False)
    checklist_title: Mapped[str] = mapped_column(String(500), nullable=False)
    checklist_version: Mapped[str] = mapped_column(String(80), nullable=False)
    regulation_requirement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("regulation_requirements.id", ondelete="SET NULL"),
        nullable=True,
    )
    importance: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)

    tenant = relationship("Tenant")
    subsection = relationship("EiaSubSection", back_populates="checklist_mappings")
    regulation_requirement = relationship("RegulationRequirement")
