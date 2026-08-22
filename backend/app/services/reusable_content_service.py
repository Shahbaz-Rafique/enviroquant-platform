from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.eia import EiaDocument, EiaSubSection
from app.models.eia_document_member import EiaDocumentMember
from app.models.user import User


def search_reusable_eia_content(
    db: Session, current_user: User, query: str, *, limit: int = 20
) -> list[dict[str, object]]:
    normalized = query.strip()
    if len(normalized) < 2:
        return []
    member = EiaDocumentMember
    statement = (
        select(EiaSubSection, EiaDocument)
        .join(EiaDocument, EiaDocument.id == EiaSubSection.eia_document_id)
        .outerjoin(
            member,
            and_(
                member.eia_document_id == EiaDocument.id,
                member.tenant_id == current_user.tenant_id,
                member.user_id == current_user.id,
            ),
        )
        .where(
            EiaDocument.tenant_id == current_user.tenant_id,
            or_(EiaDocument.created_by_id == current_user.id, member.id.is_not(None)),
            or_(
                EiaSubSection.title.ilike(f"%{normalized}%"),
                EiaSubSection.content.ilike(f"%{normalized}%"),
            ),
        )
        .order_by(EiaSubSection.updated_at.desc())
        .limit(min(max(limit, 1), 50))
    )
    return [
        {
            "eia_document_id": document.id,
            "eia_document_title": document.title,
            "subsection_id": subsection.id,
            "subsection_number": subsection.subsection_number,
            "subsection_title": subsection.title,
            "content_html": subsection.content_html,
            "excerpt": _excerpt(subsection.content),
            "updated_at": subsection.updated_at,
        }
        for subsection, document in db.execute(statement).all()
    ]


def _excerpt(value: str, limit: int = 500) -> str:
    compact = " ".join((value or "").split())
    return compact if len(compact) <= limit else f"{compact[:limit].rstrip()}…"
