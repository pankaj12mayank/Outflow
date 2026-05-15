"""
Campaign Models (MongoDB)
Simplified models for MongoDB
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class CampaignType(str, Enum):
    COLD_OUTREACH = "cold_outreach"
    FOLLOW_UP = "follow_up"
    NURTURE = "nurture"
    REENGAGEMENT = "reengagement"
    EVENT = "event"
    PRODUCT_LAUNCH = "product_launch"


class SequenceStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class SequenceStepType(str, Enum):
    EMAIL = "email"
    WAIT = "wait"
    CONDITION = "condition"
    TASK = "task"


class CampaignLead(BaseModel):
    id: Optional[str] = None
    campaign_id: str
    lead_id: str
    status: str = "pending"
    enrolled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class EmailTemplate(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    slug: str
    subject_template: str
    body_html_template: Optional[str] = None
    body_text_template: Optional[str] = None
    template_type: str = "custom"
    variables: List[str] = []
    is_active: bool = True
    is_system: bool = False
    usage_count: int = 0


class EmailAccount(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: str
    email: str
    provider: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_encryption: str = "starttls"
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    daily_limit: int = 500
    used_today: int = 0
    is_active: bool = True
    is_verified: bool = False