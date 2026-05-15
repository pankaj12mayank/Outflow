from email.message import EmailMessage
from typing import List, Optional
import smtplib
from ..core.config import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.use_tls = settings.smtp_use_tls

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> bool:
        msg = EmailMessage()
        msg["From"] = f"{from_name or self.smtp_user} <{from_email or self.smtp_user}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            return True
        except Exception:
            return False

    async def send_bulk(
        self,
        recipients: List[str],
        subject: str,
        body: str,
        from_email: Optional[str] = None,
    ) -> dict:
        results = {"sent": 0, "failed": 0, "errors": []}
        for email in recipients:
            success = await self.send_email(email, subject, body, from_email)
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(email)
        return results


email_service = EmailService()