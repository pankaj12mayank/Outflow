"""
Email Engine Data Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class EmailTemplateStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"
    ARCHIVED = "archived"


class TriggerEventType(str, Enum):
    # Auth Events
    WELCOME = "welcome"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGED = "password_changed"
    SUSPICIOUS_LOGIN = "suspicious_login"
    MAGIC_LOGIN = "magic_login"
    ACCOUNT_LOCKED = "account_locked"
    TEAM_INVITATION = "team_invitation"
    
    # Billing Events
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    INVOICE_GENERATED = "invoice_generated"
    PLAN_UPGRADED = "plan_upgraded"
    PLAN_DOWNGRADED = "plan_downgraded"
    TRIAL_STARTED = "trial_started"
    TRIAL_ENDING = "trial_ending"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    USAGE_LIMIT_REACHED = "usage_limit_reached"
    
    # Outreach Events
    COLD_OUTREACH = "cold_outreach"
    FOLLOW_UP_1 = "follow_up_1"
    FOLLOW_UP_2 = "follow_up_2"
    FINAL_BUMP = "final_bump"
    RE_ENGAGEMENT = "re_engagement"
    PROPOSAL_SENT = "proposal_sent"
    AUDIT_OFFER = "audit_offer"
    DEMO_INVITATION = "demo_invitation"
    
    # AI Reply Events
    INTERESTED_LEAD = "interested_lead"
    PRICING_INQUIRY = "pricing_inquiry"
    MEETING_REQUEST = "meeting_request"
    MAYBE_LATER = "maybe_later"
    OUT_OF_OFFICE = "out_of_office"
    FOLLOW_UP_REMINDER = "follow_up_reminder"
    
    # Meeting Events
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_REMINDER = "meeting_reminder"
    MEETING_CANCELLED = "meeting_cancelled"
    MEETING_RESCHEDULED = "meeting_rescheduled"
    MISSED_MEETING = "missed_meeting"
    POST_MEETING_FOLLOWUP = "post_meeting_followup"
    
    # CRM Events
    LEAD_ASSIGNED = "lead_assigned"
    PIPELINE_UPDATED = "pipeline_updated"
    TASK_REMINDER = "task_reminder"
    INTERNAL_NOTIFICATION = "internal_notification"
    
    # System Owner Events
    NEW_ORGANIZATION_SIGNUP = "new_organization_signup"
    HIGH_USAGE_ALERT = "high_usage_alert"
    ABUSE_DETECTION = "abuse_detection"
    SMTP_FAILURE = "smtp_failure"
    SCRAPING_FAILURE = "scraping_failure"
    AI_GENERATION_FAILURE = "ai_generation_failure"
    QUEUE_FAILURE = "queue_failure"
    REVENUE_SUMMARY = "revenue_summary"
    
    # Failure Events
    CAMPAIGN_PAUSED = "campaign_paused"
    BOUNCE_THRESHOLD_REACHED = "bounce_threshold_reached"
    INBOX_DISCONNECTED = "inbox_disconnected"
    EMAIL_SENDING_FAILED = "email_sending_failed"
    AI_PROVIDER_FAILED = "ai_provider_failed"
    SCRAPE_FAILED = "scrape_failed"


class EmailQueueStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    RETRIED = "retried"
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"


class EmailLogStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    SPAM = "spam"
    UNSUBSCRIBED = "unsubscribed"
    FAILED = "failed"


class TriggerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PAUSED = "paused"


# Template Models
class EmailTemplate(BaseModel):
    id: Optional[str] = None
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    status: EmailTemplateStatus = EmailTemplateStatus.DRAFT
    category: str
    variables: List[str] = []
    layout_id: Optional[str] = None
    branding_id: Optional[str] = None
    plan_access: List[str] = ["starter", "growth", "agency"]
    is_system: bool = False
    created_by: Optional[str] = None
    organization_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EmailLayout(BaseModel):
    id: Optional[str] = None
    name: str
    header_html: str
    footer_html: str
    is_default: bool = False
    created_at: Optional[datetime] = None


class EmailBranding(BaseModel):
    id: Optional[str] = None
    organization_id: str
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"
    secondary_color: str = "#0f172a"
    cta_color: str = "#6366f1"
    cta_text: str = "Click Here"
    company_name: str
    company_address: Optional[str] = None
    company_website: Optional[str] = None
    social_links: Dict[str, str] = {}
    footer_text: Optional[str] = None
    remove_branding: bool = False


# Trigger Models
class EmailTrigger(BaseModel):
    id: Optional[str] = None
    name: str
    event_type: TriggerEventType
    template_id: str
    status: TriggerStatus = TriggerStatus.ACTIVE
    conditions: Dict[str, Any] = {}
    delay_seconds: int = 0
    retry_enabled: bool = True
    retry_limit: int = 3
    retry_interval: int = 300
    plan_access: List[str] = ["starter", "growth", "agency"]
    organization_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TriggerCondition(BaseModel):
    field: str
    operator: str
    value: Any


# Queue Models
class EmailQueueItem(BaseModel):
    id: Optional[str] = None
    template_id: str
    trigger_id: Optional[str] = None
    to_email: str
    to_name: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    subject: str
    html_content: str
    text_content: Optional[str] = None
    variables: Dict[str, Any] = {}
    organization_id: str
    status: EmailQueueStatus = EmailQueueStatus.PENDING
    priority: int = 5
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Log Models
class EmailLog(BaseModel):
    id: Optional[str] = None
    message_id: Optional[str] = None
    queue_id: Optional[str] = None
    template_id: Optional[str] = None
    trigger_id: Optional[str] = None
    organization_id: str
    from_email: str
    to_email: str
    to_name: Optional[str] = None
    subject: str
    status: EmailLogStatus
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None
    unsubscribed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    smtp_response: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: Optional[datetime] = None


class EmailEvent(BaseModel):
    id: Optional[str] = None
    event_type: TriggerEventType
    organization_id: str
    user_id: Optional[str] = None
    lead_id: Optional[str] = None
    campaign_id: Optional[str] = None
    data: Dict[str, Any] = {}
    processed: bool = False
    processed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# Provider Models
class EmailProviderSettings(BaseModel):
    id: Optional[str] = None
    provider_type: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    from_email: str
    from_name: str
    use_tls: bool = True
    is_default: bool = False
    is_active: bool = True
    daily_limit: int = 500
    organization_id: Optional[str] = None
    created_at: Optional[datetime] = None


# Analytics Models
class EmailAnalytics(BaseModel):
    total_sent: int = 0
    total_delivered: int = 0
    total_opened: int = 0
    total_clicked: int = 0
    total_bounced: int = 0
    total_unsubscribed: int = 0
    total_spam: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    bounce_rate: float = 0.0
    delivery_rate: float = 0.0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None