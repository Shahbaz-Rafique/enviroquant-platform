from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.regulation import RegulationRequirement, RegulationStandard
from app.models.user import User
from app.schemas.regulation import RegulationRequirementCreate, RegulationStandardCreate


def list_regulation_standards(db: Session, current_user: User) -> list[RegulationStandard]:
    return list(
        db.scalars(
            select(RegulationStandard)
            .options(selectinload(RegulationStandard.requirements))
            .where(RegulationStandard.tenant_id == current_user.tenant_id)
            .order_by(RegulationStandard.jurisdiction, RegulationStandard.code, RegulationStandard.version)
        ).all()
    )


def create_regulation_standard(
    db: Session, current_user: User, payload: RegulationStandardCreate
) -> RegulationStandard:
    standard = RegulationStandard(
        tenant_id=current_user.tenant_id,
        code=payload.code.strip(),
        title=payload.title.strip(),
        jurisdiction=payload.jurisdiction.strip(),
        authority=payload.authority.strip() if payload.authority else None,
        version=payload.version.strip(),
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        source_url=payload.source_url,
        standard_metadata=payload.metadata,
    )
    db.add(standard)
    db.commit()
    return _get_standard(db, current_user, standard.id)


def add_regulation_requirement(
    db: Session,
    current_user: User,
    standard_id: UUID,
    payload: RegulationRequirementCreate,
) -> RegulationRequirement:
    standard = _get_standard(db, current_user, standard_id)
    requirement = RegulationRequirement(
        tenant_id=current_user.tenant_id,
        standard_id=standard.id,
        requirement_code=payload.requirement_code.strip(),
        title=payload.title.strip(),
        requirement_text=payload.requirement_text.strip(),
        section_tags=payload.section_tags,
        requirement_metadata=payload.metadata,
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return requirement


def _get_standard(db: Session, current_user: User, standard_id: UUID) -> RegulationStandard:
    standard = db.scalar(
        select(RegulationStandard)
        .options(selectinload(RegulationStandard.requirements))
        .where(
            RegulationStandard.id == standard_id,
            RegulationStandard.tenant_id == current_user.tenant_id,
        )
    )
    if standard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation standard not found")
    return standard
