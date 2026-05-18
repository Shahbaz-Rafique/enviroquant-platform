from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk


class Tenant(TimestampMixin, Base):
    __tablename__ = "tenants"

    id = uuid_pk()
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="tenant", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="tenant", cascade="all, delete-orphan")
