from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    PAUSED = "paused"


class MembershipRole(str, Enum):
    ADMIN = "admin"
    TEAM_MEMBER = "team_member"


class Organization(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    slug: str
    description: Optional[str] = None
    logo: Optional[str] = None
    website: Optional[str] = None
    status: OrganizationStatus = OrganizationStatus.ACTIVE
    is_active: bool = True
    plan_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizationMember(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    user_id: str
    role: MembershipRole = MembershipRole.MEMBER
    is_active: bool = True
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizationUsage(BaseModel):
    id: str = Field(default=None, alias="_id")
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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