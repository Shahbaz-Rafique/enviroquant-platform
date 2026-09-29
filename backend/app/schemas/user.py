from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel
from app.schemas.tenant import TenantRead


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=10, max_length=128)
    role: str = Field(default="CONSULTANT", max_length=50)


class UserInvite(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    role: str = Field(default="CONSULTANT", max_length=50)


class UserStatusUpdate(BaseModel):
    status: Literal["active", "inactive"]


class UserRead(ORMModel):
    id: UUID
    tenant_id: UUID
    organization_id: UUID = Field(validation_alias="tenant_id")
    email: str
    full_name: str
    status: str
    role: str = Field(validation_alias="primary_role")
    roles: list[str] = Field(default_factory=list, validation_alias="role_names")
    permissions: list[str] = Field(default_factory=list, validation_alias="permission_keys")
    organization: TenantRead | None = Field(default=None, validation_alias="tenant")
    created_at: datetime
    updated_at: datetime


class UserInvitationRead(ORMModel):
    user: UserRead
    invite_url: str
    expires_at: datetime
    email_sent: bool
