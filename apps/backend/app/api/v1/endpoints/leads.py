"""
Leads API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import io
import csv

from app.middleware.rbac import require_permissions
from app.db.mongodb import MongoDB, serialize_doc

router = APIRouter(prefix="/leads", tags=["Leads"])


class LeadResponse(BaseModel):
    id: str
    email: str
    first_name: str = None
    last_name: str = None
    company: str = None
    phone: str = None
    job_title: str = None
    linkedin_url: str = None
    location: str = None
    country: str = None
    industry: str = None
    status: str = "new"
    source: str = None
    created_at: str = None


class BulkIdsRequest(BaseModel):
    ids: List[str] = []


class DeduplicateRequest(BaseModel):
    ids: Optional[List[str]] = None


def _lead_service(org_id: str):
    from app.services.lead_service import LeadService
    return LeadService(org_id)


# --- Static paths (must be before /{lead_id}) ---

@router.get("/stats")
async def get_lead_stats(
    current_user: dict = Depends(require_permissions(["leads:read"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).get_stats()


@router.get("/export")
async def export_leads(
    format: str = "csv",
    current_user: dict = Depends(require_permissions(["leads:read"])),
):
    from fastapi.responses import StreamingResponse

    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("leads")
    cursor = coll.find({"organization_id": org_id, "deleted_at": None})
    leads = [serialize_doc(doc) async for doc in cursor]
    if format == "csv":
        output = io.StringIO()
        if leads:
            writer = csv.DictWriter(output, fieldnames=leads[0].keys())
            writer.writeheader()
            writer.writerows(leads)
        else:
            writer = csv.writer(output)
            writer.writerow(["email"])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=leads.csv"},
        )
    return leads


@router.get("/search", response_model=List[LeadResponse])
async def search_leads(
    q: str = Query(..., min_length=1),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_permissions(["leads:read"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).search_leads(q, skip, limit)


@router.post("/bulk-enrich")
async def bulk_enrich_leads(
    data: BulkIdsRequest,
    current_user: dict = Depends(require_permissions(["leads:enrich"])),
):
    org_id = current_user.get("organization_id")
    lead_service = _lead_service(org_id)
    results = []
    for lid in data.ids:
        result = await lead_service.enrich_lead(lid)
        if result:
            results.append(result)
    return {"enriched": len(results), "leads": results}


@router.post("/bulk-delete")
async def bulk_delete_leads(
    data: BulkIdsRequest,
    current_user: dict = Depends(require_permissions(["leads:delete"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).bulk_delete_leads(data.ids)


@router.post("/deduplicate")
async def deduplicate_leads(
    data: DeduplicateRequest,
    current_user: dict = Depends(require_permissions(["leads:update"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).deduplicate_leads(data.ids)


@router.post("/import", status_code=201)
async def import_leads(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permissions(["leads:create"])),
):
    org_id = current_user.get("organization_id")
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    coll = MongoDB.get_collection("leads")
    count = 0
    for row in reader:
        row["organization_id"] = org_id
        row["created_at"] = datetime.utcnow()
        row["updated_at"] = datetime.utcnow()
        row["deleted_at"] = None
        await coll.insert_one(row)
        count += 1
    return {"imported": count}


@router.get("", response_model=List[LeadResponse])
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_permissions(["leads:read"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).get_leads(skip, limit)


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: dict,
    current_user: dict = Depends(require_permissions(["leads:create"])),
):
    org_id = current_user.get("organization_id")
    return await _lead_service(org_id).create_lead(lead_in)


# --- Dynamic /{lead_id} paths ---

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["leads:read"])),
):
    org_id = current_user.get("organization_id")
    lead = await _lead_service(org_id).get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_in: dict,
    current_user: dict = Depends(require_permissions(["leads:update"])),
):
    org_id = current_user.get("organization_id")
    lead = await _lead_service(org_id).update_lead(lead_id, lead_in)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["leads:delete"])),
):
    org_id = current_user.get("organization_id")
    result = await _lead_service(org_id).delete_lead(lead_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return None


@router.post("/{lead_id}/enrich")
async def enrich_lead(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["leads:enrich"])),
):
    org_id = current_user.get("organization_id")
    result = await _lead_service(org_id).enrich_lead(lead_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return result


@router.post("/{lead_id}/verify")
async def verify_lead(
    lead_id: str,
    current_user: dict = Depends(require_permissions(["leads:update"])),
):
    org_id = current_user.get("organization_id")
    result = await _lead_service(org_id).verify_lead_email(lead_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return result
