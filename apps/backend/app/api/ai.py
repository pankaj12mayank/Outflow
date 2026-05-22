"""
AI API Endpoints — OpenAI / Anthropic / Ollama via provider manager.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from datetime import datetime

from app.middleware import get_current_user
from app.services.ai.bootstrap import ai_runtime_status, generate_text
from app.core.config import settings
from app.db.mongodb import MongoDB

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


# ── Frontend-facing aliases ──────────────────────────────────────────

@router.post("/generate")
async def generate(
    request: AIRequest,
    current_user: dict = Depends(get_current_user),
):
    return await generate_email(request, current_user)


@router.post("/enrich")
async def enrich(
    request: EnrichRequest,
    current_user: dict = Depends(get_current_user),
):
    return await enrich_lead(request, current_user)


@router.post("/analyze-reply")
async def analyze_reply(
    request: ClassifyRequest,
    current_user: dict = Depends(get_current_user),
):
    return await classify_reply(request, current_user)


# ── AI Prompts CRUD ──────────────────────────────────────────────────

@router.get("/prompts")
async def list_prompts(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_prompts")
    query = {"organization_id": org_id}
    if category:
        query["category"] = category
    cursor = coll.find(query).sort("created_at", -1)
    prompts = []
    async for doc in cursor:
        prompts.append({
            "id": str(doc["_id"]),
            "name": doc.get("name"),
            "content": doc.get("content"),
            "category": doc.get("category"),
            "created_at": doc.get("created_at"),
        })
    return prompts


@router.post("/prompts")
async def create_prompt(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_prompts")
    doc = {
        "organization_id": org_id,
        "name": data.get("name"),
        "content": data.get("content"),
        "category": data.get("category", "general"),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), **doc}


@router.patch("/prompts/{prompt_id}")
async def update_prompt(
    prompt_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_prompts")
    update = {k: v for k, v in data.items() if k in ("name", "content", "category")}
    update["updated_at"] = datetime.utcnow().isoformat()
    result = await coll.update_one(
        {"_id": ObjectId(prompt_id), "organization_id": org_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Prompt not found")
    return {"success": True}


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_prompts")
    result = await coll.delete_one({"_id": ObjectId(prompt_id), "organization_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Prompt not found")
    return {"success": True}


# ── AI Settings ──────────────────────────────────────────────────────

@router.get("/settings")
async def get_ai_settings(current_user: dict = Depends(get_current_user)):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_settings")
    doc = await coll.find_one({"organization_id": org_id})
    if not doc:
        return {
            "provider": settings.ai_provider or "openai",
            "model": settings.ai_default_model or "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 1024,
        }
    return {
        "provider": doc.get("provider", settings.ai_provider),
        "model": doc.get("model", settings.ai_default_model),
        "temperature": doc.get("temperature", 0.7),
        "max_tokens": doc.get("max_tokens", 1024),
    }


@router.patch("/settings")
async def update_ai_settings(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_settings")
    allowed = {"provider", "model", "temperature", "max_tokens"}
    update = {k: v for k, v in data.items() if k in allowed}
    await coll.update_one(
        {"organization_id": org_id},
        {"$set": {**update, "updated_at": datetime.utcnow().isoformat()}},
        upsert=True,
    )
    return {"success": True}


# ── Usage ────────────────────────────────────────────────────────────

@router.get("/usage")
async def get_ai_usage(
    period: str = "month",
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("ai_usage")
    pipeline = [
        {"$match": {"organization_id": org_id}},
        {"$group": {
            "_id": None,
            "total_requests": {"$sum": 1},
            "total_tokens": {"$sum": "$tokens"},
        }},
    ]
    result = []
    async for doc in coll.aggregate(pipeline):
        result.append(doc)
    if result:
        return {"total_requests": result[0]["total_requests"], "total_tokens": result[0]["total_tokens"]}
    return {"total_requests": 0, "total_tokens": 0}


# ── Website Analyzer ─────────────────────────────────────────────────

@router.post("/website/analyze")
async def analyze_website(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    url = data.get("url", "")
    prompt = f"Analyze this website URL and describe its business: {url}"
    content, err = await generate_text(prompt, max_tokens=300)
    if content:
        return {"analyzed": True, "summary": content, "url": url}
    return {"analyzed": True, "summary": f"Website at {url}", "url": url, "error": err}
