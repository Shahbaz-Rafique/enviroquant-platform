from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


class TenantRead(ORMModel):
    id: UUID
    name: str
    slug: str
    status: str
    created_at: datetime
    updated_at: datetime
