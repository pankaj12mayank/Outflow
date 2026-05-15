"""
Notifications API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.middleware import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str = None
    is_read: bool = False
    created_at: str = None


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """List notifications for current user."""
    from app.db.mongodb import MongoDB, serialize_doc
    coll = MongoDB.get_collection("notifications")
    cursor = coll.find({
        "user_id": current_user.get("sub"),
        "deleted_at": None
    }).skip(skip).limit(limit).sort("created_at", -1)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark notification as read."""
    from app.db.mongodb import MongoDB
    from bson import ObjectId
    coll = MongoDB.get_collection("notifications")
    try:
        doc_id = ObjectId(notification_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    
    await coll.update_one(
        {"_id": doc_id, "user_id": current_user.get("sub")},
        {"$set": {"is_read": True, "read_at": datetime.utcnow().isoformat()}}
    )
    return {"status": "updated"}


from datetime import datetime
from fastapi import HTTPException