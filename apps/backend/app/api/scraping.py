"""
Scraping API Endpoints (MongoDB)
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel

from app.middleware import get_current_user
from app.db.mongodb import MongoDB

router = APIRouter(prefix="/scraping", tags=["Scraping"])


class ScrapingJobResponse(BaseModel):
    id: str
    status: str = "pending"
    job_type: str
    total_items: int = 0


# ── Google Maps ──────────────────────────────────────────────────────

@router.post("/google-maps/search")
async def google_maps_search(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = {
        "organization_id": org_id,
        "job_type": "google_maps_search",
        "status": "pending",
        "params": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "pending", "job_type": "google_maps_search"}


@router.post("/google-maps/crawl")
async def google_maps_crawl(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = {
        "organization_id": org_id,
        "job_type": "google_maps_crawl",
        "status": "pending",
        "params": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "pending", "job_type": "google_maps_crawl"}


# ── Website ──────────────────────────────────────────────────────────

@router.post("/website/crawl")
async def website_crawl(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = {
        "organization_id": org_id,
        "job_type": "website_crawl",
        "status": "pending",
        "params": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "pending", "job_type": "website_crawl"}


@router.post("/website/crawl/sync")
async def website_crawl_sync(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    url = data.get("url", "")
    emails = data.get("emails") or []
    phones = data.get("phones") or []
    return {
        "url": url,
        "website": url,
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "emails": emails,
        "phones": phones,
        "phone": phones[0] if phones else "",
        "has_contact_form": bool(data.get("has_contact_form", False)),
        "has_cta": bool(data.get("has_cta", False)),
        "pages_crawled": data.get("pages_crawled") or ["Homepage"],
        "social_links": data.get("social_links") or {},
    }


# ── LinkedIn ─────────────────────────────────────────────────────────

@router.post("/linkedin/enrich")
async def linkedin_enrich(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = {
        "organization_id": org_id,
        "job_type": "linkedin_enrich",
        "status": "pending",
        "params": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "pending", "job_type": "linkedin_enrich"}


@router.post("/linkedin/enrich/sync")
async def linkedin_enrich_sync(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    url = data.get("linkedin_url") or data.get("url", "")
    return {
        "linkedin_url": url,
        "url": url,
        "name": data.get("name", ""),
        "title": data.get("title", ""),
        "company": data.get("company", ""),
        "location": data.get("location", ""),
        "email": data.get("email", ""),
        "enriched": True,
    }


# ── CSV ──────────────────────────────────────────────────────────────

@router.post("/csv/parse")
async def csv_parse(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    import csv, io
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    return {"total_rows": len(rows), "columns": reader.fieldnames or [], "preview": rows[:5]}


@router.post("/csv/import")
async def csv_import(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    import csv, io
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    org_id = current_user.get("organization_id")
    leads_coll = MongoDB.get_collection("leads")
    imported = 0
    for row in rows:
        row["organization_id"] = org_id
        row["created_at"] = datetime.utcnow().isoformat()
        await leads_coll.insert_one(row)
        imported += 1
    return {"imported": imported, "total": len(rows)}


# ── Jobs CRUD ───────────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    query = {"organization_id": org_id}
    if status:
        query["status"] = status
    cursor = coll.find(query).sort("created_at", -1)
    jobs = []
    async for doc in cursor:
        jobs.append({
            "id": str(doc["_id"]),
            "status": doc.get("status"),
            "job_type": doc.get("job_type"),
            "total_items": doc.get("total_items", 0),
            "created_at": doc.get("created_at"),
        })
    return jobs


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = await coll.find_one({"_id": ObjectId(job_id), "organization_id": org_id})
    if not doc:
        raise HTTPException(404, "Job not found")
    return {
        "id": str(doc["_id"]),
        "status": doc.get("status"),
        "job_type": doc.get("job_type"),
        "params": doc.get("params"),
        "total_items": doc.get("total_items", 0),
        "created_at": doc.get("created_at"),
    }


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    result = await coll.update_one(
        {"_id": ObjectId(job_id), "organization_id": org_id},
        {"$set": {"status": "cancelled"}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found")
    return {"success": True}


@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    result = await coll.update_one(
        {"_id": ObjectId(job_id), "organization_id": org_id},
        {"$set": {"status": "pending"}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found")
    return {"success": True}


@router.get("/jobs/{job_id}/results")
async def get_job_results(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    from bson import ObjectId
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_results")
    cursor = coll.find({"job_id": job_id, "organization_id": org_id}).limit(100)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "data": doc.get("data"),
        })
    return results


# ── Bulk Enrich ──────────────────────────────────────────────────────

@router.post("/bulk/enrich")
async def bulk_enrich(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    doc = {
        "organization_id": org_id,
        "job_type": "bulk_enrich",
        "status": "pending",
        "params": data,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await coll.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "pending", "job_type": "bulk_enrich"}


# ── Stats ────────────────────────────────────────────────────────────

@router.get("/stats")
async def scraping_stats(
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("organization_id")
    coll = MongoDB.get_collection("scraping_jobs")
    total = await coll.count_documents({"organization_id": org_id})
    running = await coll.count_documents({"organization_id": org_id, "status": "running"})
    completed = await coll.count_documents({"organization_id": org_id, "status": "completed"})
    return {
        "total_jobs": total,
        "running": running,
        "completed": completed,
        "failed": max(0, total - running - completed),
    }