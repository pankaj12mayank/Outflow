"""
Layer 14 — RBAC guards (route permissions, scraping policy, team_member restrictions).
"""

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.services.auth_service import PermissionChecker

client = TestClient(app)


def _team_member_headers():
    token = create_access_token(
        {
            "sub": "99",
            "email": "member@test.com",
            "organization_id": 1,
            "role": "team_member",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _org_admin_headers():
    token = create_access_token(
        {
            "sub": "1",
            "email": "admin@test.com",
            "organization_id": 1,
            "role": "organization_admin",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def test_team_member_lacks_analytics_read_permission():
    assert not PermissionChecker.has_permission("team_member", "analytics", "read")
    assert PermissionChecker.has_permission("team_member", "campaigns", "read")
    assert not PermissionChecker.has_permission("team_member", "campaigns", "create")
    assert not PermissionChecker.has_permission("team_member", "scraping", "create")


def test_scraping_create_denied_for_team_member():
    response = client.post(
        "/api/v1/scraping/google-maps/search",
        headers=_team_member_headers(),
        json={"query": "test"},
    )
    assert response.status_code == 403, response.text


def test_scraping_list_allowed_for_team_member():
    response = client.get("/api/v1/scraping/jobs", headers=_team_member_headers())
    assert response.status_code != 403


def test_scraping_create_allowed_for_org_admin():
    response = client.post(
        "/api/v1/scraping/google-maps/search",
        headers=_org_admin_headers(),
        json={"query": "test"},
    )
    assert response.status_code != 403


def test_team_member_campaign_and_lead_mutation_permissions():
    from app.core.role_permissions import TEAM_MEMBER_PERMISSIONS

    perms = set(TEAM_MEMBER_PERMISSIONS)
    assert "campaigns:read" in perms
    assert "campaigns:create" not in perms
    assert "campaigns:start" not in perms
    assert "leads:delete" not in perms
    assert "leads:enrich" not in perms
    assert "analytics:read" not in perms
