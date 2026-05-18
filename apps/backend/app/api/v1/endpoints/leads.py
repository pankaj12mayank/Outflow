"""
Leads API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from app.middleware.rbac import get_current_user_with_role, require_permissions

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


@router.get("", response_model=List[LeadResponse])
@require_permissions(["leads:read"])
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    leads = await lead_service.get_leads(skip, limit)
    return leads


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
@require_permissions(["leads:create"])
async def create_lead(
    lead_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    lead = await lead_service.create_lead(lead_in)
    return lead


@router.get("/{lead_id}", response_model=LeadResponse)
@require_permissions(["leads:read"])
async def get_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    lead = await lead_service.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
@require_permissions(["leads:update"])
async def update_lead(
    lead_id: str,
    lead_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    lead = await lead_service.update_lead(lead_id, lead_in)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permissions(["leads:delete"])
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    result = await lead_service.delete_lead(lead_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return None


@router.get("/search", response_model=List[LeadResponse])
@require_permissions(["leads:read"])
async def search_leads(
    q: str,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.lead_service import LeadService
    org_id = current_user.get("organization_id")
    lead_service = LeadService(org_id)
    leads = await lead_service.search_leads(q, skip, limit)
    return leads