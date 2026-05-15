"""
Outflo - Email Tracking Service
Open, click, bounce, reply tracking
"""

import asyncio
import logging
import re
import hashlib
from datetime import datetime, timedelta
from typing import Optional, AsyncIterator
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, func
from sqlalchemy.orm import selectinload

from app.db import AsyncSessionLocal

logger = logging.getLogger(__name__)


class TrackingEvent(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    COMPLAINED = "complained"
    UNSUBSCRIBED = "unsubscribed"
    AUTO_REPLY = "auto_reply"


@dataclass
class TrackingData:
    message_id: str
    lead_id: Optional[int]
    campaign_id: Optional[int]
    sequence_id: Optional[int]
    sequence_step: Optional[int]
    account_id: int
    org_id: int


class TrackingPixelGenerator:
    def __init__(self, tracking_domain: str = "tracking.outflo.io"):
        self.tracking_domain = tracking_domain

    def generate_pixel_url(self, tracking_data: TrackingData) -> str:
        encoded = self._encode_tracking_data(tracking_data)
        return f"https://{self.tracking_domain}/p/{encoded}"

    def generate_click_url(self, original_url: str, tracking_data: TrackingData) -> str:
        encoded = self._encode_tracking_data(tracking_data)
        return f"https://{self.tracking_domain}/c?url={original_url}&t={encoded}"

    def _encode_tracking_data(self, data: TrackingData) -> str:
        raw = f"{data.message_id}:{data.lead_id}:{data.org_id}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


class EmailTracker:
    def __init__(self):
        self._processing = False
        self._pending_events: list[dict] = []
        self._lock = asyncio.Lock()

    async def track_open(self, tracking_data: TrackingData) -> tuple[bool, str]:
        async with self._lock:
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.models import Email, EmailLog, EmailAccount
                    from sqlalchemy import update

                    email_result = await db.execute(
                        select(Email).where(Email.message_id == tracking_data.message_id)
                    )
                    email = email_result.scalar_one_or_none()

                    if not email:
                        logger.warning(f"Email not found for tracking: {tracking_data.message_id}")
                        return False, "Email not found"

                    if email.opened_at is not None:
                        return True, "Already tracked"

                    await db.execute(
                        update(Email)
                        .where(Email.id == email.id)
                        .values(opened_at=datetime.utcnow())
                    )

                    log = EmailLog(
                        organization_id=tracking_data.org_id,
                        email_id=email.id,
                        event_type=TrackingEvent.OPENED,
                        event_data={"message_id": tracking_data.message_id},
                    )
                    db.add(log)
                    await db.commit()

                    return True, "Tracked"

            except Exception as e:
                logger.error(f"Failed to track open: {e}")
                return False, str(e)

    async def track_click(
        self, tracking_data: TrackingData, clicked_url: str
    ) -> tuple[bool, str]:
        async with self._lock:
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.models import Email, EmailLog

                    email_result = await db.execute(
                        select(Email).where(Email.message_id == tracking_data.message_id)
                    )
                    email = email_result.scalar_one_or_none()

                    if not email:
                        return False, "Email not found"

                    if email.clicked_at is None:
                        await db.execute(
                            update(Email)
                            .where(Email.id == email.id)
                            .values(clicked_at=datetime.utcnow())
                        )

                    log = EmailLog(
                        organization_id=tracking_data.org_id,
                        email_id=email.id,
                        event_type=TrackingEvent.CLICKED,
                        event_data={
                            "message_id": tracking_data.message_id,
                            "clicked_url": clicked_url,
                        },
                    )
                    db.add(log)
                    await db.commit()

                    return True, "Tracked"

            except Exception as e:
                logger.error(f"Failed to track click: {e}")
                return False, str(e)

    async def record_bounce(
        self,
        tracking_data: TrackingData,
        bounce_type: str,
        reason: str,
    ) -> bool:
        async with self._lock:
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.models import Email, EmailLog, BouncedEmail, Lead

                    email_result = await db.execute(
                        select(Email).where(Email.message_id == tracking_data.message_id)
                    )
                    email = email_result.scalar_one_or_none()

                    if not email:
                        lead_id = tracking_data.lead_id
                    else:
                        lead_id = email.lead_id

                    bounce_record = BouncedEmail(
                        organization_id=tracking_data.org_id,
                        email=tracking_data.message_id.split("@")[0] if "@" in tracking_data.message_id else "",
                        bounce_type=bounce_type,
                        reason=reason,
                        bounce_count=1,
                    )
                    db.add(bounce_record)

                    if lead_id:
                        await db.execute(
                            update(Lead)
                            .where(Lead.id == lead_id)
                            .values(is_valid_email=False)
                        )

                    if email:
                        await db.execute(
                            update(Email)
                            .where(Email.id == email.id)
                            .values(bounced_at=datetime.utcnow())
                        )

                        log = EmailLog(
                            organization_id=tracking_data.org_id,
                            email_id=email.id,
                            event_type=TrackingEvent.BOUNCED,
                            event_data={"bounce_type": bounce_type, "reason": reason},
                        )
                        db.add(log)

                    await db.commit()
                    return True

            except Exception as e:
                logger.error(f"Failed to record bounce: {e}")
                return False

    async def record_complaint(
        self, tracking_data: TrackingData, complaint_type: str = "spam"
    ) -> bool:
        async with self._lock:
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.models import Email, EmailLog, Lead

                    email_result = await db.execute(
                        select(Email).where(Email.message_id == tracking_data.message_id)
                    )
                    email = email_result.scalar_one_or_none()

                    if email:
                        await db.execute(
                            update(Email)
                            .where(Email.id == email.id)
                            .values(unsubscribed_at=datetime.utcnow())
                        )

                        log = EmailLog(
                            organization_id=tracking_data.org_id,
                            email_id=email.id,
                            event_type=TrackingEvent.COMPLAINED,
                            event_data={"complaint_type": complaint_type},
                        )
                        db.add(log)

                    if tracking_data.lead_id:
                        await db.execute(
                            update(Lead)
                            .where(Lead.id == tracking_data.lead_id)
                            .values(is_valid_email=False)
                        )

                    await db.commit()
                    return True

            except Exception as e:
                logger.error(f"Failed to record complaint: {e}")
                return False

    async def record_unsubscribe(
        self, tracking_data: TrackingData, source: str = "link"
    ) -> bool:
        async with self._lock:
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.models import Email, EmailLog, Lead, UnsubscribedEmail

                    email_result = await db.execute(
                        select(Email).where(Email.message_id == tracking_data.message_id)
                    )
                    email = email_result.scalar_one_or_none()

                    unsub = UnsubscribedEmail(
                        organization_id=tracking_data.org_id,
                        email=email.to_email if email else "",
                        source=source,
                        unsubscribed_at=datetime.utcnow(),
                    )
                    db.add(unsub)

                    if email:
                        await db.execute(
                            update(Email)
                            .where(Email.id == email.id)
                            .values(unsubscribed_at=datetime.utcnow())
                        )

                        log = EmailLog(
                            organization_id=tracking_data.org_id,
                            email_id=email.id,
                            event_type=TrackingEvent.UNSUBSCRIBED,
                            event_data={"source": source},
                        )
                        db.add(log)

                    if tracking_data.lead_id:
                        await db.execute(
                            update(Lead)
                            .where(Lead.id == tracking_data.lead_id)
                            .values(is_valid_email=False)
                        )

                    await db.commit()
                    return True

            except Exception as e:
                logger.error(f"Failed to record unsubscribe: {e}")
                return False

    async def detect_auto_reply(self, body: str) -> bool:
        auto_reply_patterns = [
            r"auto.?reply",
            r"out.?of.?office",
            r"vacation",
            r"currently.?away",
            r"not.?available",
            r"收到邮件",
            r"不在办公室",
        ]
        body_lower = body.lower()
        return any(re.search(pattern, body_lower) for pattern in auto_reply_patterns)


class EmailAnalytics:
    def __init__(self):
        self._cache: dict = {}
        self._cache_ttl = 300

    async def get_email_stats(self, email_id: int) -> dict:
        async with AsyncSessionLocal() as db:
            from app.models.models import Email, EmailLog

            email_result = await db.execute(select(Email).where(Email.id == email_id))
            email = email_result.scalar_one_or_none()

            if not email:
                return {}

            logs_result = await db.execute(
                select(EmailLog).where(EmailLog.email_id == email_id)
            )
            logs = logs_result.scalars().all()

            stats = {
                "sent": False,
                "delivered": False,
                "opened": email.opened_at is not None,
                "clicked": email.clicked_at is not None,
                "replied": email.replied_at is not None,
                "bounced": email.bounced_at is not None,
                "unsubscribed": email.unsubscribed_at is not None,
                "sent_at": email.sent_at.isoformat() if email.sent_at else None,
                "opened_at": email.opened_at.isoformat() if email.opened_at else None,
                "clicked_at": email.clicked_at.isoformat() if email.clicked_at else None,
                "replied_at": email.replied_at.isoformat() if email.replied_at else None,
            }

            event_counts = {}
            for log in logs:
                event_type = log.event_type
                event_counts[event_type] = event_counts.get(event_type, 0) + 1

            stats["events"] = event_counts
            return stats

    async def get_campaign_stats(self, campaign_id: int) -> dict:
        async with AsyncSessionLocal() as db:
            from app.models.models import Email, Campaign

            campaign_result = await db.execute(
                select(Campaign).where(Campaign.id == campaign_id)
            )
            campaign = campaign_result.scalar_one_or_none()

            if not campaign:
                return {}

            emails_result = await db.execute(
                select(Email).where(Email.campaign_id == campaign_id)
            )
            emails = emails_result.scalars().all()

            total = len(emails)
            sent = sum(1 for e in emails if e.sent_at is not None)
            delivered = sum(1 for e in emails if e.sent_at is not None and e.bounced_at is None)
            opened = sum(1 for e in emails if e.opened_at is not None)
            clicked = sum(1 for e in emails if e.clicked_at is not None)
            replied = sum(1 for e in emails if e.replied_at is not None)
            bounced = sum(1 for e in emails if e.bounced_at is not None)

            return {
                "campaign_id": campaign_id,
                "total_emails": total,
                "sent": sent,
                "delivered": delivered,
                "opened": opened,
                "clicked": clicked,
                "replied": replied,
                "bounced": bounced,
                "delivery_rate": delivered / sent if sent > 0 else 0,
                "open_rate": opened / delivered if delivered > 0 else 0,
                "click_rate": clicked / delivered if delivered > 0 else 0,
                "reply_rate": replied / delivered if delivered > 0 else 0,
                "bounce_rate": bounced / sent if sent > 0 else 0,
            }

    async def get_sequence_stats(self, sequence_id: int) -> dict:
        async with AsyncSessionLocal() as db:
            from app.models.models import Email

            emails_result = await db.execute(
                select(Email).where(Email.sequence_id == sequence_id)
            )
            emails = emails_result.scalars().all()

            total = len(emails)
            sent = sum(1 for e in emails if e.sent_at is not None)
            opened = sum(1 for e in emails if e.opened_at is not None)
            replied = sum(1 for e in emails if e.replied_at is not None)

            step_stats = {}
            for email in emails:
                step = email.sequence_step or 0
                if step not in step_stats:
                    step_stats[step] = {"total": 0, "sent": 0, "opened": 0, "replied": 0}
                step_stats[step]["total"] += 1
                if email.sent_at:
                    step_stats[step]["sent"] += 1
                if email.opened_at:
                    step_stats[step]["opened"] += 1
                if email.replied_at:
                    step_stats[step]["replied"] += 1

            return {
                "sequence_id": sequence_id,
                "total_emails": total,
                "sent": sent,
                "opened": opened,
                "replied": replied,
                "open_rate": opened / sent if sent > 0 else 0,
                "reply_rate": replied / sent if sent > 0 else 0,
                "step_stats": step_stats,
            }

    async def get_lead_journey(self, lead_id: int) -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.models import Email, EmailLog

            emails_result = await db.execute(
                select(Email)
                .where(Email.lead_id == lead_id)
                .order_by(Email.sent_at)
            )
            emails = emails_result.scalars().all()

            journey = []
            for email in emails:
                journey.append({
                    "email_id": email.id,
                    "message_id": email.message_id,
                    "subject": email.subject,
                    "sent_at": email.sent_at.isoformat() if email.sent_at else None,
                    "opened": email.opened_at is not None,
                    "clicked": email.clicked_at is not None,
                    "replied": email.replied_at is not None,
                    "campaign_id": email.campaign_id,
                    "sequence_id": email.sequence_id,
                    "sequence_step": email.sequence_step,
                })

            return journey


_email_tracker: Optional[EmailTracker] = None


def get_email_tracker() -> EmailTracker:
    global _email_tracker
    if _email_tracker is None:
        _email_tracker = EmailTracker()
    return _email_tracker


def get_tracking_pixel_generator() -> TrackingPixelGenerator:
    return TrackingPixelGenerator()


def get_email_analytics() -> EmailAnalytics:
    return EmailAnalytics()