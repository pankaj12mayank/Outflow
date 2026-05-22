from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.middleware.auth import require_billing_user
from app.services.auth_service import normalize_role, PermissionChecker
from app.models.billing_models import (
    InvoiceCreate, SubscriptionCreate, PaymentCreate, RefundCreate,
    InvoiceTemplateCreate
)
from app.services.billing_service import (
    BillingService, SubscriptionService, PaymentService,
    RevenueService, InvoiceTemplateService
)
from app.services.invoice_pdf_generator import InvoicePdfGenerator

router = APIRouter(prefix="/billing", tags=["Billing"])


def _billing_org_scope(current_user: dict, organization_id: Optional[str] = None) -> Optional[str]:
    """Org users are scoped to their org; system_owner may pass organization_id filter."""
    role = normalize_role(current_user.get("role"))
    if role == "system_owner":
        return organization_id
    org = current_user.get("organization_id")
    if not org:
        raise HTTPException(status_code=400, detail="User must belong to an organization")
    if organization_id and organization_id != org:
        raise HTTPException(status_code=403, detail="Cannot access another organization's billing data")
    return org


def _require_billing_write(current_user: dict) -> None:
    role = normalize_role(current_user.get("role"))
    if role == "system_owner":
        return
    if not PermissionChecker.has_permission(role, "billing", "update"):
        raise HTTPException(status_code=403, detail="Permission denied. Required: billing:update")


async def _get_invoice_scoped(invoice_id: str, org_scope: Optional[str]) -> dict:
    invoice = await BillingService.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if org_scope and invoice.get("organization_id") != org_scope:
        raise HTTPException(status_code=403, detail="Invoice not found")
    return invoice


async def _get_subscription_scoped(subscription_id: str, org_scope: Optional[str]) -> dict:
    subscription = await SubscriptionService.get_subscription(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if org_scope and subscription.get("organization_id") != org_scope:
        raise HTTPException(status_code=403, detail="Subscription not found")
    return subscription


async def _get_payment_scoped(payment_id: str, org_scope: Optional[str]) -> dict:
    payment = await PaymentService.get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if org_scope and payment.get("organization_id") != org_scope:
        raise HTTPException(status_code=403, detail="Payment not found")
    return payment


@router.get("/invoices", response_model=List[dict])
async def get_invoices(
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user, organization_id)
    return await BillingService.get_all_invoices(org, status, skip, limit)


@router.post("/invoices", response_model=dict)
async def create_invoice(
    invoice: InvoiceCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    invoice_dict = invoice.model_dump()
    org = _billing_org_scope(current_user, invoice_dict.get("organization_id"))
    if org:
        invoice_dict["organization_id"] = org
    return await BillingService.create_invoice(invoice_dict)


@router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user)
    return await _get_invoice_scoped(invoice_id, org)


@router.put("/invoices/{invoice_id}", response_model=dict)
async def update_invoice(
    invoice_id: str,
    invoice: InvoiceCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    invoice_dict = {k: v for k, v in invoice.model_dump().items() if v is not None}
    result = await BillingService.update_invoice(invoice_id, invoice_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    deleted = await BillingService.delete_invoice(invoice_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


@router.post("/invoices/{invoice_id}/send", response_model=dict)
async def send_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    result = await BillingService.send_invoice(invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@router.post("/invoices/{invoice_id}/mark-paid", response_model=dict)
async def mark_invoice_paid(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    result = await BillingService.mark_invoice_paid(invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@router.post("/invoices/{invoice_id}/cancel", response_model=dict)
async def cancel_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    result = await BillingService.cancel_invoice(invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@router.post("/invoices/{invoice_id}/refund", response_model=dict)
async def refund_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_invoice_scoped(invoice_id, org)
    result = await BillingService.refund_invoice(invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user)
    invoice = await _get_invoice_scoped(invoice_id, org)
    template = await InvoiceTemplateService.get_default_template()
    pdf_base64 = await InvoicePdfGenerator.generate_base64(invoice, template)
    return {"pdf_base64": pdf_base64, "invoice_number": invoice.get("invoice_number")}


@router.get("/subscriptions", response_model=List[dict])
async def get_subscriptions(
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user, organization_id)
    return await SubscriptionService.get_all_subscriptions(org, status)


@router.post("/subscriptions", response_model=dict)
async def create_subscription(
    subscription: SubscriptionCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    sub_dict = subscription.model_dump()
    org = _billing_org_scope(current_user, sub_dict.get("organization_id"))
    if org:
        sub_dict["organization_id"] = org
    return await SubscriptionService.create_subscription(sub_dict)


@router.get("/subscriptions/{subscription_id}", response_model=dict)
async def get_subscription(
    subscription_id: str,
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user)
    return await _get_subscription_scoped(subscription_id, org)


@router.put("/subscriptions/{subscription_id}", response_model=dict)
async def update_subscription(
    subscription_id: str,
    subscription: SubscriptionCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_subscription_scoped(subscription_id, org)
    sub_dict = {k: v for k, v in subscription.model_dump().items() if v is not None}
    result = await SubscriptionService.update_subscription(subscription_id, sub_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    immediate: bool = Query(False),
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_subscription_scoped(subscription_id, org)
    result = await SubscriptionService.cancel_subscription(subscription_id, immediate)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.post("/subscriptions/{subscription_id}/reactivate")
async def reactivate_subscription(
    subscription_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_subscription_scoped(subscription_id, org)
    result = await SubscriptionService.reactivate_subscription(subscription_id)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.get("/subscriptions/org/{organization_id}", response_model=dict)
async def get_organization_subscription(
    organization_id: str,
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user, organization_id)
    if not org:
        raise HTTPException(status_code=400, detail="organization_id required")
    subscription = await SubscriptionService.get_organization_subscription(org)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return subscription


@router.get("/payments", response_model=List[dict])
async def get_payments(
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user, organization_id)
    return await PaymentService.get_all_payments(org, status)


@router.post("/payments", response_model=dict)
async def create_payment(
    payment: PaymentCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    payment_dict = payment.model_dump()
    org = _billing_org_scope(current_user, payment_dict.get("organization_id"))
    if org:
        payment_dict["organization_id"] = org
    return await PaymentService.create_payment(payment_dict)


@router.get("/payments/{payment_id}", response_model=dict)
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(require_billing_user),
):
    org = _billing_org_scope(current_user)
    return await _get_payment_scoped(payment_id, org)


@router.post("/payments/{payment_id}/process")
async def process_payment(
    payment_id: str,
    success: bool = Query(True),
    failure_reason: Optional[str] = Query(None),
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_payment_scoped(payment_id, org)
    return await PaymentService.process_payment(payment_id, success, failure_reason)


@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    refund: RefundCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    org = _billing_org_scope(current_user)
    await _get_payment_scoped(payment_id, org)
    result = await PaymentService.refund_payment(payment_id, refund.amount, refund.reason)
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    return result


@router.get("/payments/failed", response_model=List[dict])
async def get_failed_payments(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(require_billing_user),
):
    if normalize_role(current_user.get("role")) != "system_owner":
        raise HTTPException(status_code=403, detail="System owner access required")
    return await PaymentService.get_failed_payments(hours)


@router.get("/revenue/analytics", response_model=dict)
async def get_revenue_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_billing_user),
):
    if normalize_role(current_user.get("role")) != "system_owner":
        raise HTTPException(status_code=403, detail="System owner access required")
    return await RevenueService.get_revenue_analytics(days)


@router.get("/revenue/mrr-arr", response_model=dict)
async def get_mrr_arr(current_user: dict = Depends(require_billing_user)):
    if normalize_role(current_user.get("role")) != "system_owner":
        raise HTTPException(status_code=403, detail="System owner access required")
    return await RevenueService.get_mrr_arr()


@router.post("/revenue/report")
async def generate_revenue_report(
    start_date: str,
    end_date: str,
    period_type: str = Query("monthly"),
    current_user: dict = Depends(require_billing_user),
):
    if normalize_role(current_user.get("role")) != "system_owner":
        raise HTTPException(status_code=403, detail="System owner access required")
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    return await RevenueService.generate_revenue_report(start, end, period_type)


@router.get("/invoice-templates", response_model=List[dict])
async def get_invoice_templates(current_user: dict = Depends(require_billing_user)):
    return await InvoiceTemplateService.get_all_templates()


@router.post("/invoice-templates", response_model=dict)
async def create_invoice_template(
    template: InvoiceTemplateCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    template_dict = template.model_dump()
    return await InvoiceTemplateService.create_template(template_dict)


@router.get("/invoice-templates/{template_id}", response_model=dict)
async def get_invoice_template(
    template_id: str,
    current_user: dict = Depends(require_billing_user),
):
    template = await InvoiceTemplateService.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/invoice-templates/{template_id}", response_model=dict)
async def update_invoice_template(
    template_id: str,
    template: InvoiceTemplateCreate,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    template_dict = {k: v for k, v in template.model_dump().items() if v is not None}
    result = await InvoiceTemplateService.update_template(template_id, template_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.delete("/invoice-templates/{template_id}")
async def delete_invoice_template(
    template_id: str,
    current_user: dict = Depends(require_billing_user),
):
    _require_billing_write(current_user)
    deleted = await InvoiceTemplateService.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@router.get("/invoice-templates/default", response_model=dict)
async def get_default_template(current_user: dict = Depends(require_billing_user)):
    template = await InvoiceTemplateService.get_default_template()
    if not template:
        raise HTTPException(status_code=404, detail="No default template found")
    return template