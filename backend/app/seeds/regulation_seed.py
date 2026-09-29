from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.regulation import RegulationRequirement, RegulationStandard


# Only requirements traceable to an official Kuwait Environment Public
# Authority (KEPA) source belong here. A Kuwait practitioner must still confirm
# their applicability to the project before issue.
KUWAIT_REGULATORY_LIBRARY = (
    {
        "code": "KWT-EPL-42-2014",
        "title": "Kuwait Environmental Protection Law No. 42 of 2014",
        "jurisdiction": "State of Kuwait",
        "authority": "Kuwait Environment Public Authority (KEPA)",
        "version": "As amended by Law No. 99 of 2015",
        "effective_from": date(2014, 1, 1),
        "source_url": "https://khadamat.epa.org.kw/marine-sample-permit",
        "requirements": (
            (
                "ART-100",
                "Protect threatened terrestrial and marine wildlife",
                "Identify whether project activities could hunt, kill, capture, collect, harm, possess or transport threatened terrestrial or marine wildlife, or disturb their young, eggs, nests or body parts. Any proposed collection must be supported by the applicable KEPA authorisation and controls.",
                ["3", "4", "5", "6", "7", "8", "9", "12", "13"],
            ),
            (
                "ART-101",
                "Prevent trade in threatened wildlife",
                "Identify and prevent trade in threatened wildlife or any part of it, including risks arising through procurement, contractors, workforce activity and specimen handling.",
                ["5", "6", "7", "8", "9", "12", "13"],
            ),
            (
                "ART-149",
                "Recognise enforcement consequences for wildlife offences",
                "Record the enforcement consequence linked by the official KEPA source to breach of Article 100, and assign controls, ownership, monitoring and escalation suitable to the project's wildlife interaction risk.",
                ["7", "8", "9", "12", "13", "14"],
            ),
        ),
    },
    {
        "code": "KWT-KEPA-DEC-3-2017",
        "title": "Executive Regulation on Biodiversity, Decision No. 3 of 2017",
        "jurisdiction": "State of Kuwait",
        "authority": "Kuwait Environment Public Authority (KEPA)",
        "version": "Decision No. 3 of 2017",
        "effective_from": date(2017, 1, 1),
        "source_url": "https://khadamat.epa.org.kw/marine-sample-permit",
        "requirements": (
            (
                "SAMPLE-PERMIT",
                "Obtain authorisation before scientific environmental sampling where required",
                "Where studies involve collection of scientific samples from Kuwait's environment, confirm the applicable KEPA permit route and document the study, objectives, dates, locations and coordinates, sample type and quantity, collection method, personnel and supporting authorisations before collection.",
                ["3", "4", "5", "6", "7", "8", "9", "12", "A"],
            ),
            (
                "SAMPLE-TRACEABILITY",
                "Maintain traceability for authorised environmental sampling",
                "Sampling records must identify the approved locations and period, sample type and counts, collection method, responsible researchers and technicians, and the supporting permit or correspondence so the EIA evidence can be traced to an authorised source.",
                ["3", "4", "7", "8", "9", "12", "13", "A"],
            ),
        ),
    },
)


def seed_kuwait_regulatory_library(
    db: Session,
    tenant_id: UUID,
    *,
    commit: bool = True,
) -> tuple[int, int]:
    """Install the verified, idempotent Kuwait starter library for one tenant."""

    standards_created = 0
    requirements_created = 0
    for item in KUWAIT_REGULATORY_LIBRARY:
        standard = db.scalar(
            select(RegulationStandard).where(
                RegulationStandard.tenant_id == tenant_id,
                RegulationStandard.code == item["code"],
                RegulationStandard.version == item["version"],
            )
        )
        if standard is None:
            standard = RegulationStandard(
                tenant_id=tenant_id,
                code=item["code"],
                title=item["title"],
                jurisdiction=item["jurisdiction"],
                authority=item["authority"],
                version=item["version"],
                effective_from=item["effective_from"],
                source_url=item["source_url"],
                is_active=True,
                standard_metadata={
                    "source_status": "official",
                    "source_authority": "Kuwait Environment Public Authority (KEPA)",
                    "applicability_requires_professional_confirmation": True,
                    "country_code": "KW",
                },
            )
            db.add(standard)
            db.flush()
            standards_created += 1
        for code, title, requirement_text, tags in item["requirements"]:
            existing = db.scalar(
                select(RegulationRequirement).where(
                    RegulationRequirement.standard_id == standard.id,
                    RegulationRequirement.requirement_code == code,
                )
            )
            if existing is None:
                db.add(
                    RegulationRequirement(
                        tenant_id=tenant_id,
                        standard_id=standard.id,
                        requirement_code=code,
                        title=title,
                        requirement_text=requirement_text,
                        section_tags=tags,
                        requirement_metadata={
                            "source_status": "official",
                            "source_url": item["source_url"],
                            "applicability_status": "REQUIRES_PROFESSIONAL_CONFIRMATION",
                            "country_code": "KW",
                        },
                    )
                )
                requirements_created += 1
    if commit:
        db.commit()
    else:
        db.flush()
    return standards_created, requirements_created
