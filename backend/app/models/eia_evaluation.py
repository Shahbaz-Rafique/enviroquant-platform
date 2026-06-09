import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class EiaEvaluationRun(TimestampMixin, Base):
    __tablename__ = "eia_evaluation_runs"

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
    eia_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    source_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(60), nullable=False)
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
    evaluation_scope: Mapped[str] = mapped_column(String(60), default="subsection_content", nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    run_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    document = relationship("EiaDocument", back_populates="evaluation_runs")
    source_document = relationship("Document", foreign_keys=[source_document_id])
    source_version = relationship("DocumentVersion", foreign_keys=[source_version_id])
    created_by = relationship("User")
    findings = relationship(
        "EiaEvaluationFinding",
        back_populates="evaluation_run",
        cascade="all, delete-orphan",
        order_by="EiaEvaluationFinding.created_at.asc()",
    )
    section_summaries = relationship(
        "EiaEvaluationSectionSummary",
        back_populates="evaluation_run",
        cascade="all, delete-orphan",
        order_by="EiaEvaluationSectionSummary.section_number.asc()",
    )
    review_approvals = relationship(
        "EiaReviewApproval",
        back_populates="evaluation_run",
        cascade="all, delete-orphan",
        order_by="EiaReviewApproval.created_at.desc()",
    )


class EiaEvaluationFinding(TimestampMixin, Base):
    __tablename__ = "eia_evaluation_findings"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    evaluation_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_evaluation_runs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    subsection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_subsections.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    checklist_section: Mapped[str] = mapped_column(String(20), nullable=False)
    checklist_title: Mapped[str] = mapped_column(String(500), nullable=False)
    subsection_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subsection_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    adequacy: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    evidence_summary: Mapped[str] = mapped_column(Text, nullable=False)
    ai_analysis: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    missing_elements: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    evidence_references: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    finding_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    evaluation_run = relationship("EiaEvaluationRun", back_populates="findings")
    subsection = relationship("EiaSubSection")
    comments = relationship(
        "EiaEvaluationFindingComment",
        back_populates="finding",
        cascade="all, delete-orphan",
        order_by="EiaEvaluationFindingComment.created_at.asc()",
    )


class EiaEvaluationSectionSummary(TimestampMixin, Base):
    __tablename__ = "eia_evaluation_section_summaries"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    evaluation_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_evaluation_runs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    section_number: Mapped[str] = mapped_column(String(20), nullable=False)
    section_title: Mapped[str] = mapped_column(String(255), nullable=False)
    findings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    compliant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    partially_compliant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    needs_improvement_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    needs_review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    summary_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    evaluation_run = relationship("EiaEvaluationRun", back_populates="section_summaries")
