"""System Owner payment gateway configuration and sales."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.platform_payment_service import PlatformPaymentService


router = APIRouter(prefix="/system-owner/payments", tags=["Payment Gateways"])


class PaymentSettingsBody(BaseModel):
    stripe: Optional[dict] = None
    razorpay: Optional[dict] = None


class TestPaymentBody(BaseModel):
    provider: str
    organization_id: str
    plan_id: str
    amount: float
    currency: str = "usd"


class TestFailedPaymentBody(BaseModel):
    provider: str
    organization_id: str
    plan_id: str
    amount: float
    failure_reason: str = "Card declined (test)"
    currency: str = "usd"


@router.get("/settings")
async def get_payment_settings(_: dict = Depends(get_current_system_owner)):
    return {"gateways": await PlatformPaymentService.get_settings()}


@router.put("/settings")
async def save_payment_settings(
    body: PaymentSettingsBody,
    _: dict = Depends(get_current_system_owner),
):
    current = await PlatformPaymentService.get_settings()
    if body.stripe is not None:
        current["stripe"] = {**current.get("stripe", {}), **body.stripe}
    if body.razorpay is not None:
        current["razorpay"] = {**current.get("razorpay", {}), **body.razorpay}
    saved = await PlatformPaymentService.save_settings(current)
    return {"gateways": saved, "message": "Payment settings saved"}


@router.get("/transactions")
async def list_transactions(
    limit: int = 50,
    _: dict = Depends(get_current_system_owner),
):
    txs = await PlatformPaymentService.list_transactions(limit)
    return {"transactions": txs, "count": len(txs)}


@router.post("/test")
async def test_payment(
    body: TestPaymentBody,
    _: dict = Depends(get_current_system_owner),
):
    try:
        result = await PlatformPaymentService.process_test_payment(
            body.provider,
            body.organization_id,
            body.plan_id,
            body.amount,
            body.currency,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/test-failed")
async def test_failed_payment(
    body: TestFailedPaymentBody,
    _: dict = Depends(get_current_system_owner),
):
    result = await PlatformPaymentService.record_failed_payment(
        body.organization_id,
        body.plan_id,
        body.amount,
        body.provider,
        body.failure_reason,
        body.currency,
    )
    return result


@router.post("/sync-expirations")
async def sync_expirations(_: dict = Depends(get_current_system_owner)):
    result = await PlatformPaymentService.expire_due_subscriptions()
    return {
        "expired_count": result.get("expired_count", 0),
        "message": f"Processed {result.get('expired_count', 0)} expired subscriptions",
    }
