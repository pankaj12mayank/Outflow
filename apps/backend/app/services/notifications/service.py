"""
Outflo - Notification Service
In-app and email notification infrastructure
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Any, AsyncIterator
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, func, case
from sqlalchemy.orm import selectinload

from app.db import AsyncSessionLocal

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"


@dataclass
class NotificationPayload:
    user_id: int
    organization_id: int
    type: str
    title: str
    message: Optional[str]
    description: Optional[str]
    priority: str
    data: dict
    action_url: Optional[str]
    action_label: Optional[str]
    channels: list[str]


class NotificationProvider:
    async def send(self, payload: NotificationPayload) -> bool:
        raise NotImplementedError


class InAppNotificationProvider(NotificationProvider):
    async def send(self, payload: NotificationPayload) -> bool:
        try:
            from app.models.notification_models import Notification

            async with AsyncSessionLocal() as db:
                notification = Notification(
                    organization_id=payload.organization_id,
                    user_id=payload.user_id,
                    type=payload.type,
                    title=payload.title,
                    message=payload.message,
                    description=payload.description,
                    priority=payload.priority,
                    data=payload.data,
                    action_url=payload.action_url,
                    action_label=payload.action_label,
                )
                db.add(notification)
                await db.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to send in-app notification: {e}")
            return False


class EmailNotificationProvider(NotificationProvider):
    def __init__(self):
        self.template_renderer = TemplateRenderer()
        self.sender = None

    async def send(self, payload: NotificationPayload) -> bool:
        if NotificationChannel.EMAIL not in payload.channels:
            return True

        try:
            from app.services.email import get_email_sender
            from app.models.notification_models import EmailLog
            from app.models.models import User

            async with AsyncSessionLocal() as db:
                user_result = await db.execute(
                    select(User).where(User.id == payload.user_id)
                )
                user = user_result.scalar_one_or_none()
                if not user or not user.email:
                    return False

                template_data = {
                    "user_name": user.full_name,
                    "notification_title": payload.title,
                    "notification_message": payload.message,
                    "action_url": payload.action_url,
                    "action_label": payload.action_label,
                    **payload.data,
                }

                subject = self.template_renderer.render(
                    payload.data.get("_subject_template", payload.title),
                    template_data,
                )
                body_html = self.template_renderer.render(
                    payload.data.get("_body_html_template", "<p>{{notification_message}}</p>"),
                    template_data,
                )

                email_log = EmailLog(
                    organization_id=payload.organization_id,
                    user_id=payload.user_id,
                    to_email=user.email,
                    subject=subject,
                    template_data=template_data,
                    status="pending",
                )
                db.add(email_log)
                await db.commit()
                await db.refresh(email_log)

                send_result = await self._send_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=subject,
                    body_html=body_html,
                )

                email_log.status = "sent" if send_result.success else "failed"
                email_log.sent_at = datetime.utcnow()
                email_log.message_id = send_result.message_id
                email_log.error_message = send_result.error
                await db.commit()

                return send_result.success

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False

    async def _send_email(
        self, to_email: str, to_name: str, subject: str, body_html: str
    ) -> dict:
        from app.services.email import get_email_sender
        from app.schemas.email import SendEmailRequest

        sender = get_email_sender()
        request = SendEmailRequest(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            body_html=body_html,
            track_opens=True,
        )

        config = {
            "id": 0,
            "email": "notifications@outflo.io",
            "from_email": "notifications@outflo.io",
            "from_name": "Outflo",
            "smtp_host": "smtp.postmarkapp.com",
            "smtp_port": 587,
            "smtp_username": "",
            "smtp_password": "",
            "smtp_encryption": "starttls",
            "daily_limit": 1000,
        }

        result = await sender.send_email(request, config)
        return result.model_dump()


class NotificationManager:
    def __init__(self):
        self._providers: dict[str, NotificationProvider] = {
            NotificationChannel.IN_APP: InAppNotificationProvider(),
            NotificationChannel.EMAIL: EmailNotificationProvider(),
        }

    async def send(self, payload: NotificationPayload) -> dict:
        results = {}
        for channel in payload.channels:
            provider = self._providers.get(channel)
            if provider:
                success = await provider.send(payload)
                results[channel] = success
            else:
                results[channel] = False

        return results

    async def send_batch(self, payloads: list[NotificationPayload]) -> dict:
        results = {"total": len(payloads), "sent": 0, "failed": 0}
        for payload in payloads:
            r = await self.send(payload)
            if any(r.values()):
                results["sent"] += 1
            else:
                results["failed"] += 1
        return results

    def register_provider(self, channel: str, provider: NotificationProvider):
        self._providers[channel] = provider


class TemplateRenderer:
    def __init__(self):
        self._cache: dict[str, str] = {}

    def render(self, template: str, variables: dict) -> str:
        import re
        result = template
        for key, value in variables.items():
            placeholder = "{{%s}}" % key
            result = result.replace(placeholder, str(value) if value is not None else "")

        for match in re.finditer(r"\{\{(\w+)\}\}", result):
            var_name = match.group(1)
            if var_name not in variables:
                result = result.replace(match.group(0), "")

        return result

    def render_html(self, html: str, variables: dict) -> str:
        return self.render(html, variables)

    def render_text(self, text: str, variables: dict) -> str:
        return self.render(text, variables)


class EmailTemplateManager:
    def __init__(self):
        self._cache: dict[str, dict] = {}
        self._renderer = TemplateRenderer()

    async def get_template(
        self, template_type: str, org_id: Optional[int] = None
    ) -> Optional[dict]:
        cache_key = f"{org_id}:{template_type}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        async with AsyncSessionLocal() as db:
            from app.models.notification_models import EmailTemplate

            query = select(EmailTemplate).where(
                and_(
                    EmailTemplate.template_type == template_type,
                    EmailTemplate.is_active == True,
                )
            )

            if org_id:
                org_template = query.where(EmailTemplate.organization_id == org_id)
                result = await db.execute(org_template)
                template = result.scalar_one_or_none()
                if not template:
                    query = query.where(EmailTemplate.is_system == True)
            else:
                query = query.where(EmailTemplate.is_system == True)

            result = await db.execute(query)
            template = result.scalar_one_or_none()

            if template:
                self._cache[cache_key] = {
                    "id": template.id,
                    "name": template.name,
                    "subject": template.subject_template,
                    "body_html": template.body_html_template,
                    "body_text": template.body_text_template,
                    "variables": template.variables,
                    "from_email": template.from_email,
                    "from_name": template.from_name,
                }
                return self._cache[cache_key]

            default_template = self._get_default_template(template_type)
            return default_template

    def _get_default_template(self, template_type: str) -> dict:
        defaults = {
            EmailTemplateType.INVITE.value: {
                "subject": "You've been invited to {{organization_name}}",
                "body_html": """
                    <h2>You've been invited!</h2>
                    <p>Hi {{invitee_name}},</p>
                    <p>{{inviter_name}} has invited you to join <strong>{{organization_name}}</strong> on Outflo.</p>
                    <p>{{personal_message}}</p>
                    <a href="{{invite_link}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">Accept Invitation</a>
                    <p style="color:#666;font-size:12px;margin-top:20px;">This invitation expires on {{expires_at}}.</p>
                """,
                "variables": ["organization_name", "inviter_name", "invitee_name", "personal_message", "invite_link", "expires_at"],
            },
            EmailTemplateType.PASSWORD_RESET.value: {
                "subject": "Reset your Outflo password",
                "body_html": """
                    <h2>Password Reset Request</h2>
                    <p>Hi {{user_name}},</p>
                    <p>We received a request to reset your Outflo password. Click the button below to set a new password:</p>
                    <a href="{{reset_link}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">Reset Password</a>
                    <p style="color:#666;font-size:12px;margin-top:20px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                """,
                "variables": ["user_name", "reset_link"],
            },
            EmailTemplateType.WELCOME.value: {
                "subject": "Welcome to Outflo!",
                "body_html": """
                    <h2>Welcome, {{user_name}}!</h2>
                    <p>Thanks for joining Outflo. Here's how to get started:</p>
                    <ol>
                        <li>Connect your email account</li>
                        <li>Import your first lead list</li>
                        <li>Create your first campaign</li>
                    </ol>
                    <a href="{{getting_started_url}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">Get Started</a>
                """,
                "variables": ["user_name", "getting_started_url"],
            },
            EmailTemplateType.CAMPAIGN_ALERT.value: {
                "subject": "{{campaign_name}}: {{alert_type}}",
                "body_html": """
                    <h2>Campaign Alert</h2>
                    <p>Hi {{user_name}},</p>
                    <p><strong>{{alert_type}}</strong> for your campaign <strong>{{campaign_name}}</strong>.</p>
                    <p>{{alert_details}}</p>
                    <a href="{{campaign_url}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">View Campaign</a>
                """,
                "variables": ["user_name", "campaign_name", "alert_type", "alert_details", "campaign_url"],
            },
            EmailTemplateType.MEETING_REMINDER.value: {
                "subject": "Meeting Reminder: {{meeting_title}}",
                "body_html": """
                    <h2>Meeting Reminder</h2>
                    <p>Hi {{user_name}},</p>
                    <p>You have a meeting coming up:</p>
                    <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
                        <p><strong>{{meeting_title}}</strong></p>
                        <p>{{meeting_time}}</p>
                        <p>{{meeting_location}}</p>
                    </div>
                    <a href="{{meeting_url}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">Join Meeting</a>
                """,
                "variables": ["user_name", "meeting_title", "meeting_time", "meeting_location", "meeting_url"],
            },
            EmailTemplateType.AI_RESULT.value: {
                "subject": "AI Task Completed: {{task_name}}",
                "body_html": """
                    <h2>AI Task Completed</h2>
                    <p>Hi {{user_name}},</p>
                    <p>Your AI task <strong>{{task_name}}</strong> has been completed.</p>
                    <p>{{result_summary}}</p>
                    <a href="{{result_url}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">View Results</a>
                """,
                "variables": ["user_name", "task_name", "result_summary", "result_url"],
            },
            EmailTemplateType.SCRAPING_RESULT.value: {
                "subject": "Scraping Job Complete: {{job_name}}",
                "body_html": """
                    <h2>Scraping Complete</h2>
                    <p>Hi {{user_name}},</p>
                    <p>Your scraping job <strong>{{job_name}}</strong> has finished.</p>
                    <p>Results: {{result_count}} items extracted</p>
                    <a href="{{result_url}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:white;text-decoration:none;border-radius:8px;">View Leads</a>
                """,
                "variables": ["user_name", "job_name", "result_count", "result_url"],
            },
        }
        return defaults.get(template_type, {
            "subject": "Notification from Outflo",
            "body_html": "<p>{{notification_message}}</p>",
            "variables": ["notification_message"],
        })

    async def render_template(
        self,
        template_type: str,
        variables: dict,
        org_id: Optional[int] = None,
    ) -> dict:
        template = await self.get_template(template_type, org_id)
        if not template:
            return {"subject": "", "body_html": "", "body_text": ""}

        return {
            "subject": self._renderer.render(template["subject"], variables),
            "body_html": self._renderer.render_html(template.get("body_html", ""), variables),
            "body_text": self._renderer.render_text(template.get("body_text", ""), variables),
            "from_email": template.get("from_email"),
            "from_name": template.get("from_name"),
        }

    async def send_templated_email(
        self,
        to_email: str,
        to_name: str,
        template_type: str,
        variables: dict,
        org_id: int,
    ) -> bool:
        from app.models.notification_models import EmailLog

        rendered = await self.render_template(template_type, variables, org_id)

        async with AsyncSessionLocal() as db:
            email_log = EmailLog(
                organization_id=org_id,
                to_email=to_email,
                subject=rendered["subject"],
                template_data=variables,
                status="pending",
            )
            db.add(email_log)
            await db.commit()

            try:
                from app.services.email import get_email_sender
                from app.schemas.email import SendEmailRequest

                sender = get_email_sender()
                request = SendEmailRequest(
                    to_email=to_email,
                    to_name=to_name,
                    subject=rendered["subject"],
                    body_html=rendered["body_html"],
                    body_text=rendered["body_text"],
                    track_opens=True,
                )

                config = {
                    "id": 0,
                    "email": rendered.get("from_email", "notifications@outflo.io"),
                    "from_email": rendered.get("from_email", "notifications@outflo.io"),
                    "from_name": rendered.get("from_name", "Outflo"),
                    "smtp_host": "smtp.postmarkapp.com",
                    "smtp_port": 587,
                    "smtp_username": "",
                    "smtp_password": "",
                    "smtp_encryption": "starttls",
                    "daily_limit": 1000,
                }

                result = await sender.send_email(request, config)
                email_log.status = "sent" if result.success else "failed"
                email_log.sent_at = datetime.utcnow()
                email_log.message_id = result.message_id
                email_log.error_message = result.error
                await db.commit()
                return result.success

            except Exception as e:
                logger.error(f"Failed to send templated email: {e}")
                email_log.status = "failed"
                email_log.error_message = str(e)
                await db.commit()
                return False


_notification_manager: Optional[NotificationManager] = None
_template_manager: Optional[EmailTemplateManager] = None


def get_notification_manager() -> NotificationManager:
    global _notification_manager
    if _notification_manager is None:
        _notification_manager = NotificationManager()
    return _notification_manager


def get_template_manager() -> EmailTemplateManager:
    global _template_manager
    if _template_manager is None:
        _template_manager = EmailTemplateManager()
    return _template_manager