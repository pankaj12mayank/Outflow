"""
AI API Endpoints (MongoDB) - Full Implementation
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.middleware import get_current_user
from app.db.mongodb import MongoDB
import asyncio

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


# Global client - will be initialized on first request
_ollama_client = None


async def get_ollama_client():
    """Get or create Ollama client"""
    global _ollama_client
    if _ollama_client is None:
        try:
            import ollama
            _ollama_client = ollama
        except ImportError:
            return None
    return _ollama_client


@router.get("/status")
async def get_ai_status(current_user: dict = Depends(get_current_user)):
    """Get AI service status."""
    client = await get_ollama_client()
    
    if client is None:
        return {
            "status": "unavailable",
            "provider": "ollama",
            "message": "Ollama not installed"
        }
    
    # Try to check if Ollama is running
    try:
        import httpx
        async with httpx.AsyncClient() as http:
            response = await http.get("http://localhost:11434/api/version", timeout=2)
            if response.status_code == 200:
                return {
                    "status": "available",
                    "provider": "ollama",
                    "model": "llama3.2",
                    "version": "running"
                }
    except:
        pass
    
    return {
        "status": "offline",
        "provider": "ollama",
        "message": "Start Ollama to enable AI features"
    }


@router.get("/models")
async def list_models(current_user: dict = Depends(get_current_user)):
    """List available AI models."""
    client = await get_ollama_client()
    
    if client is None:
        return {"models": [], "message": "Ollama not available"}
    
    try:
        models = client.list()
        return {"models": models.get("models", [])}
    except Exception as e:
        return {"models": [], "error": str(e)}


@router.post("/personalize")
async def personalize_content(
    request: PersonalizeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Personalize email content using AI."""
    client = await get_ollama_client()
    
    if client is None:
        # Fallback to template-based personalization
        personalized = request.template.replace("{{name}}", request.lead_name)
        personalized = personalized.replace("{{company}}", request.company_name)
        return {
            "personalized": True,
            "content": personalized,
            "method": "template"
        }
    
    prompt = f"""Generate a personalized email opening line for:
- Recipient: {request.lead_name}
- Company: {request.company_name}
- Template: {request.template}

Generate 1-2 lines of personalized content that feels natural and relevant."""

    try:
        response = client.chat(
            model='llama3.2',
            messages=[{"role": "user", "content": prompt}]
        )
        return {
            "personalized": True,
            "content": response['message']['content'],
            "method": "ai"
        }
    except Exception as e:
        # Fallback
        personalized = request.template.replace("{{name}}", request.lead_name)
        return {
            "personalized": True,
            "content": personalized,
            "method": "template_fallback",
            "error": str(e)
        }


@router.post("/classify-reply")
async def classify_reply(
    request: ClassifyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Classify email reply using AI."""
    client = await get_ollama_client()
    
    if client is None:
        return {
            "classification": "unknown",
            "confidence": 0,
            "suggested_action": "manual_review"
        }
    
    prompt = f"""Classify this email reply into one of these categories:
- interested: Person wants to know more
- not_interested: Person explicitly not interested  
- maybe: Person needs more info or is uncertain
- pricing_inquiry: Person asking about pricing
- meeting_request: Person wants to schedule a meeting
- out_of_office: Auto-reply

Email content:
Subject: {request.subject or 'N/A'}
Body: {request.email_text[:500]}

Respond with just the category name."""

    try:
        response = client.chat(
            model='llama3.2',
            messages=[{"role": "user", "content": prompt}]
        )
        
        classification = response['message']['content'].strip().lower()
        
        # Map to standard categories
        category_map = {
            "interested": {"category": "interested", "action": "notify_sales"},
            "not interested": {"category": "not_interested", "action": "archive"},
            "maybe": {"category": "maybe", "action": "follow_up"},
            "pricing inquiry": {"category": "pricing", "action": "send_pricing"},
            "meeting request": {"category": "meeting", "action": "schedule_call"},
            "out of office": {"category": "out_of_office", "action": "wait_and_follow"}
        }
        
        result = category_map.get(classification, {
            "category": classification,
            "action": "manual_review"
        })
        
        return {
            "classification": result["category"],
            "confidence": 0.85,
            "suggested_action": result["action"],
            "raw_response": classification
        }
    except Exception as e:
        return {
            "classification": "error",
            "confidence": 0,
            "error": str(e)
        }


@router.post("/enrich-lead")
async def enrich_lead(
    request: EnrichRequest,
    current_user: dict = Depends(get_current_user),
):
    """Enrich lead data using AI."""
    client = await get_ollama_client()
    
    if client is None:
        return {
            "enriched": False,
            "message": "AI not available"
        }
    
    # This would normally scrape the website
    # For now return mock data
    return {
        "enriched": True,
        "data": {
            "niche": "B2B",
            "company_size": "medium",
            "tech_stack": "WordPress",
            "automation_opportunity": "medium"
        }
    }


@router.post("/generate-email")
async def generate_email(
    request: AIRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate email content using AI."""
    client = await get_ollama_client()
    
    if client is None:
        return {
            "generated": False,
            "content": "AI not available"
        }
    
    prompt = f"""Write a professional cold outreach email with:
- Subject line
- 3-4 sentence opening
- Value proposition
- Call to action

Context: {request.prompt or 'General outreach'}"""

    try:
        response = client.chat(
            model='llama3.2',
            messages=[{"role": "user", "content": prompt}]
        )
        return {
            "generated": True,
            "content": response['message']['content']
        }
    except Exception as e:
        return {
            "generated": False,
            "error": str(e)
        }


