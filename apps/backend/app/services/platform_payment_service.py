"""Platform payment gateway settings, sales records, and billing lifecycle integration."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.services.plan_service import PlanService, SubscriptionService
from app.services.billing_lifecycle_service import BillingLifecycleService


class PlatformPaymentService:
    SETTINGS_KEY = "payment_gateways"
    TRANSACTIONS = "payment_transactions"

    @staticmethod
    async def _settings_coll():
        return MongoDB.get_collection("platform_settings")

    @staticmethod
    async def get_settings() -> Dict[str, Any]:
        doc = await PlatformPaymentService._settings_coll().find_one(
            {"key": PlatformPaymentService.SETTINGS_KEY}
        )
        defaults = {
            "stripe": {
                "enabled": False,
                "publishable_key": "",
                "secret_key": "",
                "webhook_secret": "",
                "test_mode": True,
            },
            "razorpay": {
                "enabled": False,
                "key_id": "",
                "key_secret": "",
                "webhook_secret": "",
                "test_mode": True,
            },
        }
        if not doc:
            return defaults
        gateways = doc.get("gateways", {})
        for k in defaults:
            defaults[k].update(gateways.get(k, {}))
        return defaults

    @staticmethod
    async def save_settings(gateways: Dict[str, Any]) -> Dict[str, Any]:
        await PlatformPaymentService._settings_coll().update_one(
            {"key": PlatformPaymentService.SETTINGS_KEY},
            {
                "$set": {
                    "gateways": gateways,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        return await PlatformPaymentService.get_settings()

    @staticmethod
    async def list_transactions(limit: int = 50, organization_id: str = None) -> List[Dict]:
        query = {}
        if organization_id:
            query["organization_id"] = organization_id
        rows = await MongoDB.get_collection(PlatformPaymentService.TRANSACTIONS).find(query).sort(
            "created_at", -1
        ).to_list(length=limit)
        return [serialize_doc(r) for r in rows]

    @staticmethod
    async def record_transaction(data: Dict[str, Any]) -> Dict:
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        res = await MongoDB.get_collection(PlatformPaymentService.TRANSACTIONS).insert_one(data)
        data["id"] = str(res.inserted_id)
        return serialize_doc(data)

    @staticmethod
    async def process_test_payment(
        provider: str,
        organization_id: str,
        plan_id: str,
        amount: float,
        currency: str = "usd",
    ) -> Dict:
        """Simulate successful payment, extend subscription, record history + email."""
        plan = await PlanService.get_plan(plan_id)
        if not plan:
            raise ValueError("Plan not found")

        existing_sub = await SubscriptionService.get_subscription(organization_id)
        is_renewal = existing_sub is not None

        period_end = datetime.utcnow() + timedelta(days=30)
        sub_id = None

        if existing_sub:
            await MongoDB.get_collection("subscriptions").update_one(
                {"_id": ObjectId(existing_sub["id"])},
                {
                    "$set": {
                        "plan_id": plan_id,
                        "status": "active",
                        "current_period_start": datetime.utcnow(),
                        "current_period_end": period_end,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            sub_id = existing_sub["id"]
        else:
            sub = await SubscriptionService.create_subscription(
                organization_id,
                plan_id,
                billing_cycle="monthly",
            )
            sub_id = str(sub.get("_id") or sub.get("id", ""))
            period_end = sub.get("current_period_end") or period_end

        await MongoDB.get_collection("organizations").update_one(
            {"_id": ObjectId(organization_id)},
            {
                "$set": {
                    "plan": plan.get("name", "").lower(),
                    "subscription_status": "active",
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        tx = await PlatformPaymentService.record_transaction({
            "provider": provider,
            "organization_id": organization_id,
            "plan_id": plan_id,
            "plan_name": plan.get("name"),
            "amount": amount,
            "currency": currency,
            "status": "succeeded",
            "test_mode": True,
            "description": f"Test payment via {provider}",
            "subscription_id": sub_id,
        })

        event_type = "plan_renewed" if is_renewal else "plan_purchased"
        lifecycle = await BillingLifecycleService.emit_event(
            event_type,
            organization_id,
            plan_id=plan_id,
            plan_name=plan.get("name"),
            amount=amount,
            currency=currency,
            provider=provider,
            transaction_id=tx.get("id"),
            subscription_id=sub_id,
            status="succeeded",
            period_end=period_end if isinstance(period_end, datetime) else None,
        )

        return {
            "transaction": tx,
            "period_end": period_end.isoformat() if hasattr(period_end, "isoformat") else str(period_end),
            "billing": lifecycle,
            "event_type": event_type,
        }

    @staticmethod
    async def record_failed_payment(
        organization_id: str,
        plan_id: str,
        amount: float,
        provider: str,
        failure_reason: str,
        currency: str = "usd",
    ) -> Dict:
        plan = await PlanService.get_plan(plan_id)
        tx = await PlatformPaymentService.record_transaction({
            "provider": provider,
            "organization_id": organization_id,
            "plan_id": plan_id,
            "plan_name": plan.get("name") if plan else None,
            "amount": amount,
            "currency": currency,
            "status": "failed",
            "failure_reason": failure_reason,
            "description": f"Failed payment via {provider}",
        })
        lifecycle = await BillingLifecycleService.emit_event(
            "payment_failed",
            organization_id,
            plan_id=plan_id,
            plan_name=plan.get("name") if plan else None,
            amount=amount,
            currency=currency,
            provider=provider,
            transaction_id=tx.get("id"),
            status="failed",
            failure_reason=failure_reason,
        )
        return {"transaction": tx, "billing": lifecycle}

    @staticmethod
    async def expire_due_subscriptions() -> Dict:
        """Mark expired subscriptions, notify orgs, full billing history."""
        now = datetime.utcnow()
        subs = await MongoDB.get_collection("subscriptions").find({
            "status": "active",
            "current_period_end": {"$lt": now},
        }).to_list(length=500)

        expired_count = 0
        events = []
        for sub in subs:
            org_id = sub.get("organization_id")
            plan = await PlanService.get_plan(sub.get("plan_id"))
            await MongoDB.get_collection("subscriptions").update_one(
                {"_id": sub["_id"]},
                {"$set": {"status": "expired", "updated_at": now}},
            )
            await MongoDB.get_collection("organizations").update_one(
                {"_id": ObjectId(org_id) if isinstance(org_id, str) else org_id},
                {"$set": {"subscription_status": "expired", "updated_at": now}},
            )
            lifecycle = await BillingLifecycleService.emit_event(
                "plan_expired",
                str(org_id),
                plan_id=sub.get("plan_id"),
                plan_name=plan.get("name") if plan else None,
                subscription_id=str(sub["_id"]),
                status="expired",
                period_end=sub.get("current_period_end"),
            )
            events.append(lifecycle)
            expired_count += 1

        return {"expired_count": expired_count, "events": events}
