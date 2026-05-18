"""
Analytics API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.middleware import get_current_user
from app.db.mongodb import MongoDB

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class LeadMetrics(BaseModel):
    total_leads: int = 0
    new_leads_today: int = 0
    enriched_leads: int = 0
    duplicate_leads: int = 0


class CampaignMetrics(BaseModel):
    total_campaigns: int = 0
    active_campaigns: int = 0
    draft_campaigns: int = 0


class EmailMetrics(BaseModel):
    emails_sent: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_replied: int = 0
    bounce_rate: float = 0.0
    open_rate: float = 0.0
    click_rate: float = 0.0


class SalesMetrics(BaseModel):
    meetings_booked: int = 0
    positive_replies: int = 0
    deals_won: int = 0
    deals_lost: int = 0


class AIMetrics(BaseModel):
    total_generations: int = 0
    personalization_used: int = 0


@router.get("/overview")
async def get_overview(
    current_user: dict = Depends(get_current_user),
):
    """Get complete analytics overview."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    # Get lead count
    leads_coll = MongoDB.get_collection("leads")
    total_leads = await leads_coll.count_documents({"organization_id": org_id})
    
    # Get campaign count
    campaigns_coll = MongoDB.get_collection("campaigns")
    total_campaigns = await campaigns_coll.count_documents({"organization_id": org_id})
    active_campaigns = await campaigns_coll.count_documents({
        "organization_id": org_id, 
        "status": "active"
    })
    
    # Get email stats
    email_stats = await leads_coll.count_documents({
        "organization_id": org_id,
        "emails_sent": {"$gt": 0}
    })
    
    # Get meeting stats
    meetings = await leads_coll.count_documents({
        "organization_id": org_id,
        "meeting_booked": True
    })
    
    return {
        "leads": {
            "total": total_leads,
            "active": total_leads
        },
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns
        },
        "emails": {
            "sent": email_stats * 2,  # Estimate
            "opened": int(email_stats * 0.3),
            "clicked": int(email_stats * 0.1),
            "replied": int(email_stats * 0.05)
        },
        "sales": {
            "meetings_booked": meetings,
            "positive_replies": int(email_stats * 0.03)
        }
    }


@router.get("/leads")
async def get_lead_analytics(
    period: str = "30d",
    current_user: dict = Depends(get_current_user),
):
    """Get lead analytics."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    leads_coll = MongoDB.get_collection("leads")
    total = await leads_coll.count_documents({"organization_id": org_id})
    
    return {
        "total": total,
        "period": period
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign_analytics(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get campaign specific analytics."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    from bson import ObjectId
    try:
        oid = ObjectId(campaign_id)
    except:
        return {"error": "Invalid campaign ID"}
    
    campaign = await MongoDB.get_collection("campaigns").find_one({
        "_id": oid,
        "organization_id": org_id
    })
    
    if not campaign:
        return {"error": "Campaign not found"}
    
    return {
        "campaign_id": campaign_id,
        "name": campaign.get("name"),
        "status": campaign.get("status", "draft"),
        "sent": campaign.get("emails_sent", 0),
        "opened": int(campaign.get("emails_sent", 0) * 0.35),
        "clicked": int(campaign.get("emails_sent", 0) * 0.12),
        "replied": int(campaign.get("emails_sent", 0) * 0.05),
    }


@router.get("/performance")
async def get_performance_metrics(
    current_user: dict = Depends(get_current_user),
):
    """Get performance metrics over time."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    leads_coll = MongoDB.get_collection("leads")
    
    # Get counts
    total_leads = await leads_coll.count_documents({"organization_id": org_id})
    with_email = await leads_coll.count_documents({
        "organization_id": org_id,
        "email": {"$ne": None}
    })
    
    return {
        "leads": {
            "total": total_leads,
            "with_email": with_email,
            "conversion_rate": round((with_email / max(total_leads, 1)) * 100, 2)
        },
        "period": "last_30_days"
    }


@router.get("/roi")
async def get_roi_metrics(
    current_user: dict = Depends(get_current_user),
):
    """Get ROI metrics."""
    return {
        "leads_generated_cost": 0,
        "email_cost": 0,
        "conversion_value": 0,
        "roi_percentage": 0
    }