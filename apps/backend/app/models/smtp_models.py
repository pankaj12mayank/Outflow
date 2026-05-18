from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class SmtpProvider(str, Enum):
    GMAIL = "gmail"
    OUTLOOK = "outlook"
    AWS_SES = "aws_ses"
    MAILGUN = "mailgun"
    SENDGRID = "sendgrid"
    SMTP_GENERIC = "smtp_generic"


class SmtpStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TESTING = "testing"
    FAILED = "failed"


class SmtpConfig(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    provider: SmtpProvider
    host: str
    port: int
    username: str
    password: str
    from_email: EmailStr
    from_name: str
    use_tls: bool = True
    use_ssl: bool = False
    is_default: bool = False
    is_active: bool = True
    assigned_plans: List[str] = []
    daily_limit: int = 1000
    monthly_limit: int = 30000
    daily_sent: int = 0
    monthly_sent: int = 0
    last_used_at: Optional[datetime] = None
    health_status: str = "unknown"
    health_checked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SmtpLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    smtp_config_id: str
    message_id: str
    organization_id: Optional[str] = None
    recipient: EmailStr
    subject: str
    status: str
    error: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None


class EmailEvent(BaseModel):
    id: str = Field(default=None, alias="_id")
    message_id: str
    smtp_config_id: str
    event_type: str
    recipient: EmailStr
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict = {}


class SmtpHealth(BaseModel):
    id: str = Field(default=None, alias="_id")
    smtp_config_id: str
    status: str
    latency_ms: Optional[int] = None
    deliverability_score: Optional[float] = None
    auth_valid: bool = False
    dns_valid: bool = False
    last_check: datetime = Field(default_factory=datetime.utcnow)


class SmtpAnalytics(BaseModel):
    total_sent: int = 0
    total_delivered: int = 0
    total_bounced: int = 0
    total_failed: int = 0
    delivery_rate: float = 0.0
    bounce_rate: float = 0.0
    open_rate: float = 0.0
    click_rate: float = 0.0
    spam_rate: float = 0.0


class SmtpConfigCreate(BaseModel):
    name: str
    provider: SmtpProvider
    host: str
    port: int = 587
    username: str
    password: str
    from_email: EmailStr
    from_name: str
    use_tls: bool = True
    use_ssl: bool = False
    is_default: bool = False
    assigned_plans: List[str] = []
    daily_limit: int = 1000
    monthly_limit: int = 30000


class SmtpTestRequest(BaseModel):
    smtp_config_id: str
    recipient: EmailStr


class SmtpTestResult(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[int] = None
    auth_valid: bool = False
    dns_valid: bool = False


class ProviderDefaults:
    PROVIDER_SETTINGS = {
        SmtpProvider.GMAIL: {
            "host": "smtp.gmail.com",
            "port": 587,
            "use_tls": True
        },
        SmtpProvider.OUTLOOK: {
            "host": "smtp.office365.com",
            "port": 587,
            "use_tls": True
        },
        SmtpProvider.AWS_SES: {
            "host": "email-smtp.amazonaws.com",
            "port": 587,
            "use_tls": True
        },
        SmtpProvider.MAILGUN: {
            "host": "smtp.mailgun.org",
            "port": 587,
            "use_tls": True
        },
        SmtpProvider.SENDGRID: {
            "host": "smtp.sendgrid.net",
            "port": 587,
            "use_tls": True
        },
        SmtpProvider.SMTP_GENERIC: {
            "port": 587,
            "use_tls": True
        }
    }