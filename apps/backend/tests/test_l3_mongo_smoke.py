"""
Layer 3 smoke tests — CMS and email paths use MongoDB (no AsyncSessionLocal / SQL stub).
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.middleware.auth import get_current_user
from app.db.mongodb import MongoDB


@pytest.fixture
async def mongo_client():
    try:
        await MongoDB.connect()
        yield
    except Exception as exc:
        pytest.skip(f"MongoDB not available: {exc}")
    finally:
        await MongoDB.disconnect()


@pytest.fixture
async def cms_client(mongo_client):
    async def override_user():
        return {
            "sub": "test-user",
            "email": "admin@outflo.com",
            "role": "system_owner",
            "permissions": ["*"],
            "organization_id": None,
        }

    app.dependency_overrides[get_current_user] = override_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_cms_landing_page_no_attribute_error(cms_client: AsyncClient):
    response = await cms_client.get("/api/v1/cms/landing-page")
    assert response.status_code == 200
    data = response.json()
    assert "hero_title" in data


@pytest.mark.asyncio
async def test_cms_pricing_uses_mongo(cms_client: AsyncClient):
    from app.db.mongodb import get_database

    database = await get_database()
    await database.plans.insert_one({
        "name": "Smoke Plan",
        "slug": "smoke-plan",
        "monthly_price": 9.0,
        "yearly_price": 90.0,
        "features": ["test"],
        "is_active": True,
        "sort_order": 0,
    })

    response = await cms_client.get("/api/v1/cms/pricing")
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert any(p.get("name") == "Smoke Plan" for p in data["plans"])


@pytest.mark.asyncio
async def test_cms_faqs_mongo_roundtrip(cms_client: AsyncClient):
    response = await cms_client.get("/api/v1/cms/faqs")
    assert response.status_code == 200
    assert "faqs" in response.json()


@pytest.mark.asyncio
async def test_email_bounce_check_mongo(mongo_client):
    from app.services.email.email_service import EmailSafetyManager

    coll = MongoDB.get_collection("bounced_emails")
    await coll.insert_one({
        "email": "bounce@example.com",
        "account_id": "1",
        "bounce_type": "hard",
        "bounce_count": 3,
    })

    svc = EmailSafetyManager()
    blocked, reason = await svc.check_bounce("bounce@example.com", 1)
    assert blocked is True
    assert reason


@pytest.mark.asyncio
async def test_sequence_engine_condition_mongo(mongo_client):
    from app.services.email.sequence_engine import (
        SequenceEngine,
        SequenceEnrollment,
        SequenceStep,
        StepType,
        ConditionType,
    )

    emails_coll = MongoDB.get_collection("emails")
    await emails_coll.insert_one({
        "lead_id": "42",
        "sequence_id": "7",
        "replied_at": "2026-01-01T00:00:00",
    })

    engine = SequenceEngine()
    enrollment = SequenceEnrollment(
        lead_id=42,
        sequence_id=7,
        started_at=__import__("datetime").datetime.utcnow(),
        next_send_at=__import__("datetime").datetime.utcnow(),
    )
    step = SequenceStep(
        id="1",
        type=StepType.CONDITION,
        order=0,
        condition_type=ConditionType.REPLIED,
        branch_options=[2],
    )
    matched, branch = await engine._evaluate_condition(enrollment, step)
    assert matched is True
    assert branch == 2
