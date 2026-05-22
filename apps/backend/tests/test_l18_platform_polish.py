"""
Layer 18 — Platform polish: analytics accuracy, onboarding, scraping redirect, SO nav routes.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_auth_onboarding_route_registered():
    paths = _paths()
    assert any("/auth/onboarding" in p for p in paths)


def test_analytics_overview_route_registered():
    paths = _paths()
    assert any("/analytics/overview" in p for p in paths)


def test_analytics_activity_feed_route_registered():
    paths = _paths()
    assert any("/analytics/activity-feed" in p for p in paths)


def test_analytics_overview_requires_auth():
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code in (401, 403)


def test_auth_onboarding_requires_auth():
    response = client.patch("/api/v1/auth/onboarding", json={"timezone": "UTC"})
    assert response.status_code in (401, 403)


def test_legacy_system_owner_router_still_mounted():
    paths = _paths()
    assert any("/system-owner" in p for p in paths)


def test_canonical_system_owner_auth_router_registered():
    paths = _paths()
    assert any("/system-owner-auth" in p for p in paths)
