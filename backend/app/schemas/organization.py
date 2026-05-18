from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str | None = Field(default=None, min_length=2, max_length=80)


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    status: str | None = Field(default=None, max_length=30)


class OrganizationRead(ORMModel):
    id: UUID
    name: str
    slug: str
    status: str
    created_at: datetime
    updated_at: datetime
