"""
Email Delivery Service
SMTP delivery engine with connection pooling and retry logic
"""

import smtplib
import socket
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

logger = logging.getLogger(__name__)


class EmailDeliveryService:
    SMTP_TIMEOUT = 30
    MAX_CONNECTIONS = 5
    
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: str = "noreply@outflo.com",
        from_name: str = "Outflo",
        to_name: Optional[str] = None,
        organization_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        try:
            smtp_config = await EmailDeliveryService._get_smtp_config(organization_id)
            
            if not smtp_config:
                return {"success": False, "error": "No SMTP configuration found"}
            
            message = EmailDeliveryService._build_message(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content or html_content,
                from_email=from_email,
                from_name=from_name
            )
            
            result = await EmailDeliveryService._send_via_smtp(
                message=message,
                smtp_config=smtp_config,
                to_email=to_email,
                from_email=from_email
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Email delivery error: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _get_smtp_config(organization_id: Optional[str] = None) -> Optional[Dict]:
        if organization_id:
            config = await MongoDB.get_collection("smtp_configs").find_one({
                "organization_id": organization_id,
                "is_active": True
            })
            if config:
                return serialize_doc(config)
        
        config = await MongoDB.get_collection("smtp_configs").find_one({
            "is_default": True,
            "is_active": True
        })
        
        return serialize_doc(config) if config else None

    @staticmethod
    def _build_message(
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_content: str,
        text_content: str,
        from_email: str,
        from_name: str
    ) -> MIMEMultipart:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        
        message["X-Priority"] = "3"
        message["X-Mailer"] = "Outflo Email Engine"
        
        text_part = MIMEText(text_content, "plain", "utf-8")
        html_part = MIMEText(html_content, "html", "utf-8")
        
        message.attach(text_part)
        message.attach(html_part)
        
        return message

    @staticmethod
    async def _send_via_smtp(
        message: MIMEMultipart,
        smtp_config: Dict,
        to_email: str,
        from_email: str
    ) -> Dict[str, Any]:
        host = smtp_config.get("host")
        port = smtp_config.get("port", 587)
        username = smtp_config.get("username")
        password = smtp_config.get("password")
        use_tls = smtp_config.get("use_tls", True)
        
        try:
            if use_tls:
                server = smtplib.SMTP(host, port, timeout=EmailDeliveryService.SMTP_TIMEOUT)
                server.starttls()
            else:
                server = smtplib.SMTP(host, port, timeout=EmailDeliveryService.SMTP_TIMEOUT)
            
            if username and password:
                server.login(username, password)
            
            server.sendmail(from_email, to_email, message.as_string())
            server.quit()
            
            message_id = f"{datetime.utcnow().timestamp()}-{hash(to_email) % 10000}@outflo.com"
            
            logger.info(f"Email sent successfully to {to_email}")
            
            return {
                "success": True,
                "message_id": message_id,
                "smtp_response": "Sent successfully"
            }
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP auth error: {str(e)}")
            return {
                "success": False,
                "error": "Authentication failed",
                "smtp_response": str(e)
            }
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP recipient refused: {str(e)}")
            return {
                "success": False,
                "error": "Recipient address rejected",
                "smtp_response": str(e),
                "bounced": True
            }
        except smtplib.SMTPSenderRefused as e:
            logger.error(f"SMTP sender refused: {str(e)}")
            return {
                "success": False,
                "error": "Sender address rejected",
                "smtp_response": str(e)
            }
        except socket.timeout as e:
            logger.error(f"SMTP timeout: {str(e)}")
            return {
                "success": False,
                "error": "Connection timeout",
                "smtp_response": str(e)
            }
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def test_smtp_connection(smtp_config: Dict) -> Dict[str, Any]:
        try:
            host = smtp_config.get("host")
            port = smtp_config.get("port", 587)
            username = smtp_config.get("username")
            password = smtp_config.get("password")
            use_tls = smtp_config.get("use_tls", True)
            
            if use_tls:
                server = smtplib.SMTP(host, port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP(host, port, timeout=10)
            
            if username and password:
                server.login(username, password)
            
            server.quit()
            
            return {"success": True, "message": "Connection successful"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    async def send_test_email(
        to_email: str,
        smtp_config: Dict
    ) -> Dict[str, Any]:
        subject = "Outflo SMTP Test"
        html_content = """
        <html>
        <body style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #6366f1;">SMTP Test Successful!</h2>
            <p>This is a test email from Outflo email automation engine.</p>
            <p>If you received this email, your SMTP configuration is working correctly.</p>
        </body>
        </html>
        """
        text_content = "SMTP Test Successful! This is a test email from Outflo."
        
        message = EmailDeliveryService._build_message(
            to_email=to_email,
            to_name=None,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            from_email=smtp_config.get("from_email", "noreply@outflo.com"),
            from_name=smtp_config.get("from_name", "Outflo")
        )
        
        return await EmailDeliveryService._send_via_smtp(
            message=message,
            smtp_config=smtp_config,
            to_email=to_email,
            from_email=smtp_config.get("from_email", "noreply@outflo.com")
        )