"""
Layer 17 — Settings, billing auth, and AI settings routes.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_settings_me_route_registered():
    paths = _paths()
    assert any("/settings/me" in p for p in paths)


def test_settings_patch_routes_registered():
    paths = _paths()
    assert any("/settings/profile" in p for p in paths)
    assert any("/settings/organization" in p for p in paths)
    assert any("/settings/notifications" in p for p in paths)


def test_plans_landing_route_registered():
    paths = _paths()
    assert any("/plans/landing" in p for p in paths)


def test_billing_subscriptions_requires_auth():
    response = client.get("/api/v1/billing/subscriptions")
    assert response.status_code in (401, 403)


def test_ai_settings_route_registered():
    paths = _paths()
    assert any("/ai/settings" in p for p in paths)


def test_settings_get_unauthenticated():
    response = client.get("/api/v1/settings/me")
    assert response.status_code in (401, 403)
