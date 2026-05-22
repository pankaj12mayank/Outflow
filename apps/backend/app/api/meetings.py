"""
Meeting Booking API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB
from bson import ObjectId

router = APIRouter(prefix="/meetings", tags=["Meetings"])


class MeetingRequest(BaseModel):
    lead_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_at: str
    duration_minutes: int = 30
    meeting_link: Optional[str] = None
    event_type: Optional[str] = "meeting"


class MeetingResponse(BaseModel):
    id: str
    title: str
    scheduled_at: str
    status: str
    lead_id: Optional[str] = None
    duration_minutes: Optional[int] = 30
    description: Optional[str] = None
    event_type: Optional[str] = "meeting"


@router.post("")
async def create_meeting(
    meeting: MeetingRequest,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    """Create a new meeting."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    meeting_data = {
        "organization_id": org_id,
        "lead_id": meeting.lead_id or "calendar",
        "title": meeting.title,
        "description": meeting.description,
        "scheduled_at": meeting.scheduled_at,
        "duration_minutes": meeting.duration_minutes,
        "meeting_link": meeting.meeting_link,
        "event_type": meeting.event_type or "meeting",
        "status": "scheduled",
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user.get("sub"),
    }

    result = await MongoDB.get_collection("meetings").insert_one(meeting_data)
    inserted = await MongoDB.get_collection("meetings").find_one({"_id": result.inserted_id})

    return {
        "id": str(result.inserted_id),
        "title": meeting.title,
        "scheduled_at": meeting.scheduled_at,
        "status": "scheduled",
        "lead_id": meeting.lead_id,
        "duration_minutes": meeting.duration_minutes,
        "description": meeting.description,
        "event_type": meeting.event_type or "meeting",
        "time": _meeting_display_time(meeting.scheduled_at),
    }


def _meeting_display_time(scheduled_at: str) -> str:
    try:
        dt = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
        return dt.strftime("%I:%M %p").lstrip("0")
    except ValueError:
        return scheduled_at


@router.get("")
async def list_meetings(
    status: Optional[str] = None,
    current_user: dict = Depends(require_permissions(["settings:read"])),
):
    """List all meetings."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    query = {"organization_id": org_id}
    if status:
        query["status"] = status
    
    meetings = await MongoDB.get_collection("meetings").find(query).to_list(50)
    
    results = []
    for m in meetings:
        st = m.get("status")
        if status:
            if st != status:
                continue
        elif st == "cancelled":
            continue
        results.append(
            {
                "id": str(m["_id"]),
                "title": m.get("title"),
                "scheduled_at": m.get("scheduled_at"),
                "status": st,
                "lead_id": m.get("lead_id"),
                "duration_minutes": m.get("duration_minutes", 30),
                "description": m.get("description"),
                "event_type": m.get("event_type", "meeting"),
                "time": _meeting_display_time(m.get("scheduled_at", "")),
            }
        )
    return results


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(require_permissions(["settings:read"])),
):
    """Get meeting details."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    try:
        oid = ObjectId(meeting_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    meeting = await MongoDB.get_collection("meetings").find_one({
        "_id": oid,
        "organization_id": org_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {
        "id": str(meeting["_id"]),
        "title": meeting.get("title"),
        "description": meeting.get("description"),
        "scheduled_at": meeting.get("scheduled_at"),
        "duration_minutes": meeting.get("duration_minutes"),
        "meeting_link": meeting.get("meeting_link"),
        "status": meeting.get("status")
    }


@router.patch("/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    status: str,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    """Update meeting status."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    try:
        oid = ObjectId(meeting_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    result = await MongoDB.get_collection("meetings").update_one(
        {"_id": oid, "organization_id": org_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"success": True, "status": status}


@router.delete("/{meeting_id}")
async def cancel_meeting(
    meeting_id: str,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    """Cancel a meeting."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    try:
        oid = ObjectId(meeting_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    result = await MongoDB.get_collection("meetings").update_one(
        {"_id": oid, "organization_id": org_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"success": True, "message": "Meeting cancelled"}