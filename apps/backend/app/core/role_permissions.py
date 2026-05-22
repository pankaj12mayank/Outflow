"""
Canonical RBAC permission sets for Outflo.

Imported by auth_service.PermissionChecker and rbac_models.ROLE_PERMISSIONS.
Keep in sync with apps/frontend/app/hooks/useAuth.tsx DEFAULT_PERMISSIONS.
"""

ORGANIZATION_ADMIN_PERMISSIONS = [
    "organizations:read",
    "analytics:read",
    "analytics:export",
    "invoices:read",
    "features:read",
    "billing:read",
    "billing:update",
    "teams:read",
    "teams:create",
    "teams:update",
    "teams:delete",
    "leads:read",
    "leads:create",
    "leads:update",
    "leads:delete",
    "leads:enrich",
    "campaigns:read",
    "campaigns:create",
    "campaigns:update",
    "campaigns:delete",
    "campaigns:start",
    "campaigns:pause",
    "sequences:read",
    "sequences:create",
    "sequences:update",
    "sequences:delete",
    "scraping:read",
    "scraping:create",
    "scraping:update",
    "scraping:delete",
    "settings:read",
    "settings:update",
    "notifications:read",
    "monitoring:read",
]

TEAM_MEMBER_PERMISSIONS = [
    "teams:read",
    "leads:read",
    "leads:create",
    "leads:update",
    "campaigns:read",
    "sequences:read",
    "scraping:read",
    "settings:read",
]

# Platform-only (system_owner console); not granted to organization_admin.
SYSTEM_OWNER_PLATFORM_PERMISSIONS = [
    "organizations:read",
    "organizations:create",
    "organizations:update",
    "organizations:delete",
    "plans:read",
    "plans:create",
    "plans:update",
    "plans:delete",
    "pricing:read",
    "pricing:create",
    "pricing:update",
    "pricing:delete",
    "smtp:read",
    "smtp:create",
    "smtp:update",
    "smtp:delete",
    "cms:read",
    "cms:create",
    "cms:update",
    "cms:delete",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
]

ROLE_PERMISSIONS_BY_NAME = {
    "system_owner": ["*"],
    "organization_admin": ORGANIZATION_ADMIN_PERMISSIONS,
    "team_member": TEAM_MEMBER_PERMISSIONS,
}
