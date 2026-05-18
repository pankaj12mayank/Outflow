"""
Landing Page CMS API Endpoints
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import Optional, List
from datetime import datetime

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.cms_landing_service import (
    LandingPageService, LandingBlockService, 
    VersionService, SeoService, BlockTemplateService
)
from app.models.cms_landing import PageCreateRequest, PageUpdateRequest, BlockUpdateRequest, SeoUpdateRequest


router = APIRouter(prefix="/cms/landing", tags=["CMS Landing"])


@router.get("/pages")
async def list_pages(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_system_owner)
):
    """List all landing pages."""
    pages = await LandingPageService.get_all_pages(status)
    return {"pages": pages, "count": len(pages)}


@router.post("/pages")
async def create_page(
    page: PageCreateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Create a new landing page."""
    existing = await LandingPageService.get_page_by_slug(page.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Page with this slug already exists")
    
    page_doc = await LandingPageService.create_page(
        page.model_dump(),
        current_user.get("user_id")
    )
    return page_doc


@router.get("/pages/{page_id}")
async def get_page(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get landing page details."""
    page = await LandingPageService.get_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    blocks = await LandingBlockService.get_blocks(page_id)
    page["blocks"] = blocks
    
    seo = await SeoService.get_seo(page_id)
    page["seo"] = seo
    
    return page


@router.get("/pages/slug/{slug}")
async def get_page_by_slug(
    slug: str,
    preview: bool = False,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get landing page by slug."""
    page = await LandingPageService.get_page_by_slug(slug, preview)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    blocks = await LandingBlockService.get_blocks(page.get("_id"))
    page["blocks"] = blocks
    
    seo = await SeoService.get_seo(page.get("_id"))
    page["seo"] = seo
    
    return page


@router.put("/pages/{page_id}")
async def update_page(
    page_id: str,
    page_update: PageUpdateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update landing page."""
    page = await LandingPageService.update_page(page_id, page_update.model_dump(exclude_none=True))
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.delete("/pages/{page_id}")
async def delete_page(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Delete a landing page."""
    result = await LandingPageService.delete_page(page_id)
    if not result:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"message": "Page deleted successfully"}


@router.post("/pages/{page_id}/publish")
async def publish_page(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Publish a landing page."""
    page = await LandingPageService.publish_page(page_id, current_user.get("user_id"))
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"message": "Page published successfully", "page": page}


@router.post("/pages/{page_id}/unpublish")
async def unpublish_page(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Unpublish a landing page."""
    page = await LandingPageService.unpublish_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"message": "Page unpublished successfully", "page": page}


@router.post("/pages/{page_id}/blocks")
async def add_block(
    page_id: str,
    block_type: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Add a block to the page."""
    page = await LandingPageService.get_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    blocks = await LandingBlockService.get_blocks(page_id)
    order = len(blocks)
    
    block = await LandingBlockService.add_block(page_id, block_type, order)
    return block


@router.put("/blocks/{block_id}")
async def update_block(
    block_id: str,
    block_update: BlockUpdateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update a block."""
    block = await LandingBlockService.update_block(block_id, block_update.model_dump(exclude_none=True))
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


@router.delete("/blocks/{block_id}")
async def delete_block(
    block_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Delete a block."""
    result = await LandingBlockService.delete_block(block_id)
    if not result:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"message": "Block deleted successfully"}


@router.post("/blocks/reorder")
async def reorder_blocks(
    page_id: str,
    block_orders: List[dict],
    current_user: dict = Depends(get_current_system_owner)
):
    """Reorder blocks."""
    result = await LandingBlockService.reorder_blocks(page_id, block_orders)
    return {"message": "Blocks reordered successfully"}


@router.get("/versions/{page_id}")
async def get_versions(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get version history for a page."""
    versions = await VersionService.get_versions(page_id)
    return {"versions": versions, "count": len(versions)}


@router.post("/versions/{page_id}/{version_id}/restore")
async def restore_version(
    page_id: str,
    version_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Restore a previous version."""
    page = await VersionService.restore_version(page_id, version_id)
    if not page:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"message": "Version restored successfully", "page": page}


@router.get("/seo/{page_id}")
async def get_seo(
    page_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get SEO configuration for a page."""
    seo = await SeoService.get_seo(page_id)
    if not seo:
        return {"page_id": page_id, "title": "", "description": None, "keywords": []}
    return seo


@router.put("/seo/{page_id}")
async def update_seo(
    page_id: str,
    seo_update: SeoUpdateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update SEO configuration."""
    seo = await SeoService.upsert_seo(page_id, seo_update.model_dump())
    return seo


router2 = APIRouter(prefix="/cms/blocks", tags=["Block Templates"])


@router2.get("/templates")
async def get_block_templates(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get all available block templates."""
    templates = BlockTemplateService.get_all_templates()
    return {"templates": templates, "count": len(templates)}


@router2.get("/templates/{block_type}")
async def get_block_template(
    block_type: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get a specific block template."""
    template = BlockTemplateService.get_template(block_type)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


router3 = APIRouter(prefix="/cms/landing", tags=["Landing Content"])


@router3.get("/content")
async def get_landing_content():
    """Get landing page content (public - no auth required for public landing pages)."""
    from app.services.cms_landing_service import LandingContentService
    content = await LandingContentService.get_landing_content()
    return {"content": content}


@router3.put("/content")
async def update_landing_content(
    content_data: dict,
    section: str = Query(..., description="Section: branding, hero, features, stats, pricing, faqs, footer"),
    current_user: dict = Depends(get_current_system_owner),
):
    """Update landing page content section."""
    from app.services.cms_landing_service import LandingContentService
    result = await LandingContentService.update_section(section, content_data)
    return {"message": f"{section} section updated", "content": result}


@router3.put("/content/full")
async def update_full_landing_content(
    body: dict,
    current_user: dict = Depends(get_current_system_owner),
):
    """Replace entire landing content document."""
    from app.services.cms_landing_service import LandingContentService
    content = body.get("content") or body
    await MongoDB.get_collection(LandingContentService.COLLECTION).update_one(
        {"type": "landing_page"},
        {"$set": {"content": content, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"message": "Landing content saved", "content": content}


@router3.post("/content/reset")
async def reset_landing_content(
    current_user: dict = Depends(get_current_system_owner)
):
    """Reset landing page content to defaults."""
    from app.services.cms_landing_service import LandingContentService
    await LandingContentService.reset_to_default()
    return {"message": "Content reset to defaults"}


BRANDING_DIR = Path(__file__).resolve().parents[4] / "storage" / "branding"
BRANDING_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"}


@router3.post("/upload/branding")
async def upload_branding_asset(
    file: UploadFile = File(...),
    kind: str = Query("logo", description="logo or favicon"),
    current_user: dict = Depends(get_current_system_owner),
):
    """Upload logo or favicon; returns public URL synced with landing CMS."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Invalid file type")

    safe_kind = "favicon" if kind == "favicon" else "logo"
    name = f"{safe_kind}_{uuid.uuid4().hex}{ext}"
    dest = BRANDING_DIR / name
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    dest.write_bytes(data)

    url = f"/api/v1/cms/landing/assets/{name}"
    from app.services.cms_landing_service import LandingContentService
    from app.db.mongodb import MongoDB

    content = await LandingContentService.get_landing_content()
    branding = content.get("branding") or {}
    if safe_kind == "favicon":
        branding["favicon_url"] = url
    else:
        branding["logo_url"] = url
    content["branding"] = branding
    await MongoDB.get_collection(LandingContentService.COLLECTION).update_one(
        {"type": "landing_page"},
        {"$set": {"content.branding": branding, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    try:
        from app.services.platform_settings_service import PlatformSettingsService
        await PlatformSettingsService.update_branding(branding)
    except Exception:
        pass
    return {"url": url, "kind": safe_kind, "branding": branding}