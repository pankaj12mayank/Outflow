from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId

from app.models.models import Organization
from app.models.plan_models import Plan
from app.models.billing_models import Subscription, Invoice


class PyEnum(str, Enum):
    pass


class User(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    full_name: str
    password_hash: str
    role: str = "member"
    organization_id: Optional[str] = None
    is_active: bool = True
    is_email_verified: bool = False
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    settings: Dict[str, Any] = {}
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Membership(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    organization_id: str
    role: str
    invited_by: Optional[str] = None
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    joined_at: Optional[datetime] = None
    is_active: bool = True

    class Config:
        populate_by_name = True


class Role(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Lead(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    status: str = "new"
    source: Optional[str] = None
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}
    metadata_json: Dict[str, Any] = {}
    created_by: Optional[str] = None
    enriched_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Campaign(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    status: str = "draft"
    inbox_id: Optional[str] = None
    target_criteria: Optional[Dict] = None
    exclude_criteria: Optional[Dict] = None
    daily_limit: Optional[int] = None
    max_emails: Optional[int] = None
    schedule_type: str = "immediate"
    schedule_date: Optional[datetime] = None
    timezone: str = "UTC"
    config: Dict[str, Any] = {}
    total_recipients: int = 0
    emails_sent: int = 0
    emails_delivered: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_replied: int = 0
    emails_bounced: int = 0
    emails_failed: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CampaignSequence(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    campaign_id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    enrollment_type: str = "all"
    trigger_action: Optional[str] = None
    is_active: bool = True
    settings: Dict[str, Any] = {}
    total_enrolled: int = 0
    active_enrolled: int = 0
    completed: int = 0
    stopped: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CampaignStep(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    sequence_id: str
    organization_id: str
    step_number: int
    step_type: str
    config: Dict[str, Any] = {}
    delay_hours: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class EmailMessage(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    campaign_id: Optional[str] = None
    lead_id: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    status: str = "pending"
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None
    thread_id: Optional[str] = None
    message_id: Optional[str] = None
    headers: Dict[str, Any] = {}
    retry_count: int = 0
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class OrganizationEmailTemplate(BaseModel):
    """Org-scoped outreach templates (not system notification templates)."""
    id: Optional[str] = Field(default=None, alias="_id")
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
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class EmailAccount(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    user_id: str
    email: EmailStr
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
    warmup_enabled: bool = False
    warmup_day: int = 0
    total_sent: int = 0
    total_opened: int = 0
    total_clicked: int = 0
    total_replied: int = 0
    total_bounced: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Notification(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    user_id: str
    type: str
    title: str
    message: Optional[str] = None
    data: Dict[str, Any] = {}
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    channel: str = "in_app"
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class BackgroundTask(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: Optional[str] = None
    user_id: Optional[str] = None
    task_type: str
    status: str = "pending"
    priority: int = 0
    payload: Dict[str, Any] = {}
    result: Optional[Dict] = None
    attempts: int = 0
    max_attempts: int = 3
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AuditLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Session(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    refresh_token_hash: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class LoginLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class FeatureFlag(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    key: str
    description: Optional[str] = None
    is_enabled: bool = True
    rollout_percentage: int = 100
    target_roles: List[str] = []
    metadata_json: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class SystemSetting(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    key: str
    value: Any
    category: str = "general"
    is_encrypted: bool = False
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ScrapingJob(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    user_id: str
    job_type: str
    status: str = "pending"
    config: Dict[str, Any] = {}
    results: List[Dict] = []
    error: Optional[str] = None
    total_items: int = 0
    processed_items: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AIUsageLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    user_id: str
    feature: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    cost: float = 0.0
    success: bool = True
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AIPrompt(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    key: str
    name: str
    description: Optional[str] = None
    category: str = "system"
    prompt_template: str
    variables: List[str] = []
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 1000
    is_active: bool = True
    is_public: bool = False
    usage_count: int = 0
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AIModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    provider: str
    name: str
    model_id: str
    display_name: str
    description: Optional[str] = None
    max_tokens: int = 4096
    supports_functions: bool = False
    supports_vision: bool = False
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        protected_namespaces = ()


class AISettings(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    default_model: Optional[str] = None
    default_temperature: float = 0.7
    max_tokens: int = 1000
    personalization_enabled: bool = True
    auto_enrich_enabled: bool = True
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CMSPage(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    title: str
    slug: str
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: str = "draft"
    published_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CMSSection(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    page_id: str
    section_type: str
    title: Optional[str] = None
    content: Optional[str] = None
    order: int = 0
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class LeadActivity(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    lead_id: str
    user_id: Optional[str] = None
    activity_type: str
    details: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class LeadEnrichment(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    lead_id: str
    data: Dict[str, Any] = {}
    source: Optional[str] = None
    success: bool = True
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class LeadTag(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    name: str
    color: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class LeadTagAssignment(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    lead_id: str
    tag_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Inbox(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    name: str
    email_address: Optional[str] = None
    settings: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Deal(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    pipeline_id: Optional[str] = None
    name: str
    stage: str = "prospecting"
    value: float = 0.0
    currency: str = "USD"
    probability: float = 0.0
    expected_close_date: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    lead_id: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Pipeline(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    name: str
    stages: List[str] = []
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class Task(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    title: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AnalyticsEvent(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    event_type: str
    event_data: Dict[str, Any] = {}
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CampaignMetric(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    campaign_id: str
    date: datetime
    emails_sent: int = 0
    emails_delivered: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_replied: int = 0
    emails_bounced: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class SystemAlert(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    alert_type: str
    severity: str = "info"
    title: str
    message: str
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    metadata_json: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AbuseReport(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    organization_id: str
    reported_by: str
    report_type: str
    description: str
    evidence: Dict[str, Any] = {}
    status: str = "pending"
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class AdminLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    admin_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True