from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.seeds.eia_checklist_seed import synchronize_eia_structure


def main() -> None:
    with SessionLocal() as db:
        documents = db.scalars(
            select(EiaDocument).options(
                selectinload(EiaDocument.sections)
                .selectinload(EiaSection.subsections)
                .selectinload(EiaSubSection.checklist_mappings)
            )
        ).unique().all()
        for document in documents:
            synchronize_eia_structure(db, document)
        db.commit()
        print(f"Synchronized {len(documents)} EIA document checklists")


if __name__ == "__main__":
    main()
