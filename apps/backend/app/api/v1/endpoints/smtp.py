from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.models.smtp_models import (
    SmtpConfigCreate, SmtpTestRequest, SmtpTestResult, SmtpProvider
)
from app.services.smtp_service import (
    SmtpService, SmtpTestingService, EmailSendingService,
    SmtpAnalyticsService, SmtpMonitoringService
)

router = APIRouter(prefix="/smtp", tags=["SMTP"])


@router.get("/configs", response_model=List[dict])
async def get_smtp_configs(
    include_inactive: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    configs = await SmtpService.get_all_configs(include_inactive)
    return configs[skip:skip + limit]


@router.post("/configs", response_model=dict)
async def create_smtp_config(config: SmtpConfigCreate):
    config_dict = config.model_dump()
    return await SmtpService.create_config(config_dict)


@router.get("/configs/{config_id}", response_model=dict)
async def get_smtp_config(config_id: str):
    config = await SmtpService.get_config(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="SMTP config not found")
    return config


@router.put("/configs/{config_id}", response_model=dict)
async def update_smtp_config(config_id: str, config: SmtpConfigCreate):
    config_dict = {k: v for k, v in config.model_dump().items() if v is not None}
    result = await SmtpService.update_config(config_id, config_dict)
    if not result:
        raise HTTPException(status_code=404, detail="SMTP config not found")
    return result


@router.delete("/configs/{config_id}")
async def delete_smtp_config(config_id: str):
    deleted = await SmtpService.delete_config(config_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="SMTP config not found")
    return {"message": "SMTP config deleted successfully"}


@router.get("/configs/default", response_model=dict)
async def get_default_smtp():
    config = await SmtpService.get_default_config()
    if not config:
        raise HTTPException(status_code=404, detail="No default SMTP configured")
    return config


@router.post("/test", response_model=dict)
async def test_smtp_connection(test: SmtpTestRequest):
    result = await SmtpTestingService.test_connection(
        test.smtp_config_id,
        test.recipient
    )
    return result


@router.get("/analytics", response_model=dict)
async def get_smtp_analytics(
    config_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365)
):
    return await SmtpAnalyticsService.get_analytics(config_id, days)


@router.get("/health", response_model=List[dict])
async def check_all_smtp_health():
    return await SmtpMonitoringService.check_all_smtp_health()


@router.get("/health/{config_id}", response_model=dict)
async def get_smtp_health(config_id: str):
    return await SmtpAnalyticsService.get_health_status(config_id)


@router.get("/failed-emails", response_model=List[dict])
async def get_failed_emails(
    config_id: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168)
):
    return await SmtpMonitoringService.get_failed_emails(config_id, hours)


@router.post("/send", response_model=dict)
async def send_test_email(
    smtp_config_id: str,
    recipient: str,
    subject: str,
    body: str,
    html: Optional[str] = None,
    organization_id: Optional[str] = Query(None)
):
    return await EmailSendingService.send_email(
        smtp_config_id=smtp_config_id,
        organization_id=organization_id or "system",
        recipient=recipient,
        subject=subject,
        body=body,
        html=html
    )


@router.get("/logs", response_model=List[dict])
async def get_smtp_logs(
    config_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    from app.db.mongodb import MongoDB, serialize_doc
    
    query = {}
    if config_id:
        query["smtp_config_id"] = config_id
    if status:
        query["status"] = status

    logs = await MongoDB.get_collection("smtp_logs").find(query).sort("sent_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [serialize_doc(l) for l in logs]


@router.get("/providers")
async def get_smtp_providers():
    return {
        "providers": [
            {"value": "gmail", "label": "Gmail SMTP", "default_port": 587},
            {"value": "outlook", "label": "Outlook SMTP", "default_port": 587},
            {"value": "aws_ses", "label": "AWS SES", "default_port": 587},
            {"value": "mailgun", "label": "Mailgun", "default_port": 587},
            {"value": "sendgrid", "label": "SendGrid", "default_port": 587},
            {"value": "smtp_generic", "label": "Custom SMTP", "default_port": 587}
        ]
    }