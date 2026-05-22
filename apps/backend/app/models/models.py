"""
Models (MongoDB)
Simplified base models for MongoDB - no SQLAlchemy
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class MembershipStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INVITE_EXPIRED = "invite_expired"


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CUSTOMER = "customer"
    CHURNED = "churned"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EmailStatus(str, Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"


class Organization(BaseModel):
    """Canonical organization schema (API + MongoDB documents)."""
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    slug: str
    description: Optional[str] = None
    logo: Optional[str] = None
    website: Optional[str] = None
    plan: str = "free"
    plan_id: Optional[str] = None
    status: str = "active"
    is_active: bool = True
    settings: Dict[str, Any] = {}
    metadata_json: Dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OrganizationMember(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: str
    role: str = "team_member"
    is_active: bool = True
    joined_at: datetime = None


class OrganizationUsage(BaseModel):
    id: Optional[str] = None
    organization_id: str
    period: str
    ai_generations: int = 0
    ai_tokens: int = 0
    scraping_credits_used: int = 0
    emails_sent: int = 0
    emails_failed: int = 0
    leads_added: int = 0
    campaigns_sent: int = 0
    api_calls: int = 0
    storage_used_mb: int = 0
    created_at: datetime = None
    updated_at: datetime = None


class OrganizationAnalytics(BaseModel):
    total_users: int
    active_users: int
    total_leads: int
    active_leads: int
    total_campaigns: int
    active_campaigns: int
    emails_sent_30d: int
    emails_delivered_30d: int
    ai_generations_30d: int
    scraping_credits_30d: int
    mrr: float
    subscription_plan: str
    created_at: str


class OrganizationSearchQuery(BaseModel):
    query: Optional[str] = None
    status: Optional[str] = None
    plan_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    skip: int = 0
    limit: int = 20


class OrganizationListResponse(BaseModel):
    organizations: List[Dict]
    total: int
    page: int
    page_size: int


class ImpersonationRequest(BaseModel):
    organization_id: str
    target_user_id: Optional[str] = None


class ImpersonationResponse(BaseModel):
    access_token: str
    refresh_token: str
    organization_id: str
    user_id: str
    expires_in: int


class User(BaseModel):
    id: Optional[str] = None
    email: str
    full_name: str
    password_hash: str
    role: str = "team_member"
    organization_id: Optional[str] = None
    is_active: bool = True
    is_email_verified: bool = False
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    settings: Dict[str, Any] = {}
    last_login_at: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = None
    updated_at: datetime = None


class Membership(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: str
    role: str
    email: Optional[str] = None
    invited_by: Optional[str] = None
    invited_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    status: str = "pending"
    title: Optional[str] = None
    permissions: List[str] = []


class Role(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_default: bool = False


class Lead(BaseModel):
    id: Optional[str] = None
    organization_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_domain: Optional[str] = None
    company_size: Optional[str] = None
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    status: str = "new"
    source: Optional[str] = None
    tags: List[str] = []
    enriched_data: Dict[str, Any] = {}
    created_by: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    deleted_at: Optional[datetime] = None


class Campaign(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    status: str = "draft"
    email_account_id: Optional[str] = None
    inbox_id: Optional[str] = None
    target_criteria: Optional[Dict] = None
    exclude_criteria: Optional[Dict] = None
    daily_limit: Optional[int] = None
    max_emails: Optional[int] = None
    schedule_type: str = "immediate"
    schedule_date: Optional[datetime] = None
    timezone: str = "UTC"
    settings: Dict[str, Any] = {}
    total_recipients: int = 0
    emails_sent: int = 0
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None


class CampaignSequence(BaseModel):
    id: Optional[str] = None
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


class CampaignStep(BaseModel):
    id: Optional[str] = None
    sequence_id: str
    organization_id: str
    step_number: int
    step_type: str
    config: Dict[str, Any] = {}
    delay_hours: int = 0
    is_active: bool = True


class EmailMessage(BaseModel):
    id: Optional[str] = None
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
    retry_count: int = 0
    last_error: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None


class Pipeline(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    stages: List[str] = []
    is_default: bool = False


class Deal(BaseModel):
    id: Optional[str] = None
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


class Task(BaseModel):
    id: Optional[str] = None
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


class Note(BaseModel):
    id: Optional[str] = None
    organization_id: str
    entity_type: str
    entity_id: str
    content: str
    created_by: str


class Activity(BaseModel):
    id: Optional[str] = None
    organization_id: str
    entity_type: str
    entity_id: str
    activity_type: str
    details: Dict[str, Any] = {}
    created_by: str


class Session(BaseModel):
    id: Optional[str] = None
    user_id: str
    organization_id: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_hash: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    expires_at: datetime = None
    is_active: bool = True
    revoked_at: Optional[datetime] = None
    created_at: datetime = None


class LoginLog(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None
    device_type: Optional[str] = None
    created_at: datetime = None


class AuditLog(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = None


class FeatureFlag(BaseModel):
    id: Optional[str] = None
    key: str
    description: Optional[str] = None
    is_enabled: bool = True
    rollout_percentage: int = 100
    target_roles: List[str] = []
    metadata_json: Dict[str, Any] = {}


class SystemSetting(BaseModel):
    id: Optional[str] = None
    key: str
    value: Any
    category: str = "general"
    is_encrypted: bool = False
    description: Optional[str] = None


class ScrapingJob(BaseModel):
    id: Optional[str] = None
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


class Inbox(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    email_address: Optional[str] = None
    settings: Dict[str, Any] = {}


class CMSPage(BaseModel):
    id: Optional[str] = None
    organization_id: str
    title: str
    slug: str
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: str = "draft"
    published_at: Optional[datetime] = None
    created_by: Optional[str] = None


class CMSSection(BaseModel):
    id: Optional[str] = None
    page_id: str
    section_type: str
    title: Optional[str] = None
    content: Optional[str] = None
    order: int = 0
    settings: Dict[str, Any] = {}