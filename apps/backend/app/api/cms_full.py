"""
Landing Page CMS API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.middleware import get_current_user, require_super_admin
from app.db.mongodb import MongoDB
from bson import ObjectId

router = APIRouter(prefix="/cms", tags=["CMS"])


class CMSPageRequest(BaseModel):
    title: str
    slug: str
    content: Optional[dict] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class CMSSectionRequest(BaseModel):
    page_id: str
    section_type: str
    title: Optional[str] = None
    content: Optional[dict] = None
    order: int = 0
    is_visible: bool = True


@router.get("/pages")
async def list_cms_pages(
    current_user: dict = Depends(get_current_user),
):
    """List all CMS pages."""
    await MongoDB.connect()
    
    pages = await MongoDB.get_collection("cms_pages").find({
        "is_active": True
    }).to_list(50)
    
    return [
        {
            "id": str(p["_id"]),
            "title": p.get("title"),
            "slug": p.get("slug"),
            "updated_at": p.get("updated_at")
        }
        for p in pages
    ]


@router.get("/pages/{slug}")
async def get_cms_page(
    slug: str,
    current_user: dict = Depends(get_current_user),
):
    """Get CMS page by slug."""
    await MongoDB.connect()
    
    page = await MongoDB.get_collection("cms_pages").find_one({
        "slug": slug,
        "is_active": True
    })
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get sections
    sections = await MongoDB.get_collection("cms_sections").find({
        "page_id": str(page["_id"])
    }).sort("order", 1).to_list(50)
    
    return {
        "id": str(page["_id"]),
        "title": page.get("title"),
        "slug": page.get("slug"),
        "content": page.get("content", {}),
        "meta_title": page.get("meta_title"),
        "meta_description": page.get("meta_description"),
        "sections": [
            {
                "id": str(s["_id"]),
                "type": s.get("section_type"),
                "title": s.get("title"),
                "content": s.get("content", {}),
                "order": s.get("order", 0),
                "visible": s.get("is_visible", True)
            }
            for s in sections
        ]
    }


@router.post("/pages", response_model=dict)
async def create_cms_page(
    page: CMSPageRequest,
    current_user: dict = Depends(require_super_admin),
):
    """Create a new CMS page (Super Admin only)."""
    await MongoDB.connect()
    
    # Check if slug exists
    existing = await MongoDB.get_collection("cms_pages").find_one({
        "slug": page.slug
    })
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    page_data = {
        "title": page.title,
        "slug": page.slug,
        "content": page.content or {},
        "meta_title": page.meta_title,
        "meta_description": page.meta_description,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = await MongoDB.get_collection("cms_pages").insert_one(page_data)
    
    return {
        "id": str(result.inserted_id),
        "title": page.title,
        "slug": page.slug
    }


@router.patch("/pages/{page_id}")
async def update_cms_page(
    page_id: str,
    page: CMSPageRequest,
    current_user: dict = Depends(require_super_admin),
):
    """Update CMS page (Super Admin only)."""
    await MongoDB.connect()
    
    try:
        oid = ObjectId(page_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid page ID")
    
    update_data = {
        "title": page.title,
        "content": page.content or {},
        "meta_title": page.meta_title,
        "meta_description": page.meta_description,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = await MongoDB.get_collection("cms_pages").update_one(
        {"_id": oid},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {"success": True}


@router.post("/sections")
async def create_cms_section(
    section: CMSSectionRequest,
    current_user: dict = Depends(require_super_admin),
):
    """Create CMS section (Super Admin only)."""
    await MongoDB.connect()
    
    section_data = {
        "page_id": section.page_id,
        "section_type": section.section_type,
        "title": section.title,
        "content": section.content or {},
        "order": section.order,
        "is_visible": section.is_visible,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await MongoDB.get_collection("cms_sections").insert_one(section_data)
    
    return {
        "id": str(result.inserted_id),
        "type": section.section_type
    }


@router.delete("/sections/{section_id}")
async def delete_cms_section(
    section_id: str,
    current_user: dict = Depends(require_super_admin),
):
    """Delete CMS section (Super Admin only)."""
    await MongoDB.connect()
    
    try:
        oid = ObjectId(section_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid section ID")
    
    result = await MongoDB.get_collection("cms_sections").delete_one({"_id": oid})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return {"success": True}


@router.get("/landing/home")
async def get_landing_page(
    current_user: dict = Depends(get_current_user),
):
    """Get the public landing page data."""
    await MongoDB.connect()
    
    # Get landing page
    page = await MongoDB.get_collection("cms_pages").find_one({
        "slug": "home",
        "is_active": True
    })
    
    if not page:
        # Return default landing page data
        return {
            "hero": {
                "title": "AI-Powered Lead Generation & Outreach Automation",
                "subtitle": "Discover leads, personalize outreach, and automate campaigns with AI.",
                "cta_text": "Start Free Trial",
                "cta_link": "/signup"
            },
            "features": [
                {"title": "Lead Discovery", "description": "Find leads from Google Maps and websites"},
                {"title": "AI Personalization", "description": "Generate personalized emails with AI"},
                {"title": "Automated Campaigns", "description": "Set up and forget outreach sequences"},
                {"title": "Smart Analytics", "description": "Track performance and optimize ROI"}
            ],
            "pricing": [
                {"plan": "Starter", "price": "₹5,000/month", "features": ["500 leads", "100 emails/day"]},
                {"plan": "Growth", "price": "₹15,000/month", "features": ["2000 leads", "500 emails/day"]},
                {"plan": "Agency", "price": "₹50,000/month", "features": ["Unlimited", "Unlimited emails"]}
            ]
        }
    
    return page.get("content", {})