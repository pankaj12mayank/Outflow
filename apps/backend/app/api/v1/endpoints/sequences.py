from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB, serialize_doc

router = APIRouter(prefix="/sequences", tags=["Sequences"])


class SequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    status: str = "draft"
    steps: List[dict] = Field(default_factory=list)
    channels: List[str] = Field(default_factory=lambda: ["email"])
    total_enrolled: int = 0
    active_enrolled: int = 0
    completed: int = 0
    avg_response_rate: float = 0.0
    avg_time_to_response: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def _sequence_defaults(data: dict) -> dict:
    return {
        "name": data.get("name"),
        "description": data.get("description", ""),
        "is_active": data.get("is_active", data.get("status") == "active"),
        "status": data.get("status", "draft"),
        "steps": data.get("steps") or [],
        "channels": data.get("channels") or ["email"],
        "total_enrolled": data.get("total_enrolled", 0),
        "active_enrolled": data.get("active_enrolled", 0),
        "completed": data.get("completed", 0),
        "avg_response_rate": data.get("avg_response_rate", 0.0),
        "avg_time_to_response": data.get("avg_time_to_response"),
    }


@router.get("", response_model=List[SequenceResponse])
async def list_sequences(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_permissions(["sequences:read"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    filter_query = {"organization_id": org_id}
    cursor = coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    results = []
    async for doc in cursor:
        results.append(serialize_doc(doc))
    return results


@router.get("/{sequence_id}", response_model=SequenceResponse)
async def get_sequence(
    sequence_id: str,
    current_user: dict = Depends(require_permissions(["sequences:read"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId
    doc = await coll.find_one({"_id": ObjectId(sequence_id), "organization_id": org_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return serialize_doc(doc)


@router.post("", response_model=SequenceResponse, status_code=status.HTTP_201_CREATED)
async def create_sequence(
    data: dict,
    current_user: dict = Depends(require_permissions(["sequences:create"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    now = datetime.utcnow()
    doc = {
        "organization_id": org_id,
        **_sequence_defaults(data),
        "created_at": now,
        "updated_at": now,
    }
    result = await coll.insert_one(doc)
    created = await coll.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.patch("/{sequence_id}", response_model=SequenceResponse)
async def update_sequence(
    sequence_id: str,
    data: dict,
    current_user: dict = Depends(require_permissions(["sequences:update"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId

    allowed = {
        "name",
        "description",
        "is_active",
        "status",
        "steps",
        "channels",
        "total_enrolled",
        "active_enrolled",
        "completed",
        "avg_response_rate",
        "avg_time_to_response",
    }
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
    if "status" in update_data:
        if update_data["status"] == "active":
            update_data["is_active"] = True
        elif update_data["status"] in ("paused", "draft"):
            update_data["is_active"] = False
    if "is_active" in update_data and "status" not in update_data:
        update_data["status"] = "active" if update_data["is_active"] else "paused"
    update_data["updated_at"] = datetime.utcnow()
    result = await coll.update_one(
        {"_id": ObjectId(sequence_id), "organization_id": org_id},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sequence not found")
    doc = await coll.find_one({"_id": ObjectId(sequence_id)})
    return serialize_doc(doc)


@router.delete("/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sequence(
    sequence_id: str,
    current_user: dict = Depends(require_permissions(["sequences:delete"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId
    result = await coll.delete_one({"_id": ObjectId(sequence_id), "organization_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return None


@router.post("/{sequence_id}/duplicate", response_model=SequenceResponse)
async def duplicate_sequence(
    sequence_id: str,
    current_user: dict = Depends(require_permissions(["sequences:create"])),
):
    await MongoDB.connect()
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId
    original = await coll.find_one({"_id": ObjectId(sequence_id), "organization_id": org_id})
    if not original:
        raise HTTPException(status_code=404, detail="Sequence not found")
    duplicate = {k: v for k, v in original.items() if k not in ("_id", "created_at", "updated_at")}
    duplicate["name"] = f"{duplicate.get('name', 'Sequence')} (Copy)"
    duplicate["status"] = "draft"
    duplicate["is_active"] = False
    duplicate["active_enrolled"] = 0
    duplicate["created_at"] = datetime.utcnow()
    duplicate["updated_at"] = datetime.utcnow()
    result = await coll.insert_one(duplicate)
    created = await coll.find_one({"_id": result.inserted_id})
    return serialize_doc(created)
