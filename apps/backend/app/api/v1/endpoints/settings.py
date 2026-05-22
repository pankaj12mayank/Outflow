"""
Organization user settings (profile, org, notification preferences) — L17.
"""

from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import MongoDB, serialize_doc
from app.middleware.rbac import require_permissions

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_NOTIFICATION_PREFS = {
    "email_notifications": True,
    "reply_notifications": True,
    "weekly_digest": True,
    "team_updates": True,
    "product_updates": False,
}


async def _get_user_settings(user_id: str) -> dict:
    coll = MongoDB.get_collection("user_settings")
    doc = await coll.find_one({"user_id": user_id})
    if not doc:
        return dict(DEFAULT_NOTIFICATION_PREFS)
    prefs = doc.get("notifications") or {}
    return {**DEFAULT_NOTIFICATION_PREFS, **prefs}


@router.get("/me")
async def get_my_settings(
    current_user: dict = Depends(require_permissions(["settings:read"])),
):
    await MongoDB.connect()
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    org_id = current_user.get("organization_id")

    user_doc = None
    if user_id:
        try:
            user_doc = await MongoDB.get_collection("users").find_one({"_id": ObjectId(user_id)})
        except Exception:
            user_doc = await MongoDB.get_collection("users").find_one({"_id": user_id})
    if not user_doc:
        user_doc = await MongoDB.get_collection("users").find_one({"email": current_user.get("email")})

    org_doc = None
    if org_id:
        try:
            org_doc = await MongoDB.get_collection("organizations").find_one({"_id": ObjectId(str(org_id))})
        except Exception:
            org_doc = await MongoDB.get_collection("organizations").find_one({"_id": org_id})

    profile = {
        "full_name": (user_doc or {}).get("full_name") or current_user.get("full_name"),
        "email": (user_doc or {}).get("email") or current_user.get("email"),
        "phone": (user_doc or {}).get("phone", ""),
        "timezone": (user_doc or {}).get("timezone", "America/New_York"),
        "bio": (user_doc or {}).get("bio", ""),
    }
    organization = {
        "id": str(org_id) if org_id else None,
        "name": (org_doc or {}).get("name") or current_user.get("organization", {}).get("name"),
        "website": (org_doc or {}).get("website", ""),
        "slug": (org_doc or {}).get("slug", ""),
    }
    notifications = await _get_user_settings(user_id) if user_id else dict(DEFAULT_NOTIFICATION_PREFS)

    return {"profile": profile, "organization": organization, "notifications": notifications}


@router.patch("/profile")
async def update_profile(
    data: dict,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    await MongoDB.connect()
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    allowed = {"full_name", "phone", "timezone", "bio"}
    update = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No valid profile fields to update")
    update["updated_at"] = datetime.utcnow()

    coll = MongoDB.get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await coll.update_one({"_id": oid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    doc = await coll.find_one({"_id": oid})
    return serialize_doc(doc) if doc else {"success": True}


@router.patch("/organization")
async def update_organization_settings(
    data: dict,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization context")

    allowed = {"name", "website", "slug"}
    update = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No valid organization fields to update")

    from app.services.organization_service import OrganizationService

    org = await OrganizationService.update_organization(str(org_id), update)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/notifications")
async def update_notification_preferences(
    data: dict,
    current_user: dict = Depends(require_permissions(["settings:update"])),
):
    await MongoDB.connect()
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    org_id = current_user.get("organization_id")
    allowed_keys = set(DEFAULT_NOTIFICATION_PREFS.keys())
    prefs = {k: bool(v) for k, v in data.items() if k in allowed_keys}

    coll = MongoDB.get_collection("user_settings")
    await coll.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "organization_id": org_id,
                "notifications": prefs,
                "updated_at": datetime.utcnow().isoformat(),
            }
        },
        upsert=True,
    )
    merged = await _get_user_settings(user_id)
    return {"notifications": merged}
