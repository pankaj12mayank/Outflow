"""
Email Engine API Endpoints
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.middleware.system_owner_auth import get_current_system_owner
from app.email_engine.services.template import TemplateService
from app.email_engine.services.trigger import TriggerService
from app.email_engine.services.queue import EmailQueueService
from app.email_engine.services.analytics import EmailAnalyticsService
from app.email_engine.services.email_delivery import EmailDeliveryService

router = APIRouter(prefix="/email-engine", tags=["Email Engine"])


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    category: str
    status: str = "draft"
    plan_access: List[str] = ["starter", "growth", "agency"]


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    plan_access: Optional[List[str]] = None


class TriggerCreate(BaseModel):
    name: str
    event_type: str
    template_id: str
    status: str = "active"
    delay_seconds: int = 0
    retry_enabled: bool = True
    retry_limit: int = 3
    priority: int = 5
    plan_access: List[str] = ["starter", "growth", "agency"]


class TriggerUpdate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[str] = None
    status: Optional[str] = None
    delay_seconds: Optional[int] = None
    retry_enabled: Optional[bool] = None
    retry_limit: Optional[int] = None
    priority: Optional[int] = None


class TestEmailRequest(BaseModel):
    to_email: str
    template_id: Optional[str] = None
    variables: Optional[dict] = None


@router.get("/templates")
async def list_templates(
    status: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    skip = (page - 1) * page_size
    templates = await TemplateService.list_templates(
        status=status,
        category=category,
        limit=page_size,
        skip=skip
    )
    return {"templates": templates, "count": len(templates)}


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    template = await TemplateService.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/templates")
async def create_template(
    template: TemplateCreate,
    current_user: dict = Depends(get_current_system_owner)
):
    template_data = template.model_dump()
    template_data["is_system"] = False
    template_data["created_by"] = current_user.get("email")
    result = await TemplateService.create_template(template_data)
    return result


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    template: TemplateUpdate,
    current_user: dict = Depends(get_current_system_owner)
):
    update_data = {k: v for k, v in template.model_dump().items() if v is not None}
    result = await TemplateService.update_template(template_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    result = await TemplateService.delete_template(template_id)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


@router.post("/templates/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    new_name: str,
    current_user: dict = Depends(get_current_system_owner)
):
    organization_id = current_user.get("organization_id", "system")
    try:
        result = await TemplateService.duplicate_template(template_id, new_name, organization_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/templates/{template_id}/preview")
async def preview_template(
    template_id: str,
    variables: dict,
    current_user: dict = Depends(get_current_system_owner)
):
    try:
        result = await TemplateService.render_template(template_id, variables)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/templates/test-email")
async def send_test_email(
    request: TestEmailRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    if request.template_id:
        try:
            rendered = await TemplateService.render_template(request.template_id, request.variables or {})
            result = await EmailDeliveryService.send_email(
                to_email=request.to_email,
                subject=f"[TEST] {rendered.get('subject', 'Test Email')}",
                html_content=rendered.get("html_content", ""),
                text_content=rendered.get("text_content", ""),
                from_email="noreply@outflo.com",
                from_name="Outflo Test"
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        result = await EmailDeliveryService.send_test_email(
            to_email=request.to_email,
            smtp_config={"host": "smtp.gmail.com", "port": 587, "from_email": "test@outflo.com", "from_name": "Outflo"}
        )
        return result


@router.get("/triggers")
async def list_triggers(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    skip = (page - 1) * page_size
    triggers = await TriggerService.list_triggers(
        status=status,
        event_type=event_type,
        limit=page_size,
        skip=skip
    )
    return {"triggers": triggers, "count": len(triggers)}


@router.get("/triggers/{trigger_id}")
async def get_trigger(
    trigger_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    trigger = await TriggerService.get_trigger(trigger_id)
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return trigger


@router.post("/triggers")
async def create_trigger(
    trigger: TriggerCreate,
    current_user: dict = Depends(get_current_system_owner)
):
    trigger_data = trigger.model_dump()
    trigger_data["organization_id"] = current_user.get("organization_id", "system")
    result = await TriggerService.create_trigger(trigger_data)
    return result


@router.put("/triggers/{trigger_id}")
async def update_trigger(
    trigger_id: str,
    trigger: TriggerUpdate,
    current_user: dict = Depends(get_current_system_owner)
):
    update_data = {k: v for k, v in trigger.model_dump().items() if v is not None}
    result = await TriggerService.update_trigger(trigger_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return result


@router.delete("/triggers/{trigger_id}")
async def delete_trigger(
    trigger_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    result = await TriggerService.delete_trigger(trigger_id)
    if not result:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return {"message": "Trigger deleted"}


@router.get("/queue/stats")
async def get_queue_stats(
    current_user: dict = Depends(get_current_system_owner)
):
    organization_id = current_user.get("organization_id")
    stats = await EmailQueueService.get_queue_stats(organization_id)
    return stats


@router.get("/queue/pending")
async def get_pending_emails(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    emails = await EmailQueueService.get_pending_emails(limit)
    return {"emails": emails, "count": len(emails)}


@router.get("/queue/failed")
async def get_failed_emails(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    emails = await EmailQueueService.get_failed_emails(limit)
    return {"emails": emails, "count": len(emails)}


@router.post("/queue/process")
async def process_queue(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    results = await EmailQueueService.process_queue(limit)
    return {"processed": len(results), "results": results}


@router.post("/queue/retry-failed")
async def retry_failed(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    results = await EmailQueueService.retry_failed_emails(limit)
    return {"retried": len(results), "results": results}


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_system_owner)
):
    organization_id = current_user.get("organization_id")
    analytics = await EmailAnalyticsService.get_analytics(organization_id, days)
    return analytics


@router.get("/analytics/time-series")
async def get_time_series(
    metric: str = "sent",
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_system_owner)
):
    organization_id = current_user.get("organization_id")
    series = await EmailAnalyticsService.get_time_series(organization_id, days, metric)
    return {"series": series}


@router.get("/analytics/failures")
async def get_failure_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_system_owner)
):
    organization_id = current_user.get("organization_id")
    stats = await EmailAnalyticsService.get_failure_stats(organization_id, days)
    return stats


@router.get("/analytics/retries")
async def get_retry_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_system_owner)
):
    stats = await EmailAnalyticsService.get_retry_stats(days)
    return stats


@router.get("/logs")
async def get_logs(
    status: Optional[str] = None,
    template_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    skip = (page - 1) * page_size
    organization_id = current_user.get("organization_id")
    logs = await EmailAnalyticsService.list_logs(
        organization_id=organization_id,
        status=status,
        template_id=template_id,
        limit=page_size,
        skip=skip
    )
    return {"logs": logs, "count": len(logs)}