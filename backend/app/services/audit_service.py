from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditEvent


def record_audit_event(
    db: Session,
    *,
    tenant_id: UUID,
    actor_user_id: UUID | None,
    event_type: str,
    entity_type: str,
    entity_id: UUID | None,
    summary: str | None = None,
    metadata: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        event_metadata=metadata or {},
    )
    db.add(event)
    return event
