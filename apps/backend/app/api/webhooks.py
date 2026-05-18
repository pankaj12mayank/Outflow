"""
Webhook and Polling API Endpoints
Real-time updates without WebSockets
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.middleware import get_current_user
from app.db.mongodb import MongoDB
from bson import ObjectId

router = APIRouter(prefix="/polls", tags=["Polling"])


# Status models
class CampaignStatus(BaseModel):
    campaign_id: str
    name: str
    status: str
    sent_count: int
    failed_count: int


class LeadStatus(BaseModel):
    lead_id: str
    email: str
    status: str
    last_contact: Optional[str] = None


class SystemStatus(BaseModel):
    scraper_status: str
    email_queue: int
    ai_queue: int


@router.get("/campaigns")
async def poll_campaign_status(
    current_user: dict = Depends(get_current_user),
):
    """Poll campaign status updates."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    campaigns = await MongoDB.get_collection("campaigns").find({
        "organization_id": org_id
    }).to_list(20)
    
    status_updates = []
    for c in campaigns:
        # Get sent count
        sent_count = await MongoDB.get_collection("sent_emails").count_documents({
            "campaign_id": str(c["_id"])
        })
        
        status_updates.append({
            "campaign_id": str(c["_id"]),
            "name": c.get("name"),
            "status": c.get("status", "draft"),
            "sent_count": sent_count,
            "updated_at": c.get("updated_at")
        })
    
    return {"campaigns": status_updates}


@router.get("/campaigns/{campaign_id}/progress")
async def get_campaign_progress(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get real-time campaign progress."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    try:
        oid = ObjectId(campaign_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid campaign ID")
    
    campaign = await MongoDB.get_collection("campaigns").find_one({
        "_id": oid,
        "organization_id": org_id
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get email stats
    sent = await MongoDB.get_collection("sent_emails").count_documents({
        "campaign_id": campaign_id,
        "status": "sent"
    })
    
    opened = await MongoDB.get_collection("sent_emails").count_documents({
        "campaign_id": campaign_id,
        "status": "opened"
    })
    
    clicked = await MongoDB.get_collection("sent_emails").count_documents({
        "campaign_id": campaign_id,
        "status": "clicked"
    })
    
    replied = await MongoDB.get_collection("sent_emails").count_documents({
        "campaign_id": campaign_id,
        "status": "replied"
    })
    
    return {
        "campaign_id": campaign_id,
        "name": campaign.get("name"),
        "status": campaign.get("status"),
        "stats": {
            "sent": sent,
            "opened": opened,
            "clicked": clicked,
            "replied": replied,
            "open_rate": round((opened / max(sent, 1)) * 100, 1),
            "click_rate": round((clicked / max(sent, 1)) * 100, 1),
            "reply_rate": round((replied / max(sent, 1)) * 100, 1)
        }
    }


@router.get("/leads/updates")
async def poll_lead_updates(
    since: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Poll for lead updates."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    query = {"organization_id": org_id}
    
    if since:
        query["updated_at"] = {"$gte": since}
    
    leads = await MongoDB.get_collection("leads").find(query).to_list(50)
    
    updates = []
    for lead in leads:
        updates.append({
            "lead_id": str(lead["_id"]),
            "email": lead.get("email"),
            "status": lead.get("status", "new"),
            "enriched": lead.get("enriched", False),
            "last_contact": lead.get("last_contact_at")
        })
    
    return {"updates": updates}


@router.get("/system/status")
async def get_system_status(
    current_user: dict = Depends(get_current_user),
):
    """Get system status for polling."""
    await MongoDB.connect()
    
    # Get scraping queue
    scraping_queue = await MongoDB.get_collection("scraping_jobs").count_documents({
        "status": "pending"
    })
    
    # Get email queue
    email_queue = await MongoDB.get_collection("sent_emails").count_documents({
        "status": "pending"
    })
    
    # Get AI queue
    ai_queue = await MongoDB.get_collection("ai_tasks").count_documents({
        "status": "pending"
    })
    
    return {
        "scraper": {
            "status": "idle" if scraping_queue == 0 else "running",
            "queue_count": scraping_queue
        },
        "email": {
            "status": "idle" if email_queue == 0 else "sending",
            "queue_count": email_queue
        },
        "ai": {
            "status": "idle" if ai_queue == 0 else "processing",
            "queue_count": ai_queue
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/notifications")
async def get_notifications(
    unread_only: bool = True,
    current_user: dict = Depends(get_current_user),
):
    """Get user notifications."""
    user_id = current_user.get("sub")
    await MongoDB.connect()
    
    query = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await MongoDB.get_collection("notifications").find(
        query
    ).sort("created_at", -1).to_list(20)
    
    return {
        "notifications": [
            {
                "id": str(n["_id"]),
                "type": n.get("type"),
                "title": n.get("title"),
                "message": n.get("message"),
                "read": n.get("read", False),
                "created_at": n.get("created_at")
            }
            for n in notifications
        ]
    }


# Webhook endpoints for external triggers
@router.post("/webhook/test")
async def test_webhook(
    request: dict,
):
    """Test webhook endpoint."""
    return {"received": True, "data": request}


@router.post("/webhook/email-bounce")
async def email_bounce_webhook(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    """Handle email bounce webhook from SMTP provider."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    # Record bounce
    bounce_record = {
        "organization_id": org_id,
        "email": request.get("email"),
        "bounce_type": request.get("type", "hard"),
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": request
    }
    
    await MongoDB.get_collection("bounces").insert_one(bounce_record)
    
    # Update lead status
    await MongoDB.get_collection("leads").update_one(
        {"email": request.get("email"), "organization_id": org_id},
        {"$set": {"email_valid": False, "bounced_at": datetime.utcnow().isoformat()}}
    )
    
    return {"processed": True}


@router.post("/webhook/email-open")
async def email_open_webhook(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    """Handle email open webhook."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    # Update email as opened
    await MongoDB.get_collection("sent_emails").update_one(
        {"message_id": request.get("message_id")},
        {"$set": {"status": "opened", "opened_at": datetime.utcnow().isoformat()}}
    )
    
    return {"processed": True}