from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.eia import EiaEmailRequest
from app.services.eia_document_export_service import build_compiled_eia_docx_bytes, build_compiled_eia_pdf_bytes
from app.services.email_service import _send


def email_eia_document(db: Session, user: User, document_id: UUID, payload: EiaEmailRequest) -> dict:
    # The exporter enforces tenant and document membership before any email is sent.
    is_pdf = payload.format == "pdf"
    content = build_compiled_eia_pdf_bytes(db, user, document_id) if is_pdf else build_compiled_eia_docx_bytes(db, user, document_id)
    filename = f'enviroquant-eia-{document_id}.{payload.format}'
    mime_type = 'application/pdf' if is_pdf else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    if len(content) > 18 * 1024 * 1024:
        raise HTTPException(413, f'This report is too large to email. Download the {payload.format.upper()} and share it separately.')
    sent = _send(
        payload.subject, str(payload.recipient),
        f'{user.full_name} shared an EIA report with you.\n\n{payload.message or "Please find the EIA document attached."}\n\nThis is a snapshot of the saved report; review its status before use.',
        attachments=[(filename, content, mime_type)],
    )
    if not sent:
        raise HTTPException(502, f'The email could not be sent. Check email settings and try again, or download the {payload.format.upper()}.')
    return {'sent': True, 'recipient': str(payload.recipient), 'filename': filename}
