"""
Layer 11 — Analytics and campaign CRM API routes registered.
"""

from app.main import app


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_analytics_overview_route():
    paths = _paths()
    assert any("/analytics/overview" in p for p in paths)


def test_analytics_leads_sources_route():
    paths = _paths()
    assert any("/analytics/leads" in p for p in paths)


def test_analytics_campaigns_list_route():
    paths = _paths()
    assert any("/analytics/campaigns" in p for p in paths)


def test_emails_list_for_campaign_detail():
    paths = _paths()
    assert any(p.rstrip("/") == "/api/v1/emails" or "/emails" in p for p in paths)
