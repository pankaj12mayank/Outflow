"""
Layer 5 — API gaps: leads endpoints, single email-template surface, analytics campaign_id.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.middleware import get_current_user
from app.middleware.rbac import get_current_user_with_role
from app.db.mongodb import MongoDB
from app.services.lead_service import LeadService


def _route_paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_notifications_has_no_email_template_crud_routes():
    paths = _route_paths()
    assert not any("notifications/email-templates" in p for p in paths)


def test_email_templates_router_registered():
    paths = _route_paths()
    assert any(p.endswith("/email-templates") or "/email-templates/" in p for p in paths)


def test_leads_static_routes_registered():
    paths = _route_paths()
    for suffix in ("/leads/stats", "/leads/bulk-delete", "/leads/deduplicate", "/leads/{lead_id}/verify"):
        assert any(suffix in p for p in paths), f"Missing route containing {suffix}"


@pytest.fixture
async def mongo_ready():
    try:
        await MongoDB.connect()
        yield
    except Exception as exc:
        pytest.skip(f"MongoDB not available: {exc}")
    finally:
        await MongoDB.disconnect()


@pytest.mark.asyncio
async def test_lead_service_stats_verify_dedupe(mongo_ready):
    org_id = "l5-svc-org"
    svc = LeadService(org_id)
    coll = MongoDB.get_collection("leads")

    ins = await coll.insert_one({
        "organization_id": org_id,
        "email": "dup@test.com",
        "status": "new",
        "deleted_at": None,
        "created_at": __import__("datetime").datetime.utcnow(),
    })
    lead_id = str(ins.inserted_id)

    stats = await svc.get_stats()
    assert stats["total"] >= 1

    verified = await svc.verify_lead_email(lead_id)
    assert verified.get("email_verified") is True

    ins2 = await coll.insert_one({
        "organization_id": org_id,
        "email": "dup@test.com",
        "status": "new",
        "deleted_at": None,
        "created_at": __import__("datetime").datetime.utcnow(),
    })
    deduped = await svc.deduplicate_leads([lead_id, str(ins2.inserted_id)])
    assert deduped["removed"] >= 1

    bulk = await svc.bulk_delete_leads([lead_id])
    assert bulk["deleted"] >= 0


@pytest.mark.asyncio
async def test_analytics_campaigns_accepts_campaign_id_query(mongo_ready):
    async def override_user():
        return {"sub": "u1", "organization_id": "org-analytics", "email": "a@b.com"}

    app.dependency_overrides[get_current_user] = override_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/analytics/campaigns",
            params={"campaign_id": "507f1f77bcf86cd799439011"},
        )
        assert r.status_code == 200
    app.dependency_overrides.clear()
