"""
Outflo - Polling Architecture
WebSocket replacement using efficient polling
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, func

from app.db import AsyncSessionLocal

logger = logging.getLogger(__name__)


class PollingResource(str, Enum):
    NOTIFICATIONS = "notifications"
    CAMPAIGN_PROGRESS = "campaign_progress"
    SCRAPING_JOBS = "scraping_jobs"
    EMAIL_REPLIES = "email_replies"
    AI_TASKS = "ai_tasks"
    LEAD_UPDATES = "lead_updates"
    SEQUENCE_ENROLLMENTS = "sequence_enrollments"
    SYSTEM_HEALTH = "system_health"


@dataclass
class PollingEntry:
    resource_type: str
    resource_id: Optional[str]
    last_check: datetime
    last_update: Optional[datetime]
    version: int
    data: dict


@dataclass
class PollingUpdate:
    resource_type: str
    resource_id: Optional[str]
    has_updates: bool
    new_data: dict
    version: int
    timestamp: datetime


@dataclass
class PollingConfig:
    interval_seconds: int = 5
    batch_size: int = 50
    max_wait_seconds: int = 30
    cache_ttl_seconds: int = 60


class PollingStateManager:
    def __init__(self):
        self._states: dict[tuple[int, str], PollingEntry] = {}
        self._lock = asyncio.Lock()

    async def get_state(
        self, user_id: int, resource_type: str
    ) -> Optional[PollingEntry]:
        key = (user_id, resource_type)
        return self._states.get(key)

    async def update_state(
        self,
        user_id: int,
        resource_type: str,
        resource_id: Optional[str] = None,
        data: dict = None,
        version: int = 0,
    ):
        key = (user_id, resource_type)
        now = datetime.utcnow()

        async with self._lock:
            current = self._states.get(key)
            new_version = version if version > 0 else (current.version + 1 if current else 1)

            self._states[key] = PollingEntry(
                resource_type=resource_type,
                resource_id=resource_id,
                last_check=now,
                last_update=now if data else (current.last_update if current else None),
                version=new_version,
                data=data or (current.data if current else {}),
            )

    async def bulk_update(
        self, user_id: int, updates: list[dict]
    ):
        for update_data in updates:
            await self.update_state(
                user_id=user_id,
                resource_type=update_data["resource_type"],
                resource_id=update_data.get("resource_id"),
                data=update_data.get("data"),
                version=update_data.get("version", 0),
            )

    async def cleanup_old_states(self, max_age_seconds: int = 3600):
        cutoff = datetime.utcnow() - timedelta(seconds=max_age_seconds)
        async with self._lock:
            to_remove = [
                key for key, state in self._states.items()
                if state.last_check < cutoff
            ]
            for key in to_remove:
                del self._states[key]


class ResourcePoller:
    async def poll(
        self, user_id: int, last_version: int, since: datetime
    ) -> PollingUpdate:
        raise NotImplementedError


class NotificationPoller(ResourcePoller):
    async def poll(
        self, user_id: int, last_version: int, since: datetime
    ) -> PollingUpdate:
        async with AsyncSessionLocal() as db:
            from app.models.notification_models import Notification

            query = select(Notification).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.created_at > since,
                )
            ).order_by(Notification.created_at.desc())

            result = await db.execute(query)
            notifications = result.scalars().all()

            unread_result = await db.execute(
                select(func.count(Notification.id)).where(
                    and_(
                        Notification.user_id == user_id,
                        Notification.is_read == False,
                        Notification.is_dismissed == False,
                    )
                )
            )
            unread_count = unread_result.scalar() or 0

            has_updates = len(notifications) > 0 or unread_count > last_version

            return PollingUpdate(
                resource_type=PollingResource.NOTIFICATIONS,
                resource_id=None,
                has_updates=has_updates,
                new_data={
                    "notifications": [
                        {
                            "id": n.id,
                            "type": n.type,
                            "title": n.title,
                            "message": n.message,
                            "priority": n.priority,
                            "is_read": n.is_read,
                            "action_url": n.action_url,
                            "created_at": n.created_at.isoformat(),
                        }
                        for n in notifications[:20]
                    ],
                    "unread_count": unread_count,
                },
                version=unread_count,
                timestamp=datetime.utcnow(),
            )


class CampaignPoller(ResourcePoller):
    async def poll(
        self, user_id: int, last_version: int, since: datetime
    ) -> PollingUpdate:
        async with AsyncSessionLocal() as db:
            from app.models.models import Campaign, Email

            result = await db.execute(
                select(Campaign).where(
                    and_(
                        Campaign.created_by == user_id,
                        Campaign.updated_at > since,
                    )
                )
            )
            campaigns = result.scalars().all()

            updates = []
            for campaign in campaigns:
                email_result = await db.execute(
                    select(
                        func.count(Email.id),
                        func.sum(case((Email.sent_at.isnot(None), 1), else_=0)),
                        func.sum(case((Email.opened_at.isnot(None), 1), else_=0)),
                        func.sum(case((Email.replied_at.isnot(None), 1), else_=0)),
                    ).where(Email.campaign_id == campaign.id)
                )
                stats = email_result.one()

                updates.append({
                    "id": campaign.id,
                    "status": campaign.status,
                    "emails_sent": stats[1] or 0,
                    "emails_opened": stats[2] or 0,
                    "emails_replied": stats[3] or 0,
                    "updated_at": campaign.updated_at.isoformat() if campaign.updated_at else None,
                })

            return PollingUpdate(
                resource_type=PollingResource.CAMPAIGN_PROGRESS,
                resource_id=None,
                has_updates=len(updates) > 0,
                new_data={"campaigns": updates},
                version=len(updates),
                timestamp=datetime.utcnow(),
            )


class ScrapingJobPoller(ResourcePoller):
    async def poll(
        self, user_id: int, last_version: int, since: datetime
    ) -> PollingUpdate:
        async with AsyncSessionLocal() as db:
            from app.models.models import ScrapingJob

            result = await db.execute(
                select(ScrapingJob).where(
                    and_(
                        ScrapingJob.created_by == user_id,
                        ScrapingJob.updated_at > since,
                        ScrapingJob.status.in_(["pending", "running"]),
                    )
                )
            )
            jobs = result.scalars().all()

            job_updates = []
            for job in jobs:
                job_updates.append({
                    "id": job.id,
                    "type": job.type,
                    "status": job.status,
                    "progress": job.progress_percent or 0,
                    "processed": job.processed_items or 0,
                    "total": job.total_items or 0,
                    "successful": job.successful_items or 0,
                    "failed": job.failed_items or 0,
                    "updated_at": job.updated_at.isoformat() if job.updated_at else None,
                })

            return PollingUpdate(
                resource_type=PollingResource.SCRAPING_JOBS,
                resource_id=None,
                has_updates=len(job_updates) > 0,
                new_data={"jobs": job_updates},
                version=len(job_updates),
                timestamp=datetime.utcnow(),
            )


class EmailReplyPoller(ResourcePoller):
    async def poll(
        self, user_id: int, last_version: int, since: datetime
    ) -> PollingUpdate:
        async with AsyncSessionLocal() as db:
            from app.models.models import Email

            result = await db.execute(
                select(Email).where(
                    and_(
                        Email.created_by == user_id,
                        Email.replied_at.isnot(None),
                        Email.replied_at > since,
                    )
                )
            )
            replies = result.scalars().all()

            reply_data = [
                {
                    "id": e.id,
                    "to_email": e.to_email,
                    "subject": e.subject,
                    "replied_at": e.replied_at.isoformat() if e.replied_at else None,
                    "campaign_id": e.campaign_id,
                    "sequence_id": e.sequence_id,
                }
                for e in replies
            ]

            return PollingUpdate(
                resource_type=PollingResource.EMAIL_REPLIES,
                resource_id=None,
                has_updates=len(reply_data) > 0,
                new_data={"replies": reply_data},
                version=len(reply_data),
                timestamp=datetime.utcnow(),
            )


class PollingEngine:
    def __init__(self, config: PollingConfig = None):
        self.config = config or PollingConfig()
        self.state_manager = PollingStateManager()
        self._pollers: dict[str, ResourcePoller] = {}
        self._user_polls: dict[int, asyncio.Task] = {}
        self._callbacks: dict[str, list[Callable]] = {}

    def register_poller(self, resource_type: str, poller: ResourcePoller):
        self._pollers[resource_type] = poller

    def subscribe(self, resource_type: str, callback: Callable):
        if resource_type not in self._callbacks:
            self._callbacks[resource_type] = []
        self._callbacks[resource_type].append(callback)

    async def poll_resources(
        self,
        user_id: int,
        resource_types: list[str],
        since: datetime,
        version: int = 0,
    ) -> list[PollingUpdate]:
        updates = []
        for resource_type in resource_types:
            poller = self._pollers.get(resource_type)
            if poller:
                try:
                    update = await poller.poll(user_id, version, since)
                    await self.state_manager.update_state(
                        user_id, resource_type, data=update.new_data, version=update.version
                    )
                    updates.append(update)
                except Exception as e:
                    logger.error(f"Polling error for {resource_type}: {e}")

        return updates

    async def get_updates_since(
        self, user_id: int, resource_types: list[str], since: datetime
    ) -> PollingUpdate:
        updates = await self.poll_resources(user_id, resource_types, since)
        if not updates:
            return PollingUpdate(
                resource_type="batch",
                resource_id=None,
                has_updates=False,
                new_data={},
                version=0,
                timestamp=datetime.utcnow(),
            )

        combined_data = {}
        counts = {}
        for update in updates:
            combined_data[update.resource_type] = update.new_data
            counts[update.resource_type] = update.version

        return PollingUpdate(
            resource_type="batch",
            resource_id=None,
            has_updates=any(u.has_updates for u in updates),
            new_data=combined_data,
            version=sum(u.version for u in updates),
            timestamp=datetime.utcnow(),
        )

    def get_counts(self, data: dict) -> dict:
        counts = {}
        if "notifications" in data:
            counts["unread_notifications"] = data["notifications"].get("unread_count", 0)
        if "campaigns" in data:
            counts["active_campaigns"] = len(data["campaigns"].get("campaigns", []))
        if "jobs" in data:
            running = [j for j in data["jobs"].get("jobs", []) if j.get("status") == "running"]
            counts["running_jobs"] = len(running)
        if "replies" in data:
            counts["new_replies"] = len(data["replies"].get("replies", []))
        return counts


_polling_engine: Optional[PollingEngine] = None


def get_polling_engine() -> PollingEngine:
    global _polling_engine
    if _polling_engine is None:
        _polling_engine = PollingEngine()
        _polling_engine.register_poller(
            PollingResource.NOTIFICATIONS, NotificationPoller()
        )
        _polling_engine.register_poller(
            PollingResource.CAMPAIGN_PROGRESS, CampaignPoller()
        )
        _polling_engine.register_poller(
            PollingResource.SCRAPING_JOBS, ScrapingJobPoller()
        )
        _polling_engine.register_poller(
            PollingResource.EMAIL_REPLIES, EmailReplyPoller()
        )
    return _polling_engine