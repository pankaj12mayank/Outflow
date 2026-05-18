"""System Owner: plan billing history and email templates."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.billing_lifecycle_service import BillingLifecycleService


router = APIRouter(prefix="/system-owner/billing", tags=["Billing (System Owner)"])


class BillingTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    is_active: Optional[bool] = None


class TestBillingEmailBody(BaseModel):
    template_type: str
    recipient_email: str
    variables: Optional[dict] = None


@router.get("/history")
async def get_billing_history(
    organization_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    _: dict = Depends(get_current_system_owner),
):
    return await BillingLifecycleService.list_history(organization_id, event_type, limit, skip)


@router.get("/email-templates")
async def list_billing_email_templates(_: dict = Depends(get_current_system_owner)):
    templates = await BillingLifecycleService.list_billing_templates()
    return {"templates": templates, "count": len(templates)}


@router.post("/email-templates/seed")
async def seed_billing_templates(_: dict = Depends(get_current_system_owner)):
    templates = await BillingLifecycleService.seed_billing_templates()
    return {"templates": templates, "message": "Billing email templates ready"}


@router.put("/email-templates/{template_id}")
async def update_billing_template(
    template_id: str,
    body: BillingTemplateUpdate,
    _: dict = Depends(get_current_system_owner),
):
    result = await BillingLifecycleService.update_billing_template(
        template_id, body.model_dump(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.post("/email-templates/test")
async def test_billing_email(
    body: TestBillingEmailBody,
    _: dict = Depends(get_current_system_owner),
):
    result = await BillingLifecycleService.send_billing_email(
        body.template_type,
        body.recipient_email,
        body.variables or {},
        "system",
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Send failed"))
    return {"message": "Test email sent", "result": result}
