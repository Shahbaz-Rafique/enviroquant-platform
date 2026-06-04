import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class EiaEvaluationFindingComment(TimestampMixin, Base):
    __tablename__ = "eia_evaluation_finding_comments"

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
    finding_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("eia_evaluation_findings.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    finding = relationship("EiaEvaluationFinding", back_populates="comments")
    evaluation_run = relationship("EiaEvaluationRun")
    user = relationship("User")
