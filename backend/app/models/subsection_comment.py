import uuid

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class SubSectionComment(TimestampMixin, Base):
    __tablename__ = "subsection_comments"

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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    parent_comment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subsection_comments.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User")
    tenant = relationship("Tenant")
    subsection = relationship("EiaSubSection", back_populates="comments")
    parent = relationship("SubSectionComment", remote_side=[id], back_populates="replies")
    replies = relationship(
        "SubSectionComment",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="SubSectionComment.created_at",
    )
