from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB, serialize_doc

router = APIRouter(prefix="/emails", tags=["Emails"])


class EmailResponse(BaseModel):
    id: str
    from_email: Optional[str] = None
    to_email: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


def _format_email_time(value) -> tuple[str, str]:
    if not value:
        return ("", "")
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return (value[:10], "")
    else:
        dt = value
    return (dt.strftime("%Y-%m-%d"), dt.strftime("%I:%M %p").lstrip("0"))


def _map_inbox_item(doc: dict) -> dict:
    created = doc.get("created_at")
    date_str, time_str = _format_email_time(created)
    from_email = doc.get("from_email") or doc.get("sender_email") or ""
    from_name = doc.get("from_name") or doc.get("sender_name") or (
        from_email.split("@")[0] if from_email else "Unknown"
    )
    body = doc.get("body") or doc.get("html_body") or doc.get("text_body") or ""
    preview = doc.get("preview") or (body[:160] + "…" if len(body) > 160 else body)
    direction = doc.get("direction") or doc.get("folder")
    folder = "sent" if direction in ("outbound", "sent") else "inbox"
    status = (doc.get("status") or "").lower()
    read = status not in ("unread", "pending", "queued") and doc.get("read", True)

    return {
        **serialize_doc(doc),
        "from": {
            "name": from_name,
            "email": from_email,
            "avatar": "".join(part[0] for part in from_name.split()[:2]).upper()[:2],
        },
        "subject": doc.get("subject") or "(No subject)",
        "preview": preview,
        "body": body,
        "date": date_str,
        "time": time_str,
        "read": read,
        "starred": bool(doc.get("starred", False)),
        "folder": folder,
        "classification": doc.get("classification"),
        "labels": doc.get("labels") or [],
        "lead_id": doc.get("lead_id"),
    }


@router.get("/inbox")
async def list_inbox(
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    """Inbox threads/messages for the org (L16)."""
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    cursor = (
        coll.find({"organization_id": org_id})
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    results = []
    async for doc in cursor:
        results.append(_map_inbox_item(doc))
    return results


@router.get("", response_model=List[EmailResponse])
async def list_emails(
    campaign_id: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    await MongoDB.connect()
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


@router.get("/thread/{lead_id}", response_model=List[EmailResponse])
async def get_email_thread(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    cursor = coll.find({"organization_id": org_id, "lead_id": lead_id}).sort("created_at", 1)
    results = []
    async for doc in cursor:
        results.append(serialize_doc(doc))
    return results


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    from bson import ObjectId
    doc = await coll.find_one({"_id": ObjectId(email_id), "organization_id": org_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    return serialize_doc(doc)


@router.post("/{email_id}/track")
async def track_email(
    email_id: str,
    current_user: dict = Depends(require_permissions(["campaigns:read"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("email_messages")
    from bson import ObjectId
    result = await coll.update_one(
        {"_id": ObjectId(email_id), "organization_id": org_id},
        {"$set": {"opened_at": datetime.utcnow(), "status": "opened"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"success": True}
