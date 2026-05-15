"""
Analytics API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.middleware import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class AnalyticsResponse(BaseModel):
    total_leads: int = 0
    total_campaigns: int = 0
    emails_sent: int = 0
    emails_opened: int = 0


@router.get("/overview")
async def get_overview(
    current_user: dict = Depends(get_current_user),
):
    """Get analytics overview."""
    return {
        "total_leads": 0,
        "total_campaigns": 0,
        "emails_sent": 0,
        "emails_opened": 0,
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign_analytics(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get campaign analytics."""
    return {
        "campaign_id": campaign_id,
        "sent": 0,
        "opened": 0,
        "clicked": 0,
        "replied": 0,
    }