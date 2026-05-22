from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB, serialize_doc

router = APIRouter(prefix="/sequences", tags=["Sequences"])


class SequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    total_enrolled: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@router.get("", response_model=List[SequenceResponse])
async def list_sequences(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_permissions(["sequences:read"])),
):
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
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    doc = {
        "organization_id": org_id,
        "name": data.get("name"),
        "description": data.get("description", ""),
        "is_active": data.get("is_active", True),
        "total_enrolled": 0,
        "active_enrolled": 0,
        "completed": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await coll.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.patch("/{sequence_id}", response_model=SequenceResponse)
async def update_sequence(
    sequence_id: str,
    data: dict,
    current_user: dict = Depends(require_permissions(["sequences:update"])),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    result = await coll.update_one(
        {"_id": ObjectId(sequence_id), "organization_id": org_id},
        {"$set": update_data}
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
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("campaign_sequences")
    from bson import ObjectId
    original = await coll.find_one({"_id": ObjectId(sequence_id), "organization_id": org_id})
    if not original:
        raise HTTPException(status_code=404, detail="Sequence not found")
    duplicate = {k: v for k, v in original.items() if k not in ("_id", "created_at", "updated_at")}
    duplicate["name"] = f"{duplicate.get('name', 'Sequence')} (Copy)"
    duplicate["created_at"] = datetime.utcnow()
    duplicate["updated_at"] = datetime.utcnow()
    result = await coll.insert_one(duplicate)
    duplicate["id"] = str(result.inserted_id)
    return duplicate
