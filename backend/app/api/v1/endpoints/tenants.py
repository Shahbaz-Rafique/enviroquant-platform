from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permissions
from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantRead


router = APIRouter()


@router.get(
    "/me",
    response_model=TenantRead,
    dependencies=[Depends(require_permission(Permissions.TENANT_READ))],
)
def read_current_tenant(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tenant:
    return db.get(Tenant, current_user.tenant_id)
