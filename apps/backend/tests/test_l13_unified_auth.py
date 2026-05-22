"""
Layer 13 — Unified auth (org JWT + system-owner JWT) and public CMS slug.
"""

import importlib

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_unified_auth_exported():
    middleware = importlib.import_module("app.middleware")
    assert "get_current_user_or_system_owner" in middleware.__all__
    assert "require_platform_system_owner" in middleware.__all__
    assert "require_billing_user" in middleware.__all__


def test_public_cms_slug_route_registered():
    paths = _paths()
    assert any("/pages/slug/" in p and "public" in p for p in paths)


def test_bounces_stats_route_registered():
    paths = _paths()
    assert any("/bounces/stats" in p for p in paths)


def test_public_cms_slug_without_auth_returns_404_or_200():
    """No bearer token — must not require auth (404 if no published page is OK)."""
    response = client.get("/api/v1/cms/landing/pages/slug/nonexistent-slug-l13/public")
    assert response.status_code in (200, 404), response.text
    assert response.status_code != 401, "Public CMS slug must not return 401"


def test_billing_invoices_unauthenticated_rejected():
    response = client.get("/api/v1/billing/invoices")
    assert response.status_code in (401, 403)
