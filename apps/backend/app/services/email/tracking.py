"""
Outflo - Email Tracking Service (MongoDB)
Open, click, bounce, reply tracking
"""

import asyncio
import logging
import re
import hashlib
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from enum import Enum

from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

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


def _emails_coll():
    return MongoDB.get_collection("emails")


def _logs_coll():
    return MongoDB.get_collection("email_logs")


async def _find_email_by_message_id(message_id: str) -> Optional[dict]:
    return await _emails_coll().find_one({"message_id": message_id})


async def _append_email_log(org_id, email_id, event_type: str, event_data: dict):
    await _logs_coll().insert_one({
        "organization_id": str(org_id),
        "email_id": str(email_id),
        "event_type": event_type,
        "event_data": event_data,
        "created_at": datetime.utcnow(),
    })


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
        self._lock = asyncio.Lock()

    async def track_open(self, tracking_data: TrackingData) -> tuple[bool, str]:
        async with self._lock:
            try:
                email = await _find_email_by_message_id(tracking_data.message_id)
                if not email:
                    return False, "Email not found"
                if email.get("opened_at"):
                    return True, "Already tracked"
                now = datetime.utcnow()
                await _emails_coll().update_one(
                    {"_id": email["_id"]},
                    {"$set": {"opened_at": now, "updated_at": now}},
                )
                await _append_email_log(
                    tracking_data.org_id,
                    email["_id"],
                    TrackingEvent.OPENED,
                    {"message_id": tracking_data.message_id},
                )
                return True, "Tracked"
            except Exception as e:
                logger.error(f"Failed to track open: {e}")
                return False, str(e)

    async def track_click(self, tracking_data: TrackingData, clicked_url: str) -> tuple[bool, str]:
        async with self._lock:
            try:
                email = await _find_email_by_message_id(tracking_data.message_id)
                if not email:
                    return False, "Email not found"
                now = datetime.utcnow()
                if not email.get("clicked_at"):
                    await _emails_coll().update_one(
                        {"_id": email["_id"]},
                        {"$set": {"clicked_at": now, "updated_at": now}},
                    )
                await _append_email_log(
                    tracking_data.org_id,
                    email["_id"],
                    TrackingEvent.CLICKED,
                    {"message_id": tracking_data.message_id, "clicked_url": clicked_url},
                )
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
                email = await _find_email_by_message_id(tracking_data.message_id)
                lead_id = email.get("lead_id") if email else tracking_data.lead_id
                bounced_coll = MongoDB.get_collection("bounced_emails")
                await bounced_coll.insert_one({
                    "organization_id": str(tracking_data.org_id),
                    "email": tracking_data.message_id,
                    "bounce_type": bounce_type,
                    "reason": reason,
                    "bounce_count": 1,
                    "created_at": datetime.utcnow(),
                })
                if lead_id:
                    await MongoDB.get_collection("leads").update_one(
                        {"_id": ObjectId(str(lead_id))} if ObjectId.is_valid(str(lead_id)) else {"_id": lead_id},
                        {"$set": {"is_valid_email": False, "updated_at": datetime.utcnow()}},
                    )
                if email:
                    now = datetime.utcnow()
                    await _emails_coll().update_one(
                        {"_id": email["_id"]},
                        {"$set": {"bounced_at": now, "updated_at": now}},
                    )
                    await _append_email_log(
                        tracking_data.org_id,
                        email["_id"],
                        TrackingEvent.BOUNCED,
                        {"bounce_type": bounce_type, "reason": reason},
                    )
                return True
            except Exception as e:
                logger.error(f"Failed to record bounce: {e}")
                return False

    async def record_complaint(self, tracking_data: TrackingData, complaint_type: str = "spam") -> bool:
        async with self._lock:
            try:
                email = await _find_email_by_message_id(tracking_data.message_id)
                if email:
                    now = datetime.utcnow()
                    await _emails_coll().update_one(
                        {"_id": email["_id"]},
                        {"$set": {"unsubscribed_at": now, "updated_at": now}},
                    )
                    await _append_email_log(
                        tracking_data.org_id,
                        email["_id"],
                        TrackingEvent.COMPLAINED,
                        {"complaint_type": complaint_type},
                    )
                if tracking_data.lead_id:
                    await MongoDB.get_collection("leads").update_one(
                        {"_id": ObjectId(str(tracking_data.lead_id))} if ObjectId.is_valid(str(tracking_data.lead_id)) else {"_id": tracking_data.lead_id},
                        {"$set": {"is_valid_email": False}},
                    )
                return True
            except Exception as e:
                logger.error(f"Failed to record complaint: {e}")
                return False

    async def record_unsubscribe(self, tracking_data: TrackingData, source: str = "link") -> bool:
        async with self._lock:
            try:
                email = await _find_email_by_message_id(tracking_data.message_id)
                unsub_coll = MongoDB.get_collection("unsubscribed_emails")
                await unsub_coll.insert_one({
                    "organization_id": str(tracking_data.org_id),
                    "email": email.get("to_email") if email else "",
                    "source": source,
                    "unsubscribed_at": datetime.utcnow(),
                })
                if email:
                    now = datetime.utcnow()
                    await _emails_coll().update_one(
                        {"_id": email["_id"]},
                        {"$set": {"unsubscribed_at": now, "updated_at": now}},
                    )
                    await _append_email_log(
                        tracking_data.org_id,
                        email["_id"],
                        TrackingEvent.UNSUBSCRIBED,
                        {"source": source},
                    )
                if tracking_data.lead_id:
                    await MongoDB.get_collection("leads").update_one(
                        {"_id": ObjectId(str(tracking_data.lead_id))} if ObjectId.is_valid(str(tracking_data.lead_id)) else {"_id": tracking_data.lead_id},
                        {"$set": {"is_valid_email": False}},
                    )
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
        ]
        body_lower = body.lower()
        return any(re.search(pattern, body_lower) for pattern in auto_reply_patterns)


class EmailAnalytics:
    async def get_email_stats(self, email_id: str) -> dict:
        try:
            oid = ObjectId(email_id)
        except Exception:
            return {}
        email = await _emails_coll().find_one({"_id": oid})
        if not email:
            return {}
        logs = await _logs_coll().find({"email_id": str(email_id)}).to_list(length=100)
        event_counts: dict = {}
        for log in logs:
            et = log.get("event_type")
            event_counts[et] = event_counts.get(et, 0) + 1
        return {
            "sent": email.get("sent_at") is not None,
            "delivered": email.get("sent_at") is not None and email.get("bounced_at") is None,
            "opened": email.get("opened_at") is not None,
            "clicked": email.get("clicked_at") is not None,
            "replied": email.get("replied_at") is not None,
            "bounced": email.get("bounced_at") is not None,
            "unsubscribed": email.get("unsubscribed_at") is not None,
            "events": event_counts,
        }

    async def get_campaign_stats(self, campaign_id: str) -> dict:
        cursor = _emails_coll().find({"campaign_id": str(campaign_id)})
        emails = await cursor.to_list(length=10000)
        total = len(emails)
        sent = sum(1 for e in emails if e.get("sent_at"))
        delivered = sum(1 for e in emails if e.get("sent_at") and not e.get("bounced_at"))
        opened = sum(1 for e in emails if e.get("opened_at"))
        clicked = sum(1 for e in emails if e.get("clicked_at"))
        replied = sum(1 for e in emails if e.get("replied_at"))
        bounced = sum(1 for e in emails if e.get("bounced_at"))
        return {
            "campaign_id": campaign_id,
            "total_emails": total,
            "sent": sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "replied": replied,
            "bounced": bounced,
            "delivery_rate": delivered / sent if sent else 0,
            "open_rate": opened / delivered if delivered else 0,
            "click_rate": clicked / delivered if delivered else 0,
            "reply_rate": replied / delivered if delivered else 0,
            "bounce_rate": bounced / sent if sent else 0,
        }

    async def get_sequence_stats(self, sequence_id: str) -> dict:
        cursor = _emails_coll().find({"sequence_id": str(sequence_id)})
        emails = await cursor.to_list(length=10000)
        total = len(emails)
        sent = sum(1 for e in emails if e.get("sent_at"))
        opened = sum(1 for e in emails if e.get("opened_at"))
        replied = sum(1 for e in emails if e.get("replied_at"))
        step_stats: dict = {}
        for email in emails:
            step = email.get("sequence_step") or 0
            if step not in step_stats:
                step_stats[step] = {"total": 0, "sent": 0, "opened": 0, "replied": 0}
            step_stats[step]["total"] += 1
            if email.get("sent_at"):
                step_stats[step]["sent"] += 1
            if email.get("opened_at"):
                step_stats[step]["opened"] += 1
            if email.get("replied_at"):
                step_stats[step]["replied"] += 1
        return {
            "sequence_id": sequence_id,
            "total_emails": total,
            "sent": sent,
            "opened": opened,
            "replied": replied,
            "open_rate": opened / sent if sent else 0,
            "reply_rate": replied / sent if sent else 0,
            "step_stats": step_stats,
        }

    async def get_lead_journey(self, lead_id: str) -> list[dict]:
        cursor = _emails_coll().find({"lead_id": str(lead_id)}).sort("sent_at", 1)
        emails = await cursor.to_list(length=500)
        journey = []
        for email in emails:
            doc = serialize_doc(email)
            journey.append({
                "email_id": doc.get("id"),
                "message_id": email.get("message_id"),
                "subject": email.get("subject"),
                "sent_at": email.get("sent_at").isoformat() if isinstance(email.get("sent_at"), datetime) else email.get("sent_at"),
                "opened": email.get("opened_at") is not None,
                "clicked": email.get("clicked_at") is not None,
                "replied": email.get("replied_at") is not None,
                "campaign_id": email.get("campaign_id"),
                "sequence_id": email.get("sequence_id"),
                "sequence_step": email.get("sequence_step"),
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
