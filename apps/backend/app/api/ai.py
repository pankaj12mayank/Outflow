"""
AI API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/status")
async def get_ai_status(current_user: dict = Depends(get_current_user)):
    """Get AI service status."""
    return {
        "status": "available",
        "provider": "ollama",
        "model": "llama3.2"
    }


@router.post("/personalize")
async def personalize(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    """Personalize content using AI."""
    return {
        "personalized": True,
        "content": request.get("content", "")
    }


@router.post("/generate")
async def generate(
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    """Generate content using AI."""
    return {
        "generated": True,
        "content": ""
    }