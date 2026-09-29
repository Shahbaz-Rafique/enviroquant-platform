import logging
import smtplib
import threading
from email.message import EmailMessage

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def _smtp_connection():
    settings = get_settings()
    sender = settings.smtp_from_email or settings.email_user
    username = settings.smtp_username or settings.email_user
    password = settings.smtp_password or settings.email_pass
    host = settings.smtp_host or ("smtp.gmail.com" if username and password else None)
    return host, settings.smtp_port, sender, username, password, settings.smtp_use_tls


def _send(subject: str, recipient: str, text_body: str, html_body: str | None = None, *, attachments: list[tuple[str, bytes, str]] | None = None) -> bool:
    host, port, sender, username, password, use_tls = _smtp_connection()
    if not host or not sender:
        logger.warning("Email not configured — skipping: %s -> %s", subject, recipient)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"EnviroQuant <{sender}>"
    message["To"] = recipient
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    for filename, content, mime_type in attachments or []:
        maintype, subtype = mime_type.split("/", 1)
        message.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.send_message(message)
        logger.info("Email sent: %s -> %s", subject, recipient)
        return True
    except Exception:
        logger.exception("Email delivery failed: %s -> %s", subject, recipient)
        return False


def _send_async(subject: str, recipient: str, text_body: str, html_body: str | None = None) -> None:
    thread = threading.Thread(target=_send, args=(subject, recipient, text_body, html_body), daemon=True)
    thread.start()


def _wrap_html(content: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f6f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #dce6e1;overflow:hidden">
<div style="background:#123f2e;padding:20px 28px">
<span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.02em">EnviroQuant</span>
</div>
<div style="padding:28px">
{content}
</div>
<div style="background:#f8faf9;padding:16px 28px;border-top:1px solid #e3eae6;font-size:12px;color:#697a73;text-align:center">
Evidence Before Conclusions&trade; &middot; EnviroQuant
</div>
</div>
</body>
</html>"""


def send_invitation_email(
    recipient_email: str,
    recipient_name: str,
    organization_name: str,
    invite_url: str,
) -> bool:
    subject = f"You're invited to EnviroQuant: {organization_name}"
    text_body = "\n".join([
        f"Hello {recipient_name},",
        "",
        f"You have been invited to join {organization_name} on EnviroQuant.",
        "Use the secure link below to activate your account:",
        "",
        invite_url,
        "",
        "This invitation link expires in 7 days.",
    ])
    html_body = _wrap_html(f"""
<h2 style="color:#18372c;margin:0 0 16px">You're invited!</h2>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 12px">
Hello {recipient_name},
</p>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 20px">
You have been invited to join <strong>{organization_name}</strong> on EnviroQuant
&mdash; an AI-powered platform for Environmental Impact Assessments.
</p>
<div style="text-align:center;margin:24px 0">
<a href="{invite_url}" style="display:inline-block;background:#287451;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
Accept Invitation
</a>
</div>
<p style="color:#697a73;font-size:13px;margin:0">This invitation expires in 7 days.</p>
""")
    return _send(subject, recipient_email, text_body, html_body)


def send_assignment_notification(
    recipient_email: str,
    recipient_name: str,
    assigner_name: str,
    document_title: str,
    section_title: str,
    role: str,
    project_url: str,
    activation_required: bool = False,
) -> None:
    role_label = "author" if role.lower() in ("author", "editor") else "reviewer"
    action_label = "Accept Invitation & Set Password" if activation_required else "Open EIA Workspace"
    activation_note = (
        "Set your password to activate your invited account before opening this assignment. "
        "This link expires in 7 days; use this latest email because it replaces earlier activation links."
        if activation_required else ""
    )
    subject = f"You've been assigned as {role_label}: {section_title}"
    text_body = "\n".join([
        f"Hello {recipient_name},",
        "",
        f"{assigner_name} has assigned you as {role_label} for:",
        f"  Section: {section_title}",
        f"  Document: {document_title}",
        "",
        activation_note,
        f"{action_label}: {project_url}",
    ])
    html_body = _wrap_html(f"""
<h2 style="color:#18372c;margin:0 0 16px">New assignment</h2>
<p style="color:#344f44;font-size:15px;line-height:1.6">{activation_note}</p>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 12px">
Hello {recipient_name},
</p>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 16px">
<strong>{assigner_name}</strong> has assigned you as <strong>{role_label}</strong> for:
</p>
<div style="background:#f8faf9;border:1px solid #dce6e1;border-radius:8px;padding:16px;margin:0 0 20px">
<p style="margin:0 0 4px;font-size:13px;color:#697a73">Section</p>
<p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18372c">{section_title}</p>
<p style="margin:0 0 4px;font-size:13px;color:#697a73">Document</p>
<p style="margin:0;font-size:15px;font-weight:600;color:#18372c">{document_title}</p>
</div>
<div style="text-align:center;margin:24px 0">
<a href="{project_url}" style="display:inline-block;background:#287451;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
{action_label}
</a>
</div>
""")
    _send_async(subject, recipient_email, text_body, html_body)


def send_workflow_transition_notification(
    recipient_email: str,
    recipient_name: str,
    actor_name: str,
    subsection_number: str,
    subsection_title: str,
    document_title: str,
    from_status: str,
    to_status: str,
    comment: str | None,
    project_url: str,
) -> None:
    status_label = to_status.replace("_", " ").title()
    subject = f"EIA Update: {subsection_number} — {status_label}"
    comment_line = f"\n  Comment: {comment}" if comment else ""
    text_body = "\n".join([
        f"Hello {recipient_name},",
        "",
        f"{actor_name} moved subsection {subsection_number} to {status_label}.",
        f"  Subsection: {subsection_title}",
        f"  Document: {document_title}",
        f"  Previous status: {from_status.replace('_', ' ').title()}",
        comment_line,
        "",
        f"Open the workspace: {project_url}",
    ])
    comment_html = f'<p style="margin:0 0 4px;font-size:13px;color:#697a73">Comment</p><p style="margin:0;font-size:14px;color:#344f44;font-style:italic">&ldquo;{comment}&rdquo;</p>' if comment else ""
    status_color = _status_color(to_status)
    html_body = _wrap_html(f"""
<h2 style="color:#18372c;margin:0 0 16px">Workflow update</h2>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 16px">
<strong>{actor_name}</strong> moved subsection <strong>{subsection_number}</strong> to:
</p>
<div style="text-align:center;margin:0 0 20px">
<span style="display:inline-block;background:{status_color};color:#fff;padding:8px 20px;border-radius:20px;font-weight:600;font-size:14px">
{status_label}
</span>
</div>
<div style="background:#f8faf9;border:1px solid #dce6e1;border-radius:8px;padding:16px;margin:0 0 20px">
<p style="margin:0 0 4px;font-size:13px;color:#697a73">Subsection</p>
<p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18372c">{subsection_number}. {subsection_title}</p>
<p style="margin:0 0 4px;font-size:13px;color:#697a73">Document</p>
<p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#18372c">{document_title}</p>
{comment_html}
</div>
<div style="text-align:center;margin:24px 0">
<a href="{project_url}" style="display:inline-block;background:#287451;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
Open Subsection
</a>
</div>
""")
    _send_async(subject, recipient_email, text_body, html_body)


def send_review_decision_notification(
    recipient_email: str,
    recipient_name: str,
    reviewer_name: str,
    document_title: str,
    decision: str,
    comment: str | None,
    project_url: str,
) -> None:
    decision_label = "approved" if decision.lower() == "approved" else "requested changes on"
    subject = f"EIA Review: {reviewer_name} {decision_label} {document_title}"
    text_body = "\n".join([
        f"Hello {recipient_name},",
        "",
        f"{reviewer_name} has {decision_label} the EIA document: {document_title}.",
        f"  Comment: {comment}" if comment else "",
        "",
        f"View the document: {project_url}",
    ])
    decision_color = "#287451" if decision.lower() == "approved" else "#d97706"
    comment_html = f'<div style="background:#f8faf9;border:1px solid #dce6e1;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0;font-size:14px;color:#344f44;font-style:italic">&ldquo;{comment}&rdquo;</p></div>' if comment else ""
    html_body = _wrap_html(f"""
<h2 style="color:#18372c;margin:0 0 16px">Review decision</h2>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 16px">
<strong>{reviewer_name}</strong> has {decision_label}:
</p>
<div style="text-align:center;margin:0 0 20px">
<span style="display:inline-block;background:{decision_color};color:#fff;padding:8px 20px;border-radius:20px;font-weight:600;font-size:14px">
{decision.replace('_', ' ').title()}
</span>
</div>
<p style="font-size:15px;font-weight:600;color:#18372c;text-align:center;margin:0 0 12px">{document_title}</p>
{comment_html}
<div style="text-align:center;margin:24px 0">
<a href="{project_url}" style="display:inline-block;background:#287451;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
View Document
</a>
</div>
""")
    _send_async(subject, recipient_email, text_body, html_body)


def send_comment_notification(
    recipient_email: str,
    recipient_name: str,
    commenter_name: str,
    subsection_number: str,
    subsection_title: str,
    document_title: str,
    comment_text: str,
    project_url: str,
) -> None:
    subject = f"New comment on {subsection_number}: {document_title}"
    text_body = "\n".join([
        f"Hello {recipient_name},",
        "",
        f"{commenter_name} left a comment on subsection {subsection_number} ({subsection_title}):",
        f'  "{comment_text[:200]}"',
        "",
        f"View in workspace: {project_url}",
    ])
    html_body = _wrap_html(f"""
<h2 style="color:#18372c;margin:0 0 16px">New comment</h2>
<p style="color:#344f44;font-size:15px;line-height:1.6;margin:0 0 16px">
<strong>{commenter_name}</strong> commented on subsection <strong>{subsection_number}</strong>:
</p>
<div style="background:#f8faf9;border:1px solid #dce6e1;border-radius:8px;padding:16px;margin:0 0 20px">
<p style="margin:0 0 4px;font-size:13px;color:#697a73">{subsection_title}</p>
<p style="margin:0;font-size:14px;color:#344f44;font-style:italic;line-height:1.5">&ldquo;{comment_text[:500]}&rdquo;</p>
</div>
<div style="text-align:center;margin:24px 0">
<a href="{project_url}" style="display:inline-block;background:#287451;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
View Comment
</a>
</div>
""")
    _send_async(subject, recipient_email, text_body, html_body)


def _status_color(status: str) -> str:
    normalized = status.upper()
    if normalized == "APPROVED":
        return "#16a34a"
    if normalized in ("READY_FOR_REVIEW", "UNDER_REVIEW"):
        return "#d97706"
    if normalized == "REVISION_REQUIRED":
        return "#dc2626"
    if normalized == "IN_PROGRESS":
        return "#287451"
    return "#64748b"
