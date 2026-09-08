import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from typing import Optional

logger = logging.getLogger(__name__)

def send_notification_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None
):
    """
    Dispatches notification email via SMTP to a dynamic recipient.
    The sender is always the configured MAIL_USERNAME from environment.
    Supports both plain text and rich HTML email formatting.
    """
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 587))

    if not sender_email or not sender_password:
        logger.warning("Mail credentials not configured in environment. Skipping email dispatch.")
        return {"status": "skipped", "message": "Missing mail credentials"}

    to_clean = (to_email or "").strip()
    if not to_clean or "@" not in to_clean:
        logger.warning(f"Invalid or missing recipient email: '{to_email}'. Skipping dispatch.")
        return {"status": "skipped", "message": "Invalid recipient email"}

    message = MIMEMultipart("alternative")
    message["From"] = f"ThermoShield Alerts <{sender_email}>"
    message["To"] = to_clean
    message["Subject"] = subject

    # Plaintext fallback
    message.attach(MIMEText(body, "plain"))

    # Optional HTML body
    if html_body:
        message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_clean, message.as_string())
        logger.info(f"Notification email dispatched successfully to {to_clean} from {sender_email}")
        return {
            "status": "success",
            "message": f"Email alert sent successfully to {to_clean}",
            "recipient": to_clean,
            "sender": sender_email
        }
    except Exception as e:
        logger.error(f"Failed to send email alert to {to_clean}: {e}")
        return {"status": "error", "message": str(e), "recipient": to_clean}

