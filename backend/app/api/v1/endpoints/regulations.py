from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role_in_tenant
from app.core.permissions import PROJECT_MANAGE_ROLES, READ_ONLY_ROLES
from app.db.session import get_db
from app.models.regulation import RegulationRequirement, RegulationStandard
from app.models.user import User
from app.schemas.regulation import (
    RegulationRequirementCreate,
    RegulationRequirementRead,
    RegulationStandardCreate,
    RegulationStandardRead,
)
from app.services.regulation_service import (
    add_regulation_requirement,
    create_regulation_standard,
    list_regulation_standards,
)


router = APIRouter()


@router.get("", response_model=list[RegulationStandardRead])
def read_standards(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[RegulationStandard]:
    return list_regulation_standards(db, current_user)


@router.post("", response_model=RegulationStandardRead, status_code=status.HTTP_201_CREATED)
def post_standard(
    payload: RegulationStandardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> RegulationStandard:
    return create_regulation_standard(db, current_user, payload)


@router.post(
    "/{standard_id}/requirements",
    response_model=RegulationRequirementRead,
    status_code=status.HTTP_201_CREATED,
)
def post_requirement(
    standard_id: UUID,
    payload: RegulationRequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> RegulationRequirement:
    return add_regulation_requirement(db, current_user, standard_id, payload)
