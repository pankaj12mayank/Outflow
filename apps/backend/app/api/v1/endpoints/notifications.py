from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.middleware.auth import get_current_user
from app.models.notification_models import (
    NotificationCreate, BulkNotificationCreate,
    EmailSendRequest,
    NotificationType, NotificationPriority, NotificationChannel
)
from app.services.notification_service import (
    NotificationService, EmailNotificationService,
    EmailLogService,
    NotificationPreferencesService
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("", response_model=dict)
async def create_notification(notification: NotificationCreate, current_user: dict = Depends(get_current_user)):
    notif_dict = notification.model_dump()
    return await NotificationService.create_notification(notif_dict)


@router.post("/bulk", response_model=List[dict])
async def create_bulk_notifications(notification: BulkNotificationCreate, current_user: dict = Depends(get_current_user)):
    notif_dict = notification.model_dump()
    return await NotificationService.create_bulk_notifications(notif_dict)


@router.get("", response_model=List[dict])
async def get_notifications(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    return await NotificationService.get_notifications(user_id, organization_id, is_read, type, skip, limit)


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    count = await NotificationService.get_unread_count(user_id, organization_id)
    return {"unread_count": count}


@router.patch("/{notification_id}")
async def patch_notification(notification_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    from app.db.mongodb import MongoDB
    coll = MongoDB.get_collection("notifications")
    allowed = {k: v for k, v in data.items() if k in ("read", "archived")}
    if not allowed:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    result = await coll.update_one({"_id": ObjectId(notification_id)}, {"$set": allowed})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await NotificationService.mark_as_read(notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result


@router.post("/read-all")
async def mark_all_as_read(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    count = await NotificationService.mark_all_as_read(user_id, organization_id)
    return {"marked_as_read": count}


@router.post("/mark-all-read")
async def mark_all_as_read_alias(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await mark_all_as_read(user_id, organization_id, current_user)


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    deleted = await NotificationService.delete_notification(notification_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}


@router.post("/{notification_id}/archive")
async def archive_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await NotificationService.archive_notification(notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result


@router.post("/email", response_model=dict)
async def send_email(email_request: EmailSendRequest, current_user: dict = Depends(get_current_user)):
    email_dict = email_request.model_dump()
    return await EmailNotificationService.send_email(email_dict)


@router.get("/email-logs", response_model=List[dict])
async def get_email_logs(
    status: Optional[str] = Query(None),
    recipient_email: Optional[str] = Query(None),
    template_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    return await EmailLogService.get_logs(status, recipient_email, template_id, skip, limit)


@router.post("/email-logs/{log_id}/retry")
async def retry_failed_email(log_id: str, current_user: dict = Depends(get_current_user)):
    result = await EmailLogService.retry_failed_email(log_id)
    return result


@router.get("/preferences", response_model=dict)
async def get_preferences(user_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    return await NotificationPreferencesService.get_preferences(user_id)


@router.api_route("/preferences", methods=["PUT", "POST"], response_model=dict)
async def update_preferences(user_id: str = Query(...), current_user: dict = Depends(get_current_user), **prefs):
    return await NotificationPreferencesService.update_preferences(user_id, prefs)


@router.get("/types")
async def get_notification_types(current_user: dict = Depends(get_current_user)):
    return {"types": [e.value for e in NotificationType]}


@router.get("/channels")
async def get_notification_channels(current_user: dict = Depends(get_current_user)):
    return {"channels": [e.value for e in NotificationChannel]}


@router.get("/counts")
async def get_notification_counts(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    org_id = current_user.get("organization_id")
    count = await NotificationService.get_unread_count(user_id, org_id)
    return {"unread_count": count, "total_count": 0}


@router.post("/polling")
async def polling_check(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.get("/polling/notifications")
async def poll_notifications(
    since: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("sub")
    since_dt = datetime.fromisoformat(since) if since else datetime.utcnow()
    notifications = await NotificationService.get_notifications(user_id=user_id, skip=0, limit=20)
    return {"data": notifications, "timestamp": datetime.utcnow().isoformat()}


@router.get("/polling/campaigns")
async def poll_campaigns(
    since: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    from app.db.mongodb import MongoDB
    coll = MongoDB.get_collection("campaigns")
    filter_query = {"organization_id": org_id}
    if since:
        filter_query["updated_at"] = {"$gt": since}
    cursor = coll.find(filter_query).sort("updated_at", -1).limit(10)
    results = []
    async for doc in cursor:
        results.append({k: v for k, v in doc.items() if k != "_id"})
    return {"data": results, "timestamp": datetime.utcnow().isoformat()}


@router.get("/polling/jobs")
async def poll_jobs(
    since: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    from app.db.mongodb import MongoDB
    coll = MongoDB.get_collection("scraping_jobs")
    filter_query = {"organization_id": org_id}
    if since:
        filter_query["updated_at"] = {"$gt": since}
    cursor = coll.find(filter_query).sort("updated_at", -1).limit(10)
    results = []
    async for doc in cursor:
        results.append({k: v for k, v in doc.items() if k != "_id"})
    return {"data": results, "timestamp": datetime.utcnow().isoformat()}