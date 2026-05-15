from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class NotificationType(str, Enum):
    CAMPAIGN = "campaign"
    LEAD = "lead"
    EMAIL = "email"
    AI = "ai"
    SCRAPING = "scraping"
    MEETING = "meeting"
    TEAM = "team"
    SYSTEM = "system"
    BILLING = "billing"
    SECURITY = "security"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationEvent(str, Enum):
    CAMPAIGN_STARTED = "campaign.started"
    CAMPAIGN_COMPLETED = "campaign.completed"
    CAMPAIGN_PAUSED = "campaign.paused"
    CAMPAIGN_FAILED = "campaign.failed"

    EMAIL_SENT = "email.sent"
    EMAIL_REPLIED = "email.replied"
    EMAIL_BOUNCED = "email.bounced"

    LEAD_ADDED = "lead.added"
    LEAD_ENRICHED = "lead.enriched"
    LEAD_SCORE_CHANGED = "lead.score_changed"

    AI_COMPLETED = "ai.completed"
    AI_FAILED = "ai.failed"

    SCRAPING_STARTED = "scraping.started"
    SCRAPING_PROGRESS = "scraping.progress"
    SCRAPING_COMPLETED = "scraping.completed"
    SCRAPING_FAILED = "scraping.failed"

    MEETING_BOOKED = "meeting.booked"
    MEETING_REMINDER = "meeting.reminder"
    MEETING_CANCELLED = "meeting.cancelled"

    TEAM_INVITATION = "team.invitation"
    TEAM_MEMBER_JOINED = "team.member_joined"

    SYSTEM_ALERT = "system.alert"
    SYSTEM_MAINTENANCE = "system.maintenance"


class EmailTemplateType(str, Enum):
    INVITE = "invite"
    PASSWORD_RESET = "password_reset"
    WELCOME = "welcome"
    ONBOARDING = "onboarding"
    CAMPAIGN_ALERT = "campaign_alert"
    MEETING_REMINDER = "meeting_reminder"
    MEETING_CONFIRMATION = "meeting_confirmation"
    DIGEST = "digest"
    REPORT = "report"
    AI_RESULT = "ai_result"
    SCRAPING_RESULT = "scraping_result"


class NotificationCreate(BaseModel):
    user_id: int
    type: NotificationType
    title: str
    message: Optional[str] = None
    description: Optional[str] = None
    priority: NotificationPriority = NotificationPriority.NORMAL
    data: dict = Field(default_factory=dict)
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    send_email: bool = False
    email_template: Optional[str] = None


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_dismissed: Optional[bool] = None


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: Optional[str]
    description: Optional[str]
    priority: str
    is_read: bool
    data: dict
    action_url: Optional[str]
    action_label: Optional[str]
    created_at: datetime


class NotificationPreferencesUpdate(BaseModel):
    category: str
    event_type: str
    in_app_enabled: Optional[bool] = True
    email_enabled: Optional[bool] = True
    push_enabled: Optional[bool] = False
    email_frequency: Optional[str] = "instant"
    min_priority: Optional[str] = "normal"


class NotificationPreferencesResponse(BaseModel):
    preferences: list[dict]
    defaults: dict


class EmailTemplateCreate(BaseModel):
    name: str
    slug: str
    template_type: EmailTemplateType
    subject_template: str
    body_html_template: Optional[str] = None
    body_text_template: Optional[str] = None
    variables: list[str] = Field(default_factory=list)
    track_opens: bool = True
    track_clicks: bool = True
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject_template: Optional[str] = None
    body_html_template: Optional[str] = None
    body_text_template: Optional[str] = None
    variables: Optional[list[str]] = None
    track_opens: Optional[bool] = None
    track_clicks: Optional[bool] = None
    is_active: Optional[bool] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    slug: str
    template_type: str
    subject_template: str
    body_html_template: Optional[str]
    body_text_template: Optional[str]
    variables: list[str]
    track_opens: bool
    track_clicks: bool
    is_active: bool
    usage_count: int
    created_at: datetime


class PollingRequest(BaseModel):
    resources: list[dict] = Field(default_factory=list)


class PollingResponse(BaseModel):
    updates: list[dict]
    counts: dict
    timestamp: datetime


class NotificationCounts(BaseModel):
    total: int
    unread: int
    urgent: int
    by_type: dict
    by_priority: dict


class NotificationBatchRequest(BaseModel):
    user_ids: list[int]
    template_type: EmailTemplateType
    subject: str
    body: str
    variables: dict = Field(default_factory=dict)
    schedule: Optional[str] = "instant"
    scheduled_at: Optional[datetime] = None


class NotificationDigestRequest(BaseModel):
    user_ids: list[int]
    digest_type: str
    period: str
    include_stats: bool = True