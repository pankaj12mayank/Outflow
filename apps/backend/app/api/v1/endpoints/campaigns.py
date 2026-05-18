"""
Campaigns API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from app.middleware.rbac import get_current_user_with_role, require_permissions

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: str = None
    status: str = "draft"
    created_at: str = None


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaigns = await campaign_service.get_campaigns(skip, limit)
    return campaigns


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
@require_permissions(["campaigns:create"])
async def create_campaign(
    campaign_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaign = await campaign_service.create_campaign(campaign_in)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
@require_permissions(["campaigns:read"])
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaign = await campaign_service.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
@require_permissions(["campaigns:update"])
async def update_campaign(
    campaign_id: str,
    campaign_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaign = await campaign_service.update_campaign(campaign_id, campaign_in)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permissions(["campaigns:delete"])
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    result = await campaign_service.delete_campaign(campaign_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return None


@router.post("/{campaign_id}/start", response_model=CampaignResponse)
@require_permissions(["campaigns:start"])
async def start_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaign = await campaign_service.start_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.post("/{campaign_id}/pause", response_model=CampaignResponse)
@require_permissions(["campaigns:pause"])
async def pause_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    from app.services.campaign_service import CampaignService
    org_id = current_user.get("organization_id")
    campaign_service = CampaignService(org_id)
    campaign = await campaign_service.pause_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign