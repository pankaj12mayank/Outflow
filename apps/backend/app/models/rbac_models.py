from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class Role(str, Enum):
    SYSTEM_OWNER = "system_owner"
    ORGANIZATION_ADMIN = "organization_admin"
    TEAM_MEMBER = "team_member"


class PermissionCategory(str, Enum):
    ORGANIZATIONS = "organizations"
    PLANS = "plans"
    PRICING = "pricing"
    SMTP = "smtp"
    CMS = "cms"
    ANALYTICS = "analytics"
    INVOICES = "invoices"
    FEATURES = "features"
    BILLING = "billing"
    TEAMS = "teams"
    LEADS = "leads"
    CAMPAIGNS = "campaigns"
    SEQUENCES = "sequences"
    SCRAPING = "scraping"
    SETTINGS = "settings"
    USERS = "users"


class Permission(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    category: PermissionCategory
    description: str
    is_system: bool = False


ROLE_PERMISSIONS = {
    Role.SYSTEM_OWNER: [
        "organizations:read", "organizations:create", "organizations:update", "organizations:delete",
        "plans:read", "plans:create", "plans:update", "plans:delete",
        "pricing:read", "pricing:create", "pricing:update", "pricing:delete",
        "smtp:read", "smtp:create", "smtp:update", "smtp:delete",
        "cms:read", "cms:create", "cms:update", "cms:delete",
        "analytics:read", "analytics:export",
        "invoices:read", "invoices:create", "invoices:update",
        "features:read", "features:create", "features:update", "features:delete",
        "billing:read", "billing:update",
        "teams:read", "teams:create", "teams:update", "teams:delete",
        "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
        "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
        "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
        "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
        "settings:read", "settings:update",
        "users:read", "users:create", "users:update", "users:delete",
    ],
    Role.ORGANIZATION_ADMIN: [
        "organizations:read",
        "analytics:read", "analytics:export",
        "invoices:read",
        "features:read",
        "billing:read", "billing:update",
        "teams:read", "teams:create", "teams:update", "teams:delete",
        "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
        "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
        "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
        "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
        "settings:read", "settings:update",
    ],
    Role.TEAM_MEMBER: [
        "teams:read",
        "leads:read", "leads:create", "leads:update",
        "campaigns:read",
        "sequences:read",
        "scraping:read",
        "settings:read",
    ],
}


class UserRole(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: str
    organization_id: Optional[str] = None
    role: Role
    permissions: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Plan(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    description: str
    price: float
    billing_cycle: str
    features: List[str]
    is_active: bool = True
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizationPlan(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    plan_id: str
    status: str = "active"
    start_date: datetime
    end_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FeatureToggle(BaseModel):
    id: str = Field(default=None, alias="_id")
    key: str
    name: str
    description: str
    is_enabled: bool = True
    rollout_percentage: int = 100
    roles: List[Role] = []
    organizations: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)