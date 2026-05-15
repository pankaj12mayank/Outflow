"""
Email Models (MongoDB)
Simplified models for MongoDB
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class BouncedEmail(BaseModel):
    id: Optional[str] = None
    organization_id: str
    email: str
    account_id: Optional[str] = None
    bounce_type: str
    reason: Optional[str] = None
    bounce_count: int = 1
    first_bounce_at: datetime = None
    last_bounce_at: datetime = None
    lead_id: Optional[str] = None
    campaign_id: Optional[str] = None


class EmailOpen(BaseModel):
    id: Optional[str] = None
    organization_id: str
    email_message_id: str
    lead_id: Optional[str] = None
    opened_at: datetime = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class EmailReply(BaseModel):
    id: Optional[str] = None
    organization_id: str
    email_message_id: str
    lead_id: Optional[str] = None
    reply_text: str
    replied_at: datetime = None


class Email(BaseModel):
    id: Optional[str] = None
    organization_id: str
    campaign_id: Optional[str] = None
    lead_id: Optional[str] = None
    from_email: str
    to_email: str
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    status: str = "pending"
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None