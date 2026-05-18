"""
System Owner — platform setup, health checks, and test actions.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from app.middleware.system_owner_auth import get_current_system_owner
from app.core.config import settings
from app.db.mongodb import MongoDB
from app.services.smtp_service import SmtpService, SmtpTestingService, EmailSendingService
from app.services.monitoring_service import MonitoringService
from app.services.ai.bootstrap import ai_runtime_status
from app.services.platform_settings_service import PlatformSettingsService

router = APIRouter(prefix="/system-owner/platform", tags=["System Owner Platform"])


class AiSettingsUpdate(BaseModel):
    ai_provider: str = "ollama"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = "http://localhost:11434"
    ollama_model: Optional[str] = "llama3.2"


class TestEmailRequest(BaseModel):
    recipient: EmailStr
    smtp_config_id: Optional[str] = None
    subject: str = "Outflo — test email"
    body: str = "If you received this, SMTP is configured correctly."


@router.get("/status")
async def get_platform_status(_user: dict = Depends(get_current_system_owner)):
    mongo = await MongoDB.health_check()
    configs = await SmtpService.get_all_configs(include_inactive=False)
    default_smtp = await SmtpService.get_default_config()
    ai = await ai_runtime_status()

    return {
        "api": {"status": "ok", "version": settings.app_version, "env": settings.app_env},
        "mongodb": mongo,
        "smtp": {
            "configured": len(configs) > 0,
            "config_count": len(configs),
            "has_default": default_smtp is not None,
        },
        "urls": {
            "app_url": settings.app_url,
            "api_docs": "/docs" if settings.debug else None,
        },
        "ai": ai,
        "features": {
            "debug_mode": settings.debug,
            "email_via_console_in_dev": settings.debug and not default_smtp,
            "background_polling": "manual_only",
            "polling_note": "Auto campaign scheduler uses legacy code; launch campaigns from UI/API until Mongo scheduler ships.",
            "ai_provider": ai.get("provider"),
            "ai_healthy": ai.get("healthy"),
        },
    }


@router.post("/health-check")
async def run_health_check(_user: dict = Depends(get_current_system_owner)):
    backend = await MonitoringService.check_system_health()
    mongodb = await MonitoringService.check_mongodb_health()
    ollama = await MonitoringService.check_ollama_health()
    return {"backend": backend, "mongodb": mongodb, "ollama": ollama}


@router.post("/test-email")
async def send_platform_test_email(
    data: TestEmailRequest,
    _user: dict = Depends(get_current_system_owner),
):
    config_id = data.smtp_config_id
    if not config_id:
        default = await SmtpService.get_default_config()
        if not default:
            raise HTTPException(
                status_code=400,
                detail="No SMTP config found. Add one under SMTP Setup and mark as default.",
            )
        config_id = default.get("id") or default.get("_id")

    if data.smtp_config_id:
        result = await SmtpTestingService.test_connection(config_id, data.recipient)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "SMTP test failed"))
        return result

    sent = await EmailSendingService.send_email(
        smtp_config_id=config_id,
        organization_id="system",
        recipient=data.recipient,
        subject=data.subject,
        body=data.body,
    )
    if not sent.get("success", True) and sent.get("status") == "failed":
        raise HTTPException(status_code=400, detail=sent.get("error", "Failed to send email"))
    return {"success": True, "message": f"Test email sent to {data.recipient}", "details": sent}


@router.get("/ai-settings")
async def get_ai_settings(_user: dict = Depends(get_current_system_owner)):
    stored = await PlatformSettingsService.get_settings()
    ai = stored.get("ai") or {}
    runtime = await PlatformSettingsService.get_ai_for_runtime()
    status = await ai_runtime_status()
    return {
        "stored": {
            "ai_provider": ai.get("ai_provider") or runtime["ai_provider"],
            "openai_api_key_set": bool(ai.get("openai_api_key") or runtime.get("openai_api_key")),
            "anthropic_api_key_set": bool(ai.get("anthropic_api_key") or runtime.get("anthropic_api_key")),
            "ollama_base_url": ai.get("ollama_base_url") or runtime["ollama_base_url"],
            "ollama_model": ai.get("ollama_model") or runtime["ollama_model"],
            "openai_api_key": ai.get("openai_api_key", ""),
            "anthropic_api_key": ai.get("anthropic_api_key", ""),
        },
        "runtime": status,
    }


@router.put("/ai-settings")
async def save_ai_settings(
    body: AiSettingsUpdate,
    _user: dict = Depends(get_current_system_owner),
):
    import os

    saved = await PlatformSettingsService.update_ai_settings(body.model_dump(exclude_none=True))
    ai = saved.get("ai") or {}
    if ai.get("ai_provider"):
        os.environ["AI_PROVIDER"] = ai["ai_provider"]
    if ai.get("openai_api_key"):
        os.environ["OPENAI_API_KEY"] = ai["openai_api_key"]
    if ai.get("anthropic_api_key"):
        os.environ["ANTHROPIC_API_KEY"] = ai["anthropic_api_key"]
    if ai.get("ollama_base_url"):
        os.environ["OLLAMA_BASE_URL"] = ai["ollama_base_url"]
    if ai.get("ollama_model"):
        os.environ["OLLAMA_MODEL"] = ai["ollama_model"]
    return {"message": "AI settings saved", "stored": saved.get("ai")}
