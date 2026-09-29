import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk
from app.models.rbac import user_roles


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    invitation_token_hash: Mapped[str | None] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=True,
    )
    invitation_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant", back_populates="users")
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    created_projects = relationship("Project", back_populates="created_by")
    created_eia_documents = relationship("EiaDocument", back_populates="created_by")
    uploaded_documents = relationship("Document", back_populates="uploaded_by")
    invited_by = relationship("User", remote_side=[id])

    @property
    def role_names(self) -> list[str]:
        return [role.name for role in self.roles]

    @property
    def permission_keys(self) -> list[str]:
        return sorted({permission.key for role in self.roles for permission in role.permissions})

    @property
    def primary_role(self) -> str:
        if not self.roles:
            return "UNASSIGNED"
        priority = ["admin", "project_manager", "consultant", "reviewer", "owner", "regulator", "viewer"]
        role_names = {role.name.lower(): role.name for role in self.roles}
        for role_name in priority:
            if role_name in role_names:
                return role_names[role_name].upper()
        return self.roles[0].name.upper()
