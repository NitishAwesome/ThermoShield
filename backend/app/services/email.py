import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

def send_notification_email(to_email: str, subject: str, body: str):
    """
    Dispatches notification email via SMTP.
    Safely skips dispatch when credentials or recipient are unconfigured.
    """
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 587))

    if not sender_email or not sender_password:
        logger.warning("Mail credentials not configured in environment. Skipping email dispatch.")
        return {"status": "skipped", "message": "Missing mail credentials"}

    if not to_email:
        logger.warning("No recipient email specified. Skipping email dispatch.")
        return {"status": "skipped", "message": "Missing recipient"}

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, message.as_string())
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")
        return {"status": "error", "message": str(e)}
