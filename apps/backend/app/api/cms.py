"""
CMS API Endpoints
Content Management - Landing Page, Pricing, FAQs, Testimonials, SEO
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.middleware import get_current_user, require_system_owner

router = APIRouter(prefix="/cms", tags=["CMS"])


# ==================== LANDING PAGE ====================

class LandingSection(BaseModel):
    hero_title: str = "AI-Powered Outreach Automation"
    hero_subtitle: str = "Automate your outreach with intelligent AI"
    features_title: str = "Powerful Features"
    features_subtitle: str = "Everything you need to scale your outreach"
    pricing_title: str = "Simple Pricing"
    pricing_subtitle: str = "Choose the plan that fits your needs"
    cta_title: str = "Get Started"
    cta_subtitle: str = "Start automating your outreach today"
    footer_title: str = "Outflo"
    footer_subtitle: str = "AI-Powered Outreach"


@router.get("/landing-page")
async def get_landing_page(
    current_user: dict = Depends(get_current_user),
):
    """Get landing page content"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "landing_page"})
        if doc:
            return doc.get("content", {})
    except Exception:
        pass
    return {
        "hero_title": "AI-Powered Outreach Automation",
        "hero_subtitle": "Automate your outreach with intelligent AI",
        "features_title": "Powerful Features",
        "features_subtitle": "Everything you need to scale your outreach",
        "pricing_title": "Simple Pricing",
        "pricing_subtitle": "Choose the plan that fits your needs",
        "cta_title": "Get Started",
        "cta_subtitle": "Start automating your outreach today",
    }


@router.put("/landing-page")
async def update_landing_page(
    content: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    """Update landing page content"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        await db.cms_settings.update_one(
            {"type": "landing_page"},
            {"$set": {"content": content, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRICING ====================

@router.get("/pricing")
async def get_pricing(
    current_user: dict = Depends(get_current_user),
):
    """Get pricing page content"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "pricing"})
        if doc:
            return doc.get("content", {})
    except Exception:
        pass

    from app.services.admin.cms_service import get_cms_service

    plans = await get_cms_service().get_pricing_plans()
    return {
        "plans": [
            {
                "key": p["key"],
                "name": p["name"],
                "monthly_price": p["monthly_price"],
                "yearly_price": p["yearly_price"],
                "description": p.get("description"),
                "features": p.get("features") if isinstance(p.get("features"), list) else list((p.get("features") or {}).keys()),
                "is_highlighted": p.get("is_highlighted", False),
            }
            for p in plans
        ]
    }


# ==================== FAQs ====================

class FAQRequest(BaseModel):
    question: str
    answer: str
    category: str = "general"


@router.get("/faqs")
async def get_faqs(
    current_user: dict = Depends(get_current_user),
):
    """Get all FAQs"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        docs = await db.cms_faqs.find({"is_active": True}).to_list(100)
        return {"faqs": [{"id": str(d["_id"]), "question": d["question"], "answer": d["answer"], "category": d.get("category", "general")} for d in docs]}
    except Exception:
        pass
    return {"faqs": []}


@router.post("/faqs")
async def create_faq(
    faq: FAQRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new FAQ"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        result = await db.cms_faqs.insert_one({
            "question": faq.question,
            "answer": faq.answer,
            "category": faq.category,
            "is_active": True,
            "created_at": datetime.utcnow(),
        })
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/faqs/{faq_id}")
async def update_faq(
    faq_id: str,
    faq: FAQRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update an FAQ"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        from bson import ObjectId
        db = await get_database()
        await db.cms_faqs.update_one(
            {"_id": ObjectId(faq_id)},
            {"$set": {"question": faq.question, "answer": faq.answer, "category": faq.category}}
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an FAQ"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        from bson import ObjectId
        db = await get_database()
        await db.cms_faqs.delete_one({"_id": ObjectId(faq_id)})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TESTIMONIALS ====================

class TestimonialRequest(BaseModel):
    quote: str
    author_name: str
    author_title: str
    author_company: str
    rating: int = 5


@router.get("/testimonials")
async def get_testimonials(
    current_user: dict = Depends(get_current_user),
):
    """Get all testimonials"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        docs = await db.cms_testimonials.find({"is_active": True}).to_list(100)
        return {"testimonials": [{"id": str(d["_id"]), "quote": d["quote"], "author_name": d["author_name"], "author_title": d["author_title"], "author_company": d["author_company"], "rating": d.get("rating", 5)} for d in docs]}
    except Exception:
        pass
    return {"testimonials": []}


@router.post("/testimonials")
async def create_testimonial(
    testimonial: TestimonialRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new testimonial"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        result = await db.cms_testimonials.insert_one({
            "quote": testimonial.quote,
            "author_name": testimonial.author_name,
            "author_title": testimonial.author_title,
            "author_company": testimonial.author_company,
            "rating": testimonial.rating,
            "is_active": True,
            "created_at": datetime.utcnow(),
        })
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/testimonials/{testimonial_id}")
async def delete_testimonial(
    testimonial_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a testimonial"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        from bson import ObjectId
        db = await get_database()
        await db.cms_testimonials.delete_one({"_id": ObjectId(testimonial_id)})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SEO ====================

class SEOConfig(BaseModel):
    page_title: str
    meta_description: str
    keywords: str
    og_title: str
    og_description: str


@router.get("/seo/{page}")
async def get_seo(
    page: str,
    current_user: dict = Depends(get_current_user),
):
    """Get SEO config for a page"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_seo.find_one({"page": page})
        if doc:
            return doc.get("config", {})
    except Exception:
        pass
    return {
        "page_title": "",
        "meta_description": "",
        "keywords": "",
        "og_title": "",
        "og_description": "",
    }


@router.put("/seo/{page}")
async def update_seo(
    page: str,
    config: SEOConfig,
    current_user: dict = Depends(get_current_user),
):
    """Update SEO config for a page"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        await db.cms_seo.update_one(
            {"page": page},
            {"$set": {"config": config.model_dump(), "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FEATURE TOGGLES ====================

@router.get("/features")
async def get_features(
    current_user: dict = Depends(get_current_user),
):
    """Get all feature toggles"""
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "feature_toggles"})
        if doc:
            return doc.get("features", {})
    except Exception:
        pass
    return {
        "ai_scraping": True,
        "email_sequences": True,
        "analytics": True,
        "api_access": False,
        "custom_domain": False,
    }


@router.put("/features")
async def update_features(
    features: Dict[str, bool],
    current_user: dict = Depends(get_current_user),
):
    """Update feature toggles"""
    require_system_owner(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        await db.cms_settings.update_one(
            {"type": "feature_toggles"},
            {"$set": {"features": features, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))