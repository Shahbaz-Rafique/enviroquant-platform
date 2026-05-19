import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def send_invitation_email(
    recipient_email: str,
    recipient_name: str,
    organization_name: str,
    invite_url: str,
) -> bool:
    settings = get_settings()
    sender = settings.smtp_from_email or settings.email_user
    username = settings.smtp_username or settings.email_user
    password = settings.smtp_password or settings.email_pass
    host = settings.smtp_host or ("smtp.gmail.com" if username and password else None)

    if not host or not sender:
        return False

    message = EmailMessage()
    message["Subject"] = f"You're invited to EnviroQuant: {organization_name}"
    message["From"] = sender
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                f"Hello {recipient_name},",
                "",
                f"You have been invited to join {organization_name} on EnviroQuant.",
                "Use the secure link below to activate your account:",
                "",
                invite_url,
                "",
                "This invitation link expires in 7 days.",
            ]
        )
    )

    try:
        with smtplib.SMTP(host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.send_message(message)
    except Exception:
        logger.exception("Invitation email delivery failed")
        return False

    return True
