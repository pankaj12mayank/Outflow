from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.models.notification_models import (
    NotificationCreate, BulkNotificationCreate,
    EmailTemplateCreate, EmailSendRequest,
    NotificationType, NotificationPriority, NotificationChannel
)
from app.services.notification_service import (
    NotificationService, EmailNotificationService,
    EmailLogService, EmailTemplateService,
    NotificationPreferencesService
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("", response_model=dict)
async def create_notification(notification: NotificationCreate):
    notif_dict = notification.model_dump()
    return await NotificationService.create_notification(notif_dict)


@router.post("/bulk", response_model=List[dict])
async def create_bulk_notifications(notification: BulkNotificationCreate):
    notif_dict = notification.model_dump()
    return await NotificationService.create_bulk_notifications(notif_dict)


@router.get("", response_model=List[dict])
async def get_notifications(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    return await NotificationService.get_notifications(user_id, organization_id, is_read, type, skip, limit)


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None)
):
    count = await NotificationService.get_unread_count(user_id, organization_id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: str):
    result = await NotificationService.mark_as_read(notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result


@router.post("/read-all")
async def mark_all_as_read(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None)
):
    count = await NotificationService.mark_all_as_read(user_id, organization_id)
    return {"marked_as_read": count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    deleted = await NotificationService.delete_notification(notification_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}


@router.post("/{notification_id}/archive")
async def archive_notification(notification_id: str):
    result = NotificationService.archive_notification(notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result


@router.post("/email", response_model=dict)
async def send_email(email_request: EmailSendRequest):
    email_dict = email_request.model_dump()
    return await EmailNotificationService.send_email(email_dict)


@router.get("/email-logs", response_model=List[dict])
async def get_email_logs(
    status: Optional[str] = Query(None),
    recipient_email: Optional[str] = Query(None),
    template_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    return await EmailLogService.get_logs(status, recipient_email, template_id, skip, limit)


@router.post("/email-logs/{log_id}/retry")
async def retry_failed_email(log_id: str):
    result = await EmailLogService.retry_failed_email(log_id)
    return result


@router.get("/email-templates", response_model=List[dict])
async def get_email_templates():
    return await EmailTemplateService.get_all_templates()


@router.post("/email-templates", response_model=dict)
async def create_email_template(template: EmailTemplateCreate):
    template_dict = template.model_dump()
    return await EmailTemplateService.create_template(template_dict)


@router.get("/email-templates/{template_id}", response_model=dict)
async def get_email_template(template_id: str):
    template = await EmailTemplateService.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/email-templates/{template_id}", response_model=dict)
async def update_email_template(template_id: str, template: EmailTemplateCreate):
    template_dict = {k: v for k, v in template.model_dump().items() if v is not None}
    result = await EmailTemplateService.update_template(template_id, template_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.delete("/email-templates/{template_id}")
async def delete_email_template(template_id: str):
    deleted = await EmailTemplateService.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}


@router.get("/preferences", response_model=dict)
async def get_preferences(user_id: str = Query(...)):
    return await NotificationPreferencesService.get_preferences(user_id)


@router.put("/preferences", response_model=dict)
async def update_preferences(user_id: str = Query(...), **prefs):
    return await NotificationPreferencesService.update_preferences(user_id, prefs)


@router.get("/types")
async def get_notification_types():
    return {"types": [e.value for e in NotificationType]}


@router.get("/channels")
async def get_notification_channels():
    return {"channels": [e.value for e in NotificationChannel]}