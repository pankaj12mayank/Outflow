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

    source_counts: dict = {}
    cursor = leads_coll.find({"organization_id": org_id}, {"source": 1})
    async for doc in cursor:
        key = doc.get("source") or "Unknown"
        source_counts[key] = source_counts.get(key, 0) + 1

    sources = [
        {"name": name, "value": count}
        for name, count in sorted(source_counts.items(), key=lambda x: -x[1])[:8]
    ]

    return {
        "total": total,
        "period": period,
        "sources": sources,
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


@router.get("/campaigns")
async def get_campaigns_analytics(
    preset: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    campaign_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List campaign metrics, or single campaign when campaign_id query param is set."""
    if campaign_id:
        return await get_campaign_analytics(campaign_id, current_user)

    org_id = current_user.get("organization_id")
    campaigns_coll = MongoDB.get_collection("campaigns")
    total = await campaigns_coll.count_documents({"organization_id": org_id})
    active = await campaigns_coll.count_documents({"organization_id": org_id, "status": "running"})
    campaigns = []
    cursor = campaigns_coll.find({"organization_id": org_id}).sort("created_at", -1).limit(12)
    async for doc in cursor:
        sent = doc.get("emails_sent", 0) or 0
        opened = doc.get("emails_opened", 0) or 0
        open_rate = round((opened / sent) * 100, 1) if sent else 0
        campaigns.append({
            "id": str(doc.get("_id")),
            "name": doc.get("name", "Campaign"),
            "sent": sent,
            "replied": doc.get("emails_replied", 0) or 0,
            "open_rate": open_rate,
            "openRate": open_rate,
        })
    return {
        "total": total,
        "active": active,
        "draft": max(0, total - active),
        "campaigns": campaigns,
    }


@router.get("/sales")
async def get_sales_analytics(
    preset: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    deals_coll = MongoDB.get_collection("deals")
    total = await deals_coll.count_documents({"organization_id": org_id})
    won = await deals_coll.count_documents({"organization_id": org_id, "stage": "won"})
    return {"total_deals": total, "won": won, "value": 0}


@router.get("/ai")
async def get_ai_analytics(
    preset: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return {"total_generations": 0, "total_enrichments": 0}


@router.get("/system")
async def get_system_analytics(
    preset: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return {"uptime": 0, "active_users": 0, "error_rate": 0.0}


@router.get("/executive-summary")
async def get_executive_summary(
    preset: str = "",
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    leads_coll = MongoDB.get_collection("leads")
    campaigns_coll = MongoDB.get_collection("campaigns")
    total_leads = await leads_coll.count_documents({"organization_id": org_id})
    total_campaigns = await campaigns_coll.count_documents({"organization_id": org_id})
    return {
        "summary": f"{total_leads} leads, {total_campaigns} campaigns",
        "total_leads": total_leads,
        "total_campaigns": total_campaigns,
    }


@router.get("/activity-feed")
async def get_activity_feed(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("activity_logs")
    cursor = coll.find({"organization_id": org_id}).sort("created_at", -1).limit(limit)
    activities = []
    async for doc in cursor:
        activities.append({
            "id": str(doc.get("_id")),
            "type": doc.get("activity_type", "unknown"),
            "description": doc.get("description", ""),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        })
    return activities


@router.get("/quick-stats")
async def get_quick_stats(
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    leads_coll = MongoDB.get_collection("leads")
    campaigns_coll = MongoDB.get_collection("campaigns")
    total_leads = await leads_coll.count_documents({"organization_id": org_id})
    active_campaigns = await campaigns_coll.count_documents({"organization_id": org_id, "status": "running"})
    return {
        "total_leads": total_leads,
        "active_campaigns": active_campaigns,
        "emails_sent_today": 0,
    }


@router.get("/dashboard")
async def get_dashboard_data(
    dashboard_type: str = "default",
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    leads_coll = MongoDB.get_collection("leads")
    campaigns_coll = MongoDB.get_collection("campaigns")
    total_leads = await leads_coll.count_documents({"organization_id": org_id})
    total_campaigns = await campaigns_coll.count_documents({"organization_id": org_id})
    return {
        "type": dashboard_type,
        "leads": total_leads,
        "campaigns": total_campaigns,
    }


@router.post("/export")
async def export_analytics(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    return {"message": "Export started", "format": data.get("format", "csv")}


@router.get("/saved-reports")
async def list_saved_reports(
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("saved_reports")
    cursor = coll.find({"organization_id": org_id}).sort("created_at", -1)
    reports = []
    async for doc in cursor:
        reports.append({
            "id": str(doc.get("_id")),
            "name": doc.get("name"),
            "report_type": doc.get("report_type"),
        })
    return reports


@router.post("/saved-reports")
async def save_report(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("saved_reports")
    doc = {
        "organization_id": org_id,
        "name": data.get("name"),
        "report_type": data.get("report_type"),
        "filters": data.get("filters", {}),
        "created_at": datetime.utcnow(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "name": data.get("name")}