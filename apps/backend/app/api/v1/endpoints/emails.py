from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB, serialize_doc

router = APIRouter(prefix="/emails", tags=["Emails"])


class EmailResponse(BaseModel):
    id: str
    from_email: str
    to_email: str
    subject: str
    status: str
    created_at: Optional[datetime] = None


@router.get("", response_model=List[EmailResponse])
async def list_emails(
    campaign_id: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    filter_query = {"organization_id": org_id}
    if campaign_id:
        filter_query["campaign_id"] = campaign_id
    if lead_id:
        filter_query["lead_id"] = lead_id
    cursor = coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    results = []
    async for doc in cursor:
        results.append(serialize_doc(doc))
    return results


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    from bson import ObjectId
    doc = await coll.find_one({"_id": ObjectId(email_id), "organization_id": org_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    return serialize_doc(doc)


@router.get("/thread/{lead_id}", response_model=List[EmailResponse])
async def get_email_thread(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    cursor = coll.find({"organization_id": org_id, "lead_id": lead_id}).sort("created_at", 1)
    results = []
    async for doc in cursor:
        results.append(serialize_doc(doc))
    return results


@router.post("/{email_id}/track")
async def track_email(
    email_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    from bson import ObjectId
    result = await coll.update_one(
        {"_id": ObjectId(email_id), "organization_id": org_id},
        {"$set": {"opened_at": datetime.utcnow(), "status": "opened"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"success": True}
