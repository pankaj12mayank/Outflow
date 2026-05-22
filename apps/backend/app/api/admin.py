"""
Admin API Endpoints (MongoDB)
Super Admin - Organizations, Plans, Billing, Monitoring, Abuse, Limits, Feature Flags
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from app.middleware import get_current_user, require_system_owner
from app.db.mongodb import MongoDB, serialize_doc
from app.services.admin.service import get_abuse_service, get_monitoring_service
from app.core.logging import admin_logger

router = APIRouter(prefix="/admin", tags=["Admin"])


class CreatePlanRequest(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    monthly_price: float
    yearly_price: float
    features: Dict[str, Any] = {}
    limits: Dict[str, Any] = {}
    ai_limits: Dict[str, Any] = {}
    email_limits: Dict[str, Any] = {}
    scraping_limits: Dict[str, Any] = {}
    is_active: bool = True
    is_featured: bool = False


class UpdatePlanRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    features: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None
    ai_limits: Optional[Dict[str, Any]] = None
    email_limits: Optional[Dict[str, Any]] = None
    scraping_limits: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class SuspendOrgRequest(BaseModel):
    reason: Optional[str] = None


class ResolveAbuseRequest(BaseModel):
    action_taken: str


# ==================== PLATFORM STATS ====================

@router.get("/stats")
async def get_platform_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get platform statistics - MRR, ARR, users, orgs"""
    require_system_owner(current_user)
    orgs_coll = MongoDB.get_collection("organizations")
    users_coll = MongoDB.get_collection("users")

    total_orgs = await orgs_coll.count_documents({})
    active_orgs_count = await orgs_coll.count_documents({"is_active": True})
    total_users = await users_coll.count_documents({})

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_orgs = await orgs_coll.count_documents({"created_at": {"$gte": thirty_days_ago}})

    return {
        "total_organizations": total_orgs,
        "active_organizations": active_orgs_count,
        "total_users": total_users,
        "mrr": 0.0,
        "arr": 0.0,
        "active_subscriptions": 0,
        "churn_rate": 0.0,
        "new_orgs_this_month": new_orgs,
    }


@router.get("/stats/platform")
async def get_platform_stats_alt(
    current_user: dict = Depends(get_current_user),
):
    return await get_platform_stats(current_user)


@router.get("/stats/billing")
async def get_billing_stats_alt(
    current_user: dict = Depends(get_current_user),
):
    require_system_owner(current_user)
    invoices_coll = MongoDB.get_collection("invoices")
    cursor = invoices_coll.aggregate([
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$total"},
            "count": {"$sum": 1}
        }}
    ])
    results = {}
    async for doc in cursor:
        results[doc["_id"]] = {"total": doc["total"], "count": doc["count"]}

    total_revenue = sum(v["total"] for v in results.values())
    total_count = sum(v["count"] for v in results.values())
    return {
        "total_invoices": total_count,
        "total_revenue": round(total_revenue, 2),
        "paid_invoices": round(results.get("paid", {}).get("total", 0), 2),
        "pending_invoices": round(results.get("pending", {}).get("total", 0), 2),
        "failed_invoices": round(results.get("failed", {}).get("total", 0), 2),
        "average_invoice_value": round(total_revenue / max(total_count, 1), 2),
    }


@router.get("/stats/monitoring")
async def get_monitoring_stats_alt(
    current_user: dict = Depends(get_current_user),
):
    require_system_owner(current_user)
    monitoring_service = get_monitoring_service()
    status = await monitoring_service.get_system_status()
    polling = await monitoring_service.get_polling_health()
    queue = await monitoring_service.get_queue_status()
    return {
        "server_status": status.get("server_status", "unknown"),
        "uptime_seconds": status.get("uptime_seconds", 0),
        "active_connections": polling.get("active_connections", 0),
        "avg_response_time_ms": polling.get("avg_latency_ms", 0),
        "error_rate": polling.get("error_rate", 0),
        "queue_size": queue.get("queue_size", 0),
        "scraping_jobs_running": queue.get("active_tasks", 0),
        "scraping_jobs_pending": queue.get("pending_tasks", 0),
    }


@router.get("/monitoring")
async def get_monitoring_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get real-time system monitoring stats"""
    require_system_owner(current_user)
    monitoring_service = get_monitoring_service()
    status = await monitoring_service.get_system_status()
    polling = await monitoring_service.get_polling_health()
    queue = await monitoring_service.get_queue_status()
    return {
        "server_status": status.get("server_status", "unknown"),
        "uptime_seconds": status.get("uptime_seconds", 0),
        "active_connections": polling.get("active_connections", 0),
        "active_polling_users": polling.get("active_connections", 0),
        "avg_response_time_ms": polling.get("avg_latency_ms", 0),
        "error_rate": polling.get("error_rate", 0),
        "queue_size": queue.get("queue_size", 0),
        "scraping_jobs_running": queue.get("active_tasks", 0),
        "scraping_jobs_pending": queue.get("pending_tasks", 0),
    }


# ==================== ORGANIZATIONS ====================

@router.get("/organizations")
async def list_organizations(
    search: str = "",
    status: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all organizations with pagination"""
    require_system_owner(current_user)
    orgs_coll = MongoDB.get_collection("organizations")
    filter_query: Dict[str, Any] = {}
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}},
        ]
    if status == "active":
        filter_query["is_active"] = True
    elif status == "suspended":
        filter_query["is_active"] = False

    total = await orgs_coll.count_documents(filter_query)
    cursor = orgs_coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    orgs = []
    async for doc in cursor:
        org = serialize_doc(doc)
        users_coll = MongoDB.get_collection("users")
        member_count = await users_coll.count_documents({"organization_id": org["id"]})
        org["member_count"] = member_count
        orgs.append(org)

    return {
        "data": orgs,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/organizations/{org_id}")
async def get_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get organization details"""
    require_system_owner(current_user)
    orgs_coll = MongoDB.get_collection("organizations")
    try:
        doc = await orgs_coll.find_one({"_id": ObjectId(org_id)})
    except:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not doc:
        raise HTTPException(status_code=404, detail="Organization not found")
    return serialize_doc(doc)


@router.post("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: str,
    request: SuspendOrgRequest,
    current_user: dict = Depends(get_current_user),
):
    """Suspend an organization"""
    require_system_owner(current_user)
    orgs_coll = MongoDB.get_collection("organizations")
    try:
        result = await orgs_coll.update_one(
            {"_id": ObjectId(org_id)},
            {"$set": {"is_active": False, "suspension_reason": request.reason, "suspended_at": datetime.utcnow(), "suspended_by": current_user.get("sub")}}
        )
    except:
        raise HTTPException(status_code=404, detail="Organization not found")
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    admin_logger.info(f"Organization {org_id} suspended", admin_id=current_user.get("id"))
    return {"success": True, "message": "Organization suspended"}


@router.post("/organizations/{org_id}/reactivate")
async def reactivate_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reactivate a suspended organization"""
    require_system_owner(current_user)
    orgs_coll = MongoDB.get_collection("organizations")
    try:
        result = await orgs_coll.update_one(
            {"_id": ObjectId(org_id)},
            {"$set": {"is_active": True, "reactivated_at": datetime.utcnow()},
             "$unset": {"suspension_reason": "", "suspended_at": "", "suspended_by": ""}}
        )
    except:
        raise HTTPException(status_code=404, detail="Organization not found")
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    admin_logger.info(f"Organization {org_id} reactivated", admin_id=current_user.get("id"))
    return {"success": True, "message": "Organization reactivated"}


@router.post("/organizations/{org_id}/update-subscription")
async def update_subscription(
    org_id: str,
    plan_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Update organization's subscription plan"""
    require_system_owner(current_user)
    org_plans_coll = MongoDB.get_collection("organization_plans")
    existing = await org_plans_coll.find_one({"organization_id": org_id})
    update = {"plan_id": plan_id, "updated_at": datetime.utcnow()}
    if status:
        update["status"] = status
    if existing:
        await org_plans_coll.update_one({"_id": existing["_id"]}, {"$set": update})
    else:
        update["organization_id"] = org_id
        update["start_date"] = datetime.utcnow()
        update["created_at"] = datetime.utcnow()
        await org_plans_coll.insert_one(update)
    return {"success": True, "message": "Subscription updated"}


# ==================== PLANS ====================

@router.get("/plans")
async def list_plans(
    current_user: dict = Depends(get_current_user),
):
    """List all pricing plans"""
    require_system_owner(current_user)
    plans_coll = MongoDB.get_collection("plans")
    cursor = plans_coll.find().sort("monthly_price", 1)
    plans = []
    async for doc in cursor:
        p = serialize_doc(doc)
        p["id"] = p.pop("id", str(doc.get("_id")))
        plans.append(p)
    return plans


@router.post("/plans")
async def create_plan(
    request: CreatePlanRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new pricing plan"""
    require_system_owner(current_user)
    plans_coll = MongoDB.get_collection("plans")
    plan_doc = {
        "name": request.name,
        "slug": request.slug,
        "description": request.description,
        "monthly_price": request.monthly_price,
        "yearly_price": request.yearly_price,
        "features": request.features,
        "limits": request.limits,
        "ai_limits": request.ai_limits,
        "email_limits": request.email_limits,
        "scraping_limits": request.scraping_limits,
        "is_active": request.is_active,
        "is_featured": request.is_featured,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await plans_coll.insert_one(plan_doc)
    admin_logger.info(f"Plan created: {request.name}", admin_id=current_user.get("id"))
    return {"success": True, "plan_id": str(result.inserted_id)}


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    request: UpdatePlanRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update a pricing plan"""
    require_system_owner(current_user)
    plans_coll = MongoDB.get_collection("plans")
    update = {k: v for k, v in request.model_dump(exclude_none=True).items()}
    update["updated_at"] = datetime.utcnow()
    try:
        result = await plans_coll.update_one({"_id": ObjectId(plan_id)}, {"$set": update})
    except:
        raise HTTPException(status_code=404, detail="Plan not found")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    admin_logger.info(f"Plan updated: {plan_id}", admin_id=current_user.get("id"))
    return {"success": True, "message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a pricing plan"""
    require_system_owner(current_user)
    plans_coll = MongoDB.get_collection("plans")
    try:
        result = await plans_coll.delete_one({"_id": ObjectId(plan_id)})
    except:
        raise HTTPException(status_code=404, detail="Plan not found")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    admin_logger.info(f"Plan deleted: {plan_id}", admin_id=current_user.get("id"))
    return {"success": True, "message": "Plan deleted"}


# ==================== BILLING ====================

@router.get("/billing")
async def get_billing_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get billing statistics"""
    require_system_owner(current_user)
    invoices_coll = MongoDB.get_collection("invoices")
    cursor = invoices_coll.aggregate([
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$total"},
            "count": {"$sum": 1}
        }}
    ])
    results = {}
    async for doc in cursor:
        results[doc["_id"]] = {"total": doc["total"], "count": doc["count"]}
    total_revenue = sum(v["total"] for v in results.values())
    total_count = sum(v["count"] for v in results.values())
    return {
        "total_invoices": total_count,
        "total_revenue": round(total_revenue, 2),
        "paid_invoices": round(results.get("paid", {}).get("total", 0), 2),
        "pending_invoices": round(results.get("pending", {}).get("total", 0), 2),
        "failed_invoices": round(results.get("failed", {}).get("total", 0), 2),
        "average_invoice_value": round(total_revenue / max(total_count, 1), 2),
    }


@router.get("/billing/invoices")
async def list_invoices(
    status: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all invoices"""
    require_system_owner(current_user)
    invoices_coll = MongoDB.get_collection("invoices")
    filter_query = {}
    if status:
        filter_query["status"] = status
    total = await invoices_coll.count_documents(filter_query)
    cursor = invoices_coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    invoices = []
    async for doc in cursor:
        invoices.append({
            "id": str(doc.get("_id")),
            "organization_id": doc.get("organization_id", ""),
            "amount": doc.get("total", doc.get("amount", 0)),
            "status": doc.get("status", "unknown"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        })
    return {
        "data": invoices,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ==================== ABUSE ====================

@router.get("/abuse")
async def list_abuse_reports(
    status: str = "",
    severity: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all abuse reports"""
    require_system_owner(current_user)
    abuse_coll = MongoDB.get_collection("abuse_reports")
    filter_query = {}
    if status:
        filter_query["status"] = status
    if severity:
        filter_query["severity"] = severity
    total = await abuse_coll.count_documents(filter_query)
    cursor = abuse_coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    reports = []
    async for doc in cursor:
        report = serialize_doc(doc)
        orgs_coll = MongoDB.get_collection("organizations")
        org = await orgs_coll.find_one({"_id": ObjectId(report.get("organization_id", ""))}, {"name": 1}) if ObjectId.is_valid(report.get("organization_id", "")) else None
        if org:
            report["organization_name"] = org.get("name")
        reports.append(report)
    return {
        "data": reports,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/abuse-reports")
async def list_abuse_reports_alt(
    status: str = "",
    severity: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    return await list_abuse_reports(status, severity, page, limit, current_user)


@router.post("/abuse/{report_id}/resolve")
async def resolve_abuse_report(
    report_id: str,
    request: ResolveAbuseRequest,
    current_user: dict = Depends(get_current_user),
):
    """Resolve an abuse report"""
    require_system_owner(current_user)
    abuse_coll = MongoDB.get_collection("abuse_reports")
    try:
        result = await abuse_coll.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": "resolved", "action_taken": request.action_taken, "resolved_at": datetime.utcnow(), "resolved_by": current_user.get("sub")}}
        )
    except:
        raise HTTPException(status_code=404, detail="Report not found")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    admin_logger.info(f"Abuse report {report_id} resolved", admin_id=current_user.get("id"))
    return {"success": True, "message": "Report resolved"}


@router.post("/abuse-reports/{report_id}/resolve")
async def resolve_abuse_report_alt(
    report_id: str,
    request: ResolveAbuseRequest,
    current_user: dict = Depends(get_current_user),
):
    return await resolve_abuse_report(report_id, request, current_user)


# ==================== LIMITS ====================

@router.get("/organizations/{org_id}/limits")
async def get_org_limits(
    org_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get organization limits"""
    require_system_owner(current_user)
    limits_coll = MongoDB.get_collection("organization_limits")
    doc = await limits_coll.find_one({"organization_id": org_id})
    if doc:
        return {k: v for k, v in doc.items() if k not in ("_id", "organization_id")}
    return {
        "max_leads": 1000,
        "max_campaigns": 10,
        "max_users": 10,
        "emails_per_day": 500,
    }


@router.put("/organizations/{org_id}/limits")
async def update_org_limits(
    org_id: str,
    limits: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    """Update organization limits"""
    require_system_owner(current_user)
    limits_coll = MongoDB.get_collection("organization_limits")
    limits["organization_id"] = org_id
    limits["updated_at"] = datetime.utcnow()
    await limits_coll.update_one(
        {"organization_id": org_id},
        {"$set": limits},
        upsert=True
    )
    admin_logger.info(f"Organization {org_id} limits updated", admin_id=current_user.get("id"))
    return {"success": True, "message": "Limits updated"}


# ==================== ALERTS ====================

@router.get("/alerts")
async def get_alerts(
    current_user: dict = Depends(get_current_user),
):
    """Get system alerts"""
    require_system_owner(current_user)
    alerts_coll = MongoDB.get_collection("alerts")
    cursor = alerts_coll.find({"resolved": {"$ne": True}}).sort("created_at", -1).limit(50)
    alerts = []
    async for doc in cursor:
        alerts.append(serialize_doc(doc))
    return alerts


# ==================== LOGS ====================

@router.get("/logs")
async def get_logs(
    level: str = "",
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """Get system logs"""
    require_system_owner(current_user)
    logs_coll = MongoDB.get_collection("audit_logs")
    filter_query = {}
    if level:
        filter_query["level"] = level
    total = await logs_coll.count_documents(filter_query)
    cursor = logs_coll.find(filter_query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    logs = []
    async for doc in cursor:
        logs.append(serialize_doc(doc))
    return {
        "data": logs,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ==================== FEATURE FLAGS ====================

@router.get("/feature-flags")
async def get_feature_flags(
    current_user: dict = Depends(get_current_user),
):
    """Get all feature flags"""
    require_system_owner(current_user)
    try:
        cms_coll = MongoDB.get_collection("cms_settings")
        doc = await cms_coll.find_one({"type": "feature_toggles"})
        if doc and doc.get("features"):
            flags = []
            for key, value in doc["features"].items():
                flags.append({
                    "key": key,
                    "is_enabled": value,
                    "rollout": 100 if value else 0,
                })
            return flags
    except Exception:
        pass
    return [
        {"key": "ai_scraping", "is_enabled": True, "rollout": 100},
        {"key": "email_sequences", "is_enabled": True, "rollout": 100},
        {"key": "analytics", "is_enabled": True, "rollout": 100},
        {"key": "api_access", "is_enabled": False, "rollout": 0},
        {"key": "custom_domain", "is_enabled": False, "rollout": 0},
    ]


@router.post("/feature-flags")
async def create_feature_flag(
    flag_key: str,
    enabled: bool = True,
    current_user: dict = Depends(get_current_user),
):
    require_system_owner(current_user)
    cms_coll = MongoDB.get_collection("cms_settings")
    doc = await cms_coll.find_one({"type": "feature_toggles"})
    features = doc.get("features", {}) if doc else {}
    features[flag_key] = enabled
    await cms_coll.update_one(
        {"type": "feature_toggles"},
        {"$set": {"features": features, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    return {"success": True}


@router.put("/feature-flags/{flag_key}")
async def update_feature_flag(
    flag_key: str,
    enabled: bool,
    rollout: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """Update a feature flag"""
    require_system_owner(current_user)
    try:
        cms_coll = MongoDB.get_collection("cms_settings")
        doc = await cms_coll.find_one({"type": "feature_toggles"})
        features = doc.get("features", {}) if doc else {}
        features[flag_key] = enabled
        await cms_coll.update_one(
            {"type": "feature_toggles"},
            {"$set": {"features": features, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GLOBAL SETTINGS ====================

@router.get("/global-settings")
async def get_global_settings(
    current_user: dict = Depends(get_current_user),
):
    """Get global platform settings"""
    require_system_owner(current_user)
    try:
        cms_coll = MongoDB.get_collection("cms_settings")
        doc = await cms_coll.find_one({"type": "global_settings"})
        if doc and doc.get("settings"):
            return [{"key": k, "value": v, "category": "general"} for k, v in doc["settings"].items()]
    except Exception:
        pass
    return [
        {"key": "max_orgs", "value": 1000, "category": "limits"},
        {"key": "max_users_per_org", "value": 50, "category": "limits"},
        {"key": "default_plan", "value": "starter", "category": "billing"},
        {"key": "enable_trial", "value": True, "category": "billing"},
        {"key": "trial_days", "value": 14, "category": "billing"},
    ]


@router.put("/global-settings/{setting_key}")
async def update_global_setting(
    setting_key: str,
    value: Any,
    current_user: dict = Depends(get_current_user),
):
    """Update a global setting"""
    require_system_owner(current_user)
    try:
        cms_coll = MongoDB.get_collection("cms_settings")
        doc = await cms_coll.find_one({"type": "global_settings"})
        settings = doc.get("settings", {}) if doc else {}
        settings[setting_key] = value
        await cms_coll.update_one(
            {"type": "global_settings"},
            {"$set": {"settings": settings, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
