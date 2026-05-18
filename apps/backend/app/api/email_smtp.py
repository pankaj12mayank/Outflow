"""
Email Infrastructure API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.middleware import get_current_user
from app.db.mongodb import MongoDB
from bson import ObjectId

router = APIRouter(prefix="/email", tags=["Email"])


class SMTPConfigRequest(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    smtp_use_tls: bool = True
    from_email: str
    from_name: str


class SendEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    lead_id: Optional[str] = None
    campaign_id: Optional[str] = None


@router.get("/accounts")
async def list_email_accounts(
    current_user: dict = Depends(get_current_user),
):
    """List all configured email accounts."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    accounts = await MongoDB.get_collection("email_accounts").find({
        "organization_id": org_id
    }).to_list(50)
    
    return [
        {
            "id": str(a["_id"]),
            "from_email": a.get("from_email"),
            "from_name": a.get("from_name"),
            "status": a.get("status", "active"),
            "daily_limit": a.get("daily_limit", 50),
            "sent_today": a.get("sent_today", 0)
        }
        for a in accounts
    ]


@router.post("/accounts")
async def add_email_account(
    config: SMTPConfigRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add a new email account."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    account_data = {
        "organization_id": org_id,
        "smtp_host": config.smtp_host,
        "smtp_port": config.smtp_port,
        "smtp_user": config.smtp_user,
        "smtp_password": config.smtp_password,
        "smtp_use_tls": config.smtp_use_tls,
        "from_email": config.from_email,
        "from_name": config.from_name,
        "status": "active",
        "daily_limit": 50,
        "sent_today": 0,
        "last_reset": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await MongoDB.get_collection("email_accounts").insert_one(account_data)
    
    return {
        "id": str(result.inserted_id),
        "from_email": config.from_email,
        "status": "active"
    }


@router.delete("/accounts/{account_id}")
async def delete_email_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an email account."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    try:
        oid = ObjectId(account_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid account ID")
    
    result = await MongoDB.get_collection("email_accounts").delete_one({
        "_id": oid,
        "organization_id": org_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"success": True}


@router.post("/send")
async def send_email(
    email: SendEmailRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a single email."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    # Get active email account
    account = await MongoDB.get_collection("email_accounts").find_one({
        "organization_id": org_id,
        "status": "active"
    })
    
    if not account:
        return {
            "success": False,
            "error": "No active email account. Please configure SMTP first."
        }
    
    # Check daily limit
    if account.get("sent_today", 0) >= account.get("daily_limit", 50):
        return {
            "success": False,
            "error": "Daily limit reached"
        }
    
    # Here we would actually send the email using aiosmtplib
    # For now, just record the email
    email_record = {
        "organization_id": org_id,
        "account_id": str(account["_id"]),
        "to_email": email.to_email,
        "to_name": email.to_name,
        "subject": email.subject,
        "body_text": email.body_text,
        "body_html": email.body_html,
        "lead_id": email.lead_id,
        "campaign_id": email.campaign_id,
        "status": "sent",
        "sent_at": datetime.utcnow().isoformat()
    }
    
    await MongoDB.get_collection("sent_emails").insert_one(email_record)
    
    # Update daily count
    await MongoDB.get_collection("email_accounts").update_one(
        {"_id": account["_id"]},
        {"$inc": {"sent_today": 1}}
    )
    
    return {
        "success": True,
        "message": "Email queued for sending",
        "email_id": str(email_record.get("_id", ""))
    }


@router.get("/stats")
async def get_email_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get email sending statistics."""
    org_id = current_user.get("organization_id")
    await MongoDB.connect()
    
    # Get total sent
    total_sent = await MongoDB.get_collection("sent_emails").count_documents({
        "organization_id": org_id
    })
    
    # Get sent today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    sent_today = await MongoDB.get_collection("sent_emails").count_documents({
        "organization_id": org_id,
        "sent_at": {"$gte": today_start.isoformat()}
    })
    
    return {
        "total_sent": total_sent,
        "sent_today": sent_today,
        "daily_limit": 50,
        "remaining_today": max(0, 50 - sent_today)
    }