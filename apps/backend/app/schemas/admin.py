from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPPORT = "support"
    VIEWER = "viewer"


class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AbuseReportType(str, Enum):
    SPAM = "spam"
    SCRAPING_ABUSE = "scraping_abuse"
    SENDING_ABUSE = "sending_abuse"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_VIOLATION = "data_violation"
    TERMS_VIOLATION = "terms_violation"


class OrganizationCreate(BaseModel):
    name: str
    slug: str
    domain: Optional[str] = None
    plan_id: Optional[int] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    plan_id: Optional[int] = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    domain: Optional[str]
    is_active: bool
    plan_name: Optional[str]
    user_count: int
    created_at: datetime


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    status: Optional[SubscriptionStatus] = None
    billing_cycle: Optional[str] = None
    trial_days: Optional[int] = None


class SubscriptionResponse(BaseModel):
    id: int
    organization_id: int
    plan_id: int
    status: str
    billing_cycle: str
    started_at: datetime
    trial_ends_at: Optional[datetime]
    current_period_end: Optional[datetime]


class PlanCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    monthly_price: float = 0.0
    yearly_price: float = 0.0
    features: dict = Field(default_factory=dict)
    limits: dict = Field(default_factory=dict)
    ai_limits: dict = Field(default_factory=dict)
    email_limits: dict = Field(default_factory=dict)
    scraping_limits: dict = Field(default_factory=dict)
    is_active: bool = True
    is_featured: bool = False


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    features: Optional[dict] = None
    limits: Optional[dict] = None
    ai_limits: Optional[dict] = None
    email_limits: Optional[dict] = None
    scraping_limits: Optional[dict] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class PlanResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    monthly_price: float
    yearly_price: float
    features: dict
    limits: dict
    ai_limits: dict
    email_limits: dict
    scraping_limits: dict
    is_active: bool
    is_featured: bool


class LimitsUpdate(BaseModel):
    organization_id: int
    ai_generations_limit: Optional[int] = None
    ai_tokens_limit: Optional[int] = None
    email_sends_limit: Optional[int] = None
    email_daily_limit: Optional[int] = None
    scraping_jobs_limit: Optional[int] = None
    scraping_items_limit: Optional[int] = None
    leads_limit: Optional[int] = None
    campaigns_limit: Optional[int] = None
    users_limit: Optional[int] = None


class FeatureFlagUpdate(BaseModel):
    feature_key: str
    is_enabled: Optional[bool] = None
    rollout_percentage: Optional[int] = None
    config: Optional[dict] = None


class GlobalSettingUpdate(BaseModel):
    key: str
    value: Any
    value_type: Optional[str] = "string"
    description: Optional[str] = None
    is_encrypted: Optional[bool] = None


class AdminPlatformStats(BaseModel):
    total_organizations: int
    active_organizations: int
    total_users: int
    active_users: int
    total_subscriptions: int
    active_subscriptions: int
    mrr: float
    arr: float
    churn_rate: float
    new_orgs_this_month: int
    new_orgs_last_month: int


class AdminBillingStats(BaseModel):
    mrr: float
    arr: float
    total_invoices: float
    paid_invoices: float
    pending_invoices: float
    failed_invoices: float
    average_invoice_value: float
    by_plan: dict
    by_status: dict


class AdminMonitoringStats(BaseModel):
    server_status: str
    uptime_seconds: float
    active_connections: int
    queue_size: int
    avg_response_time_ms: float
    error_rate: float
    scraping_jobs_running: int
    scraping_jobs_pending: int
    active_polling_users: int


class AbuseReportCreate(BaseModel):
    organization_id: int
    user_id: Optional[int] = None
    report_type: AbuseReportType
    severity: AlertSeverity = AlertSeverity.LOW
    description: str
    evidence: dict = Field(default_factory=dict)


class AbuseReportResponse(BaseModel):
    id: int
    organization_id: int
    report_type: str
    severity: str
    description: str
    status: str
    created_at: datetime


class SystemAlertResponse(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    message: Optional[str]
    is_resolved: bool
    created_at: datetime


class CMSContentUpdate(BaseModel):
    section_key: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    content: Optional[dict] = None
    media: Optional[dict] = None
    is_visible: Optional[bool] = None


class FAQCreate(BaseModel):
    category: str
    question: str
    answer: str
    is_visible: bool = True
    sort_order: int = 0


class FAQUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    is_visible: Optional[bool] = None
    sort_order: Optional[int] = None


class FAQResponse(BaseModel):
    id: int
    category: str
    question: str
    answer: str
    is_visible: bool
    sort_order: int


class TestimonialCreate(BaseModel):
    author_name: str
    author_title: Optional[str] = None
    author_company: Optional[str] = None
    author_avatar: Optional[str] = None
    quote: str
    rating: int = 5
    is_visible: bool = True
    is_featured: bool = False


class TestimonialResponse(BaseModel):
    id: int
    author_name: str
    author_title: Optional[str]
    author_company: Optional[str]
    quote: str
    rating: int
    is_visible: bool
    is_featured: bool


class PricingPlanCreate(BaseModel):
    plan_key: str
    name: str
    description: Optional[str] = None
    monthly_price: float = 0.0
    yearly_price: float = 0.0
    features: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    is_active: bool = True
    is_highlighted: bool = False
    highlight_label: Optional[str] = None
    cta_text: str = "Get Started"


class SEOConfigUpdate(BaseModel):
    page: str
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: Optional[str] = None


class AdminLogResponse(BaseModel):
    id: int
    admin_user_id: int
    action: str
    resource_type: str
    resource_id: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]
    created_at: datetime