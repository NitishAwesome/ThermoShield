import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

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
    Includes RFC 5322 compliant headers (Date, Message-ID, Reply-To, Auto-Submitted)
    to maximize inbox deliverability and prevent automated spam classification.
    """
    from dotenv import load_dotenv
    from pathlib import Path

    # Reload .env files dynamically: root first, then backend/.env takes ultimate priority
    root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=True)
    backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=True)

    sender_email = (os.getenv("MAIL_USERNAME") or "").strip()
    sender_password = (os.getenv("MAIL_PASSWORD") or "").strip()
    # Google App Passwords are 16 letters, often entered with spaces like 'abcd efgh ijkl mnop'
    if sender_password and " " in sender_password and len(sender_password.replace(" ", "")) == 16:
        sender_password = sender_password.replace(" ", "")

    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 465))

    if not sender_email or not sender_password:
        logger.warning("Mail credentials not configured in environment. Skipping email dispatch.")
        return {"status": "skipped", "message": "Missing mail credentials"}

    to_clean = (to_email or "").strip()
    if not to_clean or "@" not in to_clean:
        logger.warning(f"Invalid or missing recipient email: '{to_email}'. Skipping dispatch.")
        return {"status": "skipped", "message": "Invalid recipient email"}

    sender_domain = sender_email.split("@")[-1] if "@" in sender_email else "gmail.com"

    message = MIMEMultipart("alternative")
    message["From"] = f"ThermoShield Alerts <{sender_email}>"
    message["To"] = to_clean
    message["Reply-To"] = sender_email
    message["Subject"] = subject
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=sender_domain)
    message["Auto-Submitted"] = "auto-generated"
    message["X-Mailer"] = "ThermoShield-Alert-System/1.0"
    message["Precedence"] = "bulk"

    # Plaintext fallback
    message.attach(MIMEText(body, "plain"))

    # Optional HTML body
    if html_body:
        message.attach(MIMEText(html_body, "html"))

    try:
        # Port 465 uses SSL direct connection, which avoids ISP/firewall blocks on STARTTLS (587)
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, 465, timeout=15) as server:
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, to_clean, message.as_string())
        else:
            try:
                with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                    server.starttls()
                    server.login(sender_email, sender_password)
                    server.sendmail(sender_email, to_clean, message.as_string())
            except Exception as tls_err:
                # If port 587 STARTTLS handshake fails, automatically fallback to Gmail port 465 SSL
                if "gmail.com" in smtp_server:
                    logger.info(f"Port {smtp_port} failed ({tls_err}), attempting SSL fallback on port 465...")
                    with smtplib.SMTP_SSL(smtp_server, 465, timeout=15) as server:
                        server.login(sender_email, sender_password)
                        server.sendmail(sender_email, to_clean, message.as_string())
                else:
                    raise tls_err

        logger.info(f"Notification email dispatched successfully to {to_clean} from {sender_email}")
        return {
            "status": "success",
            "message": f"Email alert sent successfully to {to_clean}",
            "recipient": to_clean,
            "sender": sender_email
        }
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed for {sender_email}: {e}")
        return {
            "status": "error",
            "message": (
                f"Gmail authentication failed (BadCredentials) for '{sender_email}'. "
                "Please make sure 2-Step Verification is enabled on that Google account, "
                "and that the 16-character App Password at myaccount.google.com/apppasswords "
                f"was generated specifically for '{sender_email}'."
            ),
            "recipient": to_clean
        }
    except Exception as e:
        logger.error(f"Failed to send email alert to {to_clean}: {e}")
        return {"status": "error", "message": str(e), "recipient": to_clean}

