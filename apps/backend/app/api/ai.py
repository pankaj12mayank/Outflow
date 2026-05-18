"""
AI API Endpoints — OpenAI / Anthropic / Ollama via provider manager.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.middleware import get_current_user
from app.services.ai.bootstrap import ai_runtime_status, generate_text
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI"])


class AIRequest(BaseModel):
    content: Optional[str] = None
    prompt: Optional[str] = None
    lead_data: Optional[dict] = None
    template: Optional[str] = None


class PersonalizeRequest(BaseModel):
    lead_name: str
    company_name: str
    template: str
    custom_fields: Optional[dict] = None


class ClassifyRequest(BaseModel):
    email_text: str
    subject: Optional[str] = None


class EnrichRequest(BaseModel):
    website_url: str
    lead_email: str


@router.get("/status")
async def get_ai_status(current_user: dict = Depends(get_current_user)):
    """AI provider status (OpenAI, Anthropic, or Ollama)."""
    status = await ai_runtime_status()
    return {
        "status": "available" if status["healthy"] else "offline",
        "provider": status["provider"],
        "model": status["model"],
        "healthy": status["healthy"],
        "providers": status["providers"],
        "message": (
            f"Connected via {status['provider']}"
            if status["healthy"]
            else "Configure OPENAI_API_KEY + AI_PROVIDER=openai for cloud deploy"
        ),
    }


@router.get("/models")
async def list_models(current_user: dict = Depends(get_current_user)):
    """List configured default model."""
    status = await ai_runtime_status()
    return {
        "models": [{"name": status["model"], "provider": status["provider"]}],
        "provider": status["provider"],
    }


@router.post("/personalize")
async def personalize_content(
    request: PersonalizeRequest,
    current_user: dict = Depends(get_current_user),
):
    prompt = f"""Generate a personalized email opening line for:
- Recipient: {request.lead_name}
- Company: {request.company_name}
- Template context: {request.template}

Generate 1-2 natural sentences only."""

    content, err = await generate_text(prompt, max_tokens=200)
    if content:
        return {"personalized": True, "content": content, "method": "ai"}

    personalized = request.template.replace("{{name}}", request.lead_name)
    personalized = personalized.replace("{{company}}", request.company_name)
    return {
        "personalized": True,
        "content": personalized,
        "method": "template_fallback",
        "error": err,
    }


@router.post("/classify-reply")
async def classify_reply(
    request: ClassifyRequest,
    current_user: dict = Depends(get_current_user),
):
    prompt = f"""Classify this email reply into ONE category only:
interested, not_interested, maybe, pricing_inquiry, meeting_request, out_of_office

Subject: {request.subject or 'N/A'}
Body: {request.email_text[:500]}

Reply with the category name only."""

    content, err = await generate_text(prompt, max_tokens=50, temperature=0.2)
    if not content:
        return {
            "classification": "unknown",
            "confidence": 0,
            "suggested_action": "manual_review",
            "error": err,
        }

    classification = content.strip().lower()
    category_map = {
        "interested": {"category": "interested", "action": "notify_sales"},
        "not_interested": {"category": "not_interested", "action": "archive"},
        "maybe": {"category": "maybe", "action": "follow_up"},
        "pricing_inquiry": {"category": "pricing", "action": "send_pricing"},
        "meeting_request": {"category": "meeting", "action": "schedule_call"},
        "out_of_office": {"category": "out_of_office", "action": "wait_and_follow"},
    }
    result = category_map.get(classification.replace(" ", "_"), {
        "category": classification,
        "action": "manual_review",
    })
    return {
        "classification": result["category"],
        "confidence": 0.85,
        "suggested_action": result["action"],
        "raw_response": classification,
    }


@router.post("/enrich-lead")
async def enrich_lead(
    request: EnrichRequest,
    current_user: dict = Depends(get_current_user),
):
    return {
        "enriched": True,
        "data": {
            "website": request.website_url,
            "email": request.lead_email,
            "niche": "B2B",
            "note": "Full scrape enrichment runs via /api/v1/scraping endpoints",
        },
    }


@router.post("/generate-email")
async def generate_email(
    request: AIRequest,
    current_user: dict = Depends(get_current_user),
):
    prompt = f"""Write a professional cold outreach email with subject line, body, and CTA.
Context: {request.prompt or request.content or 'General B2B outreach'}"""

    content, err = await generate_text(prompt, max_tokens=600)
    if content:
        return {"generated": True, "content": content}
    raise HTTPException(status_code=503, detail=err or "AI unavailable")


@router.get("/config")
async def get_ai_config(current_user: dict = Depends(get_current_user)):
    """Non-secret AI config for admin UI."""
    return {
        "ai_provider": settings.ai_provider,
        "ai_default_model": settings.ai_default_model,
        "openai_configured": bool(settings.openai_api_key),
        "anthropic_configured": bool(settings.anthropic_api_key),
        "openai_base_url": settings.openai_base_url if settings.openai_api_key else None,
    }
