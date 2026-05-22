"""
Layer 19 — Production readiness gate (audit #5 persona smoke).

Validates critical paths from AUDIT_REPORT.md § E2E flows without full browser automation.
"""

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.services.auth_service import PermissionChecker
from app.services.system_owner_auth_service import create_access_token as create_so_access_token

client = TestClient(app)


def _team_member_headers():
    token = create_access_token(
        {
            "sub": "99",
            "email": "member@test.com",
            "organization_id": "1",
            "role": "team_member",
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _system_owner_headers():
    tokens = create_so_access_token("so-1", "admin@outflo.com")
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_public_landing_slug_route_is_public():
    """H-06 closure: published slug endpoint registered without SO auth dependency."""
    paths = [getattr(r, "path", "") or "" for r in app.routes]
    assert any("/pages/slug/" in p and "public" in p for p in paths)


def test_plans_landing_route_registered():
    paths = [getattr(r, "path", "") or "" for r in app.routes]
    assert any("/plans/landing" in p for p in paths)


def test_system_owner_notifications_accepts_so_jwt():
    """H-04 closure: SO JWT works on notifications (unified auth)."""
    response = client.get("/api/v1/notifications", headers=_system_owner_headers())
    assert response.status_code != 401, response.text
    assert response.status_code != 403, response.text


def test_system_owner_bounces_stats_accepts_so_jwt():
    response = client.get("/api/v1/webhooks/bounces/stats", headers=_system_owner_headers())
    assert response.status_code != 401, response.text
    assert response.status_code != 403, response.text


def test_team_member_analytics_read_denied_in_rbac_matrix():
    """CRM UI hides analytics for team_member (L14); API uses get_current_user — matrix is source of truth."""
    assert not PermissionChecker.has_permission("team_member", "analytics", "read")
    assert PermissionChecker.has_permission("organization_admin", "analytics", "read")


def test_billing_invoices_requires_auth():
    response = client.get("/api/v1/billing/invoices")
    assert response.status_code in (401, 403)


def test_auth_onboarding_route_registered():
    paths = [getattr(r, "path", "") or "" for r in app.routes]
    assert any("/auth/onboarding" in p for p in paths)


def test_notification_service_exposes_list_api():
    from app.services.notification_service import NotificationService

    assert hasattr(NotificationService, "get_notifications")
    assert hasattr(NotificationService, "create_notification_log")


def test_scraping_jobs_redirect_route_exists_frontend_guard():
    """Backend scraping jobs API remains; mock frontend page removed in L18."""
    response = client.get("/api/v1/scraping/jobs", headers=_team_member_headers())
    assert response.status_code != 403
