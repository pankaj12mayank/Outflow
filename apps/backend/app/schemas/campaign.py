from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class SequenceStepType(str, Enum):
    EMAIL = "email"
    DELAY = "delay"
    CONDITION = "condition"
    TASK = "task"
    AB_TEST = "ab_test"


class ConditionType(str, Enum):
    REPLIED = "replied"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    OUT_OF_OFFICE = "out_of_office"
    TIME_IN_SEQUENCE = "time_in_sequence"


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: CampaignStatus = CampaignStatus.DRAFT
    campaign_type: str = "cold_outreach"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_leads: Optional[int] = None
    target_countries: list[str] = Field(default_factory=list)
    target_industries: list[str] = Field(default_factory=list)
    settings: dict = Field(default_factory=dict)


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_leads: Optional[int] = None
    settings: Optional[dict] = None


class CampaignResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    status: str
    campaign_type: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    target_leads: Optional[int]
    settings: dict
    created_at: datetime


class SequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: list[dict] = Field(default_factory=list)
    settings: dict = Field(default_factory=dict)


class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[list[dict]] = None
    settings: Optional[dict] = None
    status: Optional[str] = None


class SequenceStepCreate(BaseModel):
    type: SequenceStepType
    order: int
    delay_minutes: int = 0
    delay_days: int = 0
    condition_type: Optional[ConditionType] = None
    condition_value: Optional[str] = None
    email_template_id: Optional[int] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    track_opens: bool = True
    track_clicks: bool = True
    variant: str = "A"
    weight: int = 100
    settings: dict = Field(default_factory=dict)


class SequenceResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    status: str
    steps: list[dict]
    settings: dict
    total_enrollments: int
    active_enrollments: int
    completed_enrollments: int
    created_at: datetime


class EmailTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    preheader: Optional[str] = None
    category: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    is_public: bool = False


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    preheader: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    is_public: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    subject: str
    body_html: Optional[str]
    body_text: Optional[str]
    preheader: Optional[str]
    category: Optional[str]
    tags: list[str]
    is_public: bool
    usage_count: int
    created_at: datetime


class EmailAccountCreate(BaseModel):
    email: str
    provider: str = "custom"
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    smtp_encryption: str = "starttls"
    imap_host: Optional[str] = None
    imap_port: Optional[int] = 993
    daily_limit: int = Field(default=500, ge=1, le=5000)
    enable_warmup: bool = True


class EmailAccountUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_encryption: Optional[str] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    daily_limit: Optional[int] = None
    is_active: Optional[bool] = None
    signature: Optional[str] = None


class EmailAccountResponse(BaseModel):
    id: int
    email: str
    provider: str
    smtp_host: str
    smtp_port: int
    smtp_encryption: str
    daily_limit: int
    used_today: int
    is_active: bool
    is_verified: bool
    enable_warmup: bool
    warmup_day: int
    total_sent: int
    total_opened: int
    total_clicked: int
    total_replied: int
    total_bounced: int
    created_at: datetime


class SendEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    track_opens: bool = True
    track_clicks: bool = True
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None
    lead_id: Optional[int] = None
    sequence_id: Optional[int] = None
    sequence_step: Optional[int] = None
    template_id: Optional[int] = None


class CampaignStats(BaseModel):
    campaign_id: int
    total_emails: int
    sent: int
    delivered: int
    opened: int
    clicked: int
    replied: int
    bounced: int
    failed: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    reply_rate: float
    bounce_rate: float


class SequenceStats(BaseModel):
    sequence_id: int
    total_enrollments: int
    active: int
    completed: int
    step_stats: dict


class ABTestCreate(BaseModel):
    name: str
    campaign_id: Optional[int] = None
    sequence_id: Optional[int] = None
    test_type: str
    test_variable: str
    sample_size: int = 100
    duration_hours: int = 24
    winner_criteria: str = "open_rate"
    auto_select_winner: bool = True
    variants: list[dict] = Field(default_factory=list)


class EnrollLeadsRequest(BaseModel):
    lead_ids: list[int]
    sequence_id: int
    start_now: bool = True


class ImportTemplateRequest(BaseModel):
    file: str
    mapping: dict