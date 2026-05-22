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


from app.core.role_permissions import (
    ORGANIZATION_ADMIN_PERMISSIONS,
    TEAM_MEMBER_PERMISSIONS,
    SYSTEM_OWNER_PLATFORM_PERMISSIONS,
)

# Stored on user_roles documents; system_owner JWT uses ["*"] via PermissionChecker.
ROLE_PERMISSIONS = {
    Role.SYSTEM_OWNER: list(
        dict.fromkeys(
            ORGANIZATION_ADMIN_PERMISSIONS
            + SYSTEM_OWNER_PLATFORM_PERMISSIONS
            + ["invoices:create", "invoices:update", "features:create", "features:update", "features:delete"]
        )
    ),
    Role.ORGANIZATION_ADMIN: list(ORGANIZATION_ADMIN_PERMISSIONS),
    Role.TEAM_MEMBER: list(TEAM_MEMBER_PERMISSIONS),
}


class UserRole(BaseModel):
    id: str = Field(default=None, alias="_id")
    user_id: str
    organization_id: Optional[str] = None
    role: Role
    permissions: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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