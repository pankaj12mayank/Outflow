from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class SMTPProvider(str, Enum):
    GMAIL = "gmail"
    OUTLOOK = "outlook"
    SENDGRID = "sendgrid"
    SMTP2GO = "smtp2go"
    CUSTOM = "custom"


class SMTPEncryption(str, Enum):
    NONE = "none"
    TLS = "tls"
    SSL = "ssl"
    STARTTLS = "starttls"


class EmailAccountStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    WARMING_UP = "warming_up"
    DAILY_LIMIT_REACHED = "daily_limit_reached"


class WarmupPhase:
    PHASE_1_WARMUP = [
        2, 3, 3, 4, 4, 5, 6, 7, 8, 9,
        10, 12, 14, 16, 19, 22, 25, 29, 33, 38,
        43, 49, 56, 64, 73, 82, 93, 105, 118, 133,
    ]
    PHASE_2_GROWTH = [
        150, 168, 189, 212, 238, 267, 299, 335, 375, 420,
        470, 525, 585, 650, 720, 795, 875, 960, 1050, 1145,
    ]
    PHASE_3_FULL = []


class AccountWarmupState(BaseModel):
    account_id: int
    phase: int = 1
    day_index: int = 0
    current_daily_limit: int = 2
    total_sent: int = 0
    total_opened: int = 0
    total_replied: int = 0
    total_bounced: int = 0
    engagement_rate: float = 0.0
    is_complete: bool = False
    started_at: datetime
    target_daily_limit: int = 500


class SMTPConfig(BaseModel):
    provider: SMTPProvider
    host: str
    port: int = 587
    username: str
    password: str
    encryption: SMTPEncryption = SMTPEncryption.STARTTLS
    from_email: EmailStr
    from_name: str
    reply_to: Optional[EmailStr] = None
    signature: Optional[str] = None


class EmailAccountCreate(BaseModel):
    email: EmailStr
    provider: SMTPProvider = SMTPProvider.CUSTOM
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    smtp_encryption: SMTPEncryption = SMTPEncryption.STARTTLS
    imap_host: Optional[str] = None
    imap_port: Optional[int] = 993
    daily_limit: int = Field(default=500, ge=1, le=5000)
    enable_warmup: bool = True
    warmup_schedule: Optional[dict] = None
    user_agent: Optional[str] = None


class EmailAccountUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_encryption: Optional[SMTPEncryption] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    daily_limit: Optional[int] = None
    is_active: Optional[bool] = None
    signature: Optional[str] = None


class EmailAccountResponse(BaseModel):
    id: int
    email: str
    provider: SMTPProvider
    smtp_host: str
    smtp_port: int
    smtp_encryption: SMTPEncryption
    daily_limit: int
    used_today: int
    is_active: bool
    is_verified: bool
    warmup_status: Optional[dict] = None
    created_at: datetime


class SMTPHealthCheck(BaseModel):
    account_id: int
    connected: bool
    can_send: bool
    daily_limit_reached: bool
    current_usage: int
    daily_limit: int
    last_check: datetime
    issues: list[str] = []


class SendEmailRequest(BaseModel):
    to_email: EmailStr
    to_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    reply_to: Optional[EmailStr] = None
    track_opens: bool = True
    track_clicks: bool = True
    headers: Optional[dict] = None
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None
    lead_id: Optional[int] = None
    sequence_id: Optional[int] = None
    sequence_step: Optional[int] = None


class SendEmailResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    queued: bool = False
    scheduled_at: Optional[datetime] = None
    error: Optional[str] = None
    account_used: Optional[str] = None


class BatchSendRequest(BaseModel):
    emails: list[SendEmailRequest]
    account_id: Optional[int] = None
    throttle_rate: int = Field(default=3, ge=1, le=60)
    batch_size: int = Field(default=50, ge=1, le=500)


class BatchSendResponse(BaseModel):
    total: int
    queued: int
    sent: int
    failed: int
    batch_id: str
    estimated_completion: datetime


class BounceRecord(BaseModel):
    email: str
    account_id: int
    bounce_type: str
    reason: str
    timestamp: datetime
    lead_id: Optional[int] = None
    campaign_id: Optional[int] = None


class BounceProtection(BaseModel):
    enabled: bool = True
    hard_bounce_threshold: int = 2
    soft_bounce_threshold: int = 5
    auto_disable_account: bool = True
    block_lead_on_bounce: bool = True


class WarmupConfig(BaseModel):
    enabled: bool = True
    start_daily_limit: int = 2
    end_daily_limit: int = 500
    ramp_up_days: int = 30
    min_engagement_rate: float = 0.15
    max_bounce_rate: float = 0.05
    auto_pause_on_low_engagement: bool = True


class DailySendingStats(BaseModel):
    account_id: int
    date: datetime
    sent: int
    opened: int
    clicked: int
    replied: int
    bounced: int
    complained: int
    unsubscribed: int
    daily_limit: int
    usage_percent: float


class ThrottleConfig(BaseModel):
    emails_per_minute: int = 20
    emails_per_hour: int = 300
    emails_per_day: int = 500
    delay_between_emails_ms: int = 3000
    randomization_percent: int = 20


class RetryConfig(BaseModel):
    max_retries: int = 3
    retry_delays: list[int] = [300, 900, 3600]
    retry_on_soft_bounce: bool = True
    retry_on_timeout: bool = True
    retry_on_connection_error: bool = True


class SPFSettings(BaseModel):
    enabled: bool = True
    include_spf: bool = True
    dkim_enabled: bool = True
    dmarc_enabled: bool = True
    domain: Optional[str] = None