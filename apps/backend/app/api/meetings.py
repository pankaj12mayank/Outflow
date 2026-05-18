"""
Meeting Booking API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.middleware import get_current_user
from app.db.mongodb import MongoDB
from bson import ObjectId

router = APIRouter(prefix="/meetings", tags=["Meetings"])


class MeetingRequest(BaseModel):
    lead_id: str
    title: str
    description: Optional[str] = None
    scheduled_at: str
    duration_minutes: int = 30
    meeting_link: Optional[str] = None


class MeetingResponse(BaseModel):
    id: str
    title: str
    scheduled_at: str
    status: str
    lead_id: str


@router.post("")
async def create_meeting(
    meeting: MeetingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new meeting."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    meeting_data = {
        "organization_id": org_id,
        "lead_id": meeting.lead_id,
        "title": meeting.title,
        "description": meeting.description,
        "scheduled_at": meeting.scheduled_at,
        "duration_minutes": meeting.duration_minutes,
        "meeting_link": meeting.meeting_link,
        "status": "scheduled",
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user.get("sub")
    }
    
    result = await MongoDB.get_collection("meetings").insert_one(meeting_data)
    
    return {
        "id": str(result.inserted_id),
        "title": meeting.title,
        "scheduled_at": meeting.scheduled_at,
        "status": "scheduled"
    }


@router.get("")
async def list_meetings(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List all meetings."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    query = {"organization_id": org_id}
    if status:
        query["status"] = status
    
    meetings = await MongoDB.get_collection("meetings").find(query).to_list(50)
    
    return [
        {
            "id": str(m["_id"]),
            "title": m.get("title"),
            "scheduled_at": m.get("scheduled_at"),
            "status": m.get("status"),
            "lead_id": m.get("lead_id")
        }
        for m in meetings
    ]


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
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
    current_user: dict = Depends(get_current_user),
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
    current_user: dict = Depends(get_current_user),
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