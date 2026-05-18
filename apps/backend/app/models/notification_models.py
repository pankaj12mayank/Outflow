from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class NotificationType(str, Enum):
    BILLING_ALERT = "billing_alert"
    SMTP_FAILURE = "smtp_failure"
    SUBSCRIPTION_EXPIRY = "subscription_expiry"
    AI_USAGE_ALERT = "ai_usage_alert"
    SCRAPING_FAILURE = "scraping_failure"
    ORGANIZATION_SUSPENSION = "organization_suspension"
    USER_INVITE = "user_invite"
    TASK_COMPLETED = "task_completed"
    SYSTEM_ALERT = "system_alert"
    LEAD_ASSIGNED = "lead_assigned"
    CAMPAIGN_STATUS = "campaign_status"
    SEQUENCE_COMPLETED = "sequence_completed"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"
    ARCHIVED = "archived"


class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    WEBHOOK = "webhook"


class EmailStatus(str, Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"


class Notification(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    
    type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.NORMAL
    
    is_read: bool = False
    read_at: Optional[datetime] = None
    
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    
    metadata: Dict = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    notification_id: str
    channel: NotificationChannel
    status: NotificationStatus
    recipient: Optional[str] = None
    
    error_message: Optional[str] = None
    retry_count: int = 0
    
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EmailTemplate(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    subject: str
    
    type: NotificationType
    is_active: bool = True
    is_default: bool = False
    
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    
    variables: List[str] = []
    
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EmailLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    
    template_id: Optional[str] = None
    notification_id: Optional[str] = None
    
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    
    status: EmailStatus = EmailStatus.PENDING
    
    smtp_config_id: Optional[str] = None
    
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    
    retry_count: int = 0
    max_retries: int = 3
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    type: NotificationType
    is_active: bool = True
    is_default: bool = False
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    variables: List[str] = []
    from_name: Optional[str] = None
    from_email: Optional[str] = None


class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata: Dict = {}


class BulkNotificationCreate(BaseModel):
    user_ids: List[str]
    organization_id: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]


class EmailSendRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    template_id: Optional[str] = None
    smtp_config_id: Optional[str] = None
    metadata: Dict = {}