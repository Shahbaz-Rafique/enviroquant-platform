from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class RegulationRequirementCreate(BaseModel):
    requirement_code: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=400)
    requirement_text: str = Field(min_length=1)
    section_tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class RegulationRequirementRead(ORMModel):
    id: UUID
    tenant_id: UUID
    standard_id: UUID
    requirement_code: str
    title: str
    requirement_text: str
    section_tags: list[str] = Field(default_factory=list)
    requirement_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class RegulationStandardCreate(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=300)
    jurisdiction: str = Field(min_length=1, max_length=120)
    authority: str | None = Field(default=None, max_length=200)
    version: str = Field(min_length=1, max_length=60)
    effective_from: date | None = None
    effective_to: date | None = None
    source_url: str | None = Field(default=None, max_length=1000)
    metadata: dict = Field(default_factory=dict)


class RegulationStandardRead(ORMModel):
    id: UUID
    tenant_id: UUID
    code: str
    title: str
    jurisdiction: str
    authority: str | None
    version: str
    effective_from: date | None
    effective_to: date | None
    source_url: str | None
    is_active: bool
    standard_metadata: dict = Field(default_factory=dict)
    requirements: list[RegulationRequirementRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
