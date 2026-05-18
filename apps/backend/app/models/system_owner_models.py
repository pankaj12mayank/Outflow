from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
import secrets


class AuthMethod(str, Enum):
    PASSWORD = "password"
    MAGIC_LINK = "magic_link"
    MFA = "mfa"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class LogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class DeviceType(str, Enum):
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"
    OTHER = "other"


class SystemOwnerUser(BaseModel):
    id: str = Field(default=None, alias="_id")
    email: str
    password_hash: str
    full_name: str
    role: str = "system_owner"
    is_active: bool = True
    is_superadmin: bool = True
    email_verified: bool = True
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SystemOwnerSession(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: str
    token: str
    refresh_token: str
    device_info: dict
    ip_address: str
    user_agent: str
    status: SessionStatus = SessionStatus.ACTIVE
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None


class AuthLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    email: str
    action: str
    status: str
    ip_address: str
    user_agent: str
    device_info: dict
    location: Optional[str] = None
    metadata: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Device(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: str
    device_id: str
    device_type: DeviceType
    browser: str
    os: str
    ip_address: str
    location: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    is_trusted: bool = False
    is_current: bool = False


class ActivityLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: dict = {}
    ip_address: str
    user_agent: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class RateLimitEntry(BaseModel):
    id: str = Field(default=None, alias="_id")
    identifier: str
    count: int = 0
    window_start: datetime = Field(default_factory=datetime.utcnow)
    blocked_until: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900


class LoginRequest(BaseModel):
    email: str
    password: str
    device_info: Optional[dict] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    all_devices: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AuthLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    email: str
    action: str
    status: str
    ip_address: str
    timestamp: datetime


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: str
    timestamp: datetime


class SessionResponse(BaseModel):
    id: str
    device_info: dict
    ip_address: str
    issued_at: datetime
    expires_at: datetime
    last_activity: datetime
    status: str
    is_current: bool


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    email: str
    action: str
    status: str
    ip_address: str
    timestamp: datetime


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: str
    timestamp: datetime


class SessionResponse(BaseModel):
    id: str
    device_info: dict
    ip_address: str
    issued_at: datetime
    expires_at: datetime
    last_activity: datetime
    status: str
    is_current: bool