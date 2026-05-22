"""
Layer 9 — RBAC permission parity across auth_service, rbac_models, and frontend defaults.
"""

import pytest

from app.core.role_permissions import (
    ORGANIZATION_ADMIN_PERMISSIONS,
    TEAM_MEMBER_PERMISSIONS,
    ROLE_PERMISSIONS_BY_NAME,
)
from app.models.rbac_models import Role, ROLE_PERMISSIONS
from app.services.auth_service import PERMISSIONS, PermissionChecker


# Mirrors apps/frontend/app/hooks/useAuth.tsx DEFAULT_PERMISSIONS (org + team)
FRONTEND_ORG_ADMIN_PERMISSIONS = [
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

FRONTEND_TEAM_MEMBER_PERMISSIONS = [
    "teams:read",
    "leads:read",
    "leads:create",
    "leads:update",
    "campaigns:read",
    "sequences:read",
    "scraping:read",
    "settings:read",
]


def test_auth_service_matches_canonical_org_admin():
    assert set(PERMISSIONS["organization_admin"]) == set(ORGANIZATION_ADMIN_PERMISSIONS)


def test_rbac_models_org_admin_matches_canonical():
    assert set(ROLE_PERMISSIONS[Role.ORGANIZATION_ADMIN]) == set(ORGANIZATION_ADMIN_PERMISSIONS)


def test_frontend_default_org_admin_matches_canonical():
    assert set(FRONTEND_ORG_ADMIN_PERMISSIONS) == set(ORGANIZATION_ADMIN_PERMISSIONS)


def test_frontend_default_team_member_matches_canonical():
    assert set(FRONTEND_TEAM_MEMBER_PERMISSIONS) == set(TEAM_MEMBER_PERMISSIONS)


def test_org_admin_does_not_get_platform_only_permissions():
    platform_only = {"smtp:read", "cms:read", "pricing:read", "plans:read", "users:read"}
    org_perms = set(ORGANIZATION_ADMIN_PERMISSIONS)
    assert platform_only.isdisjoint(org_perms)


def test_permission_checker_org_admin_leads_read():
    assert PermissionChecker.has_permission("organization_admin", "leads", "read")
    assert PermissionChecker.has_permission("organization_admin", "notifications", "read")


def test_permission_checker_system_owner_wildcard():
    assert PermissionChecker.has_permission("system_owner", "smtp", "delete")
    assert PermissionChecker.get_user_permissions("system_owner") == ["*"]


@pytest.mark.asyncio
async def test_get_current_user_with_role_fallback_uses_jwt_role(monkeypatch):
    import app.middleware as middleware_pkg
    from app.middleware import rbac as rbac_middleware

    async def fake_get_current_user(request):
        return {
            "sub": "user-1",
            "email": "admin@test.com",
            "role": "organization_admin",
            "organization_id": "org-1",
        }

    async def fake_get_user_roles(user_id):
        return []

    monkeypatch.setattr(middleware_pkg, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(rbac_middleware.RoleService, "get_user_roles", fake_get_user_roles)

    user = await rbac_middleware.get_current_user_with_role(None)
    assert user["role"] == "organization_admin"
    assert "leads:read" in user["permissions"]
    assert "notifications:read" in user["permissions"]
