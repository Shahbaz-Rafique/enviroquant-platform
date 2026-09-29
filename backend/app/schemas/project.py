from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=4000)
    sector: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    metadata: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=4000)
    sector: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    status: str | None = Field(default=None, max_length=40)
    metadata: dict | None = None


class ProjectRead(ORMModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    sector: str | None
    country: str | None
    location: str | None
    latitude: float | None
    longitude: float | None
    status: str
    project_metadata: dict
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
