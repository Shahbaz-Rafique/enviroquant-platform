from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=10, max_length=128)
    role: str = Field(default="CONSULTANT", max_length=50)


class UserRead(ORMModel):
    id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    status: str
    role: str = Field(validation_alias="primary_role")
    roles: list[str] = Field(default_factory=list, validation_alias="role_names")
    permissions: list[str] = Field(default_factory=list, validation_alias="permission_keys")
    created_at: datetime
    updated_at: datetime
