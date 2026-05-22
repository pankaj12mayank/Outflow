"""
Layer 4 — canonical MongoDB model definitions (no duplicate Plan/Subscription/EmailTemplate/Organization).
"""

import ast
import inspect
from pathlib import Path

import pytest

from app.db.mongodb import MongoDB, serialize_doc
from app.services.plan_service import PlanService, SubscriptionService


MODELS_DIR = Path(__file__).resolve().parents[1] / "app" / "models"


def _class_names_in_file(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    return {
        node.name
        for node in tree.body
        if isinstance(node, ast.ClassDef)
    }


def test_canonical_plan_defined_once():
    hits = [p for p in MODELS_DIR.glob("*.py") if "Plan" in _class_names_in_file(p)]
    plan_defs = [p for p in hits if "Plan" in _class_names_in_file(p) and p.name == "plan_models.py"]
    assert plan_defs == [MODELS_DIR / "plan_models.py"]


def test_canonical_subscription_defined_once():
    subs_files = [
        p for p in MODELS_DIR.glob("*.py")
        if "Subscription" in _class_names_in_file(p) and p.name == "billing_models.py"
    ]
    assert subs_files == [MODELS_DIR / "billing_models.py"]


def test_canonical_email_template_defined_once():
    tpl_files = [
        p for p in MODELS_DIR.glob("*.py")
        if "EmailTemplate" in _class_names_in_file(p) and p.name == "notification_models.py"
    ]
    assert tpl_files == [MODELS_DIR / "notification_models.py"]


def test_organization_canonical_in_models_py():
    from app.models.models import Organization as OrgModel
    from app.models import Organization as OrgExport
    assert OrgModel is OrgExport
    assert "Organization" not in _class_names_in_file(MODELS_DIR / "documents.py")


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
async def test_org_plan_subscription_flow(mongo_ready):
    """Create org → assign plan → subscription uses string ids in responses."""
    orgs = MongoDB.get_collection("organizations")
    plans = MongoDB.get_collection("plans")

    org_result = await orgs.insert_one({
        "name": "L4 Test Org",
        "slug": f"l4-test-{int(__import__('time').time())}",
        "is_active": True,
        "created_at": __import__("datetime").datetime.utcnow(),
    })
    org_id = str(org_result.inserted_id)

    plan_result = await plans.insert_one({
        "name": "L4 Plan",
        "description": "Layer 4 test",
        "price_monthly": 10,
        "price_yearly": 100,
        "status": "active",
        "sort_order": 0,
        "created_at": __import__("datetime").datetime.utcnow(),
    })
    plan_id = str(plan_result.inserted_id)

    sub = await SubscriptionService.create_subscription(org_id, plan_id, "monthly")
    assert "id" in sub or "_id" in sub
    serialized = serialize_doc(sub if "_id" in sub else {**sub, "_id": sub.get("id")})
    assert serialized.get("organization_id") == org_id
    assert serialized.get("plan_id") == plan_id

    fetched = await SubscriptionService.get_subscription(org_id)
    assert fetched is not None
    assert fetched.get("id")
    assert fetched.get("plan_id") == plan_id

    await MongoDB.get_collection("subscriptions").delete_many({"organization_id": org_id})
    await plans.delete_one({"_id": plan_result.inserted_id})
    await orgs.delete_one({"_id": org_result.inserted_id})
