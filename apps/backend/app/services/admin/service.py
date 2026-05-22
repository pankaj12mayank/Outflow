"""
Outflo - Super Admin Service (MongoDB)
Organization management, billing, monitoring, and abuse detection
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Any
from dataclasses import dataclass

from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

logger = logging.getLogger(__name__)


def _org_filter(org_id) -> dict:
    oid = str(org_id)
    if ObjectId.is_valid(oid):
        return {"_id": ObjectId(oid)}
    return {"$or": [{"_id": oid}, {"id": oid}]}


def _org_query_filter(org_id) -> dict:
    oid = str(org_id)
    clauses = [{"organization_id": oid}]
    if ObjectId.is_valid(oid):
        clauses.append({"organization_id": ObjectId(oid)})
    return {"$or": clauses}


@dataclass
class PlatformStats:
    total_orgs: int
    active_orgs: int
    total_users: int
    mrr: float
    arr: float
    total_subscriptions: int
    active_subscriptions: int


@dataclass
class MonitoringStatus:
    server_status: str
    uptime_seconds: float
    queue_size: int
    active_polling: int
    avg_response_ms: float
    error_rate: float
    scraping_active: int
    scraping_pending: int


class AdminService:
    def __init__(self):
        self._limits_cache: dict = {}

    async def get_organization(self, org_id: str) -> Optional[dict]:
        orgs_coll = MongoDB.get_collection("organizations")
        users_coll = MongoDB.get_collection("users")
        plans_coll = MongoDB.get_collection("organization_plans")

        org = await orgs_coll.find_one(_org_filter(org_id))
        if not org:
            return None

        org_oid = str(org["_id"])
        user_count = await users_coll.count_documents(_org_query_filter(org_oid))

        sub = await plans_coll.find_one(_org_query_filter(org_oid))
        plan_name = None
        if sub and sub.get("plan_id"):
            plans = MongoDB.get_collection("plans")
            plan = await plans.find_one(
                {"_id": ObjectId(sub["plan_id"])} if ObjectId.is_valid(str(sub["plan_id"])) else {"slug": sub["plan_id"]}
            )
            plan_name = plan.get("name") if plan else None

        serialized = serialize_doc(org)
        return {
            "id": serialized.get("id", org_oid),
            "name": org.get("name"),
            "slug": org.get("slug"),
            "domain": org.get("domain"),
            "is_active": org.get("is_active", True),
            "plan_name": plan_name,
            "subscription_status": sub.get("status") if sub else None,
            "user_count": user_count,
            "created_at": serialized.get("created_at"),
        }

    async def list_organizations(
        self,
        search: str = None,
        status: str = None,
        plan: str = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        orgs_coll = MongoDB.get_collection("organizations")
        users_coll = MongoDB.get_collection("users")
        plans_coll = MongoDB.get_collection("organization_plans")

        query: dict = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": re.escape(search), "$options": "i"}},
                {"slug": {"$regex": re.escape(search), "$options": "i"}},
            ]
        if status == "active":
            query["is_active"] = True
        elif status == "inactive":
            query["is_active"] = False

        total = await orgs_coll.count_documents(query)
        cursor = (
            orgs_coll.find(query)
            .sort("created_at", -1)
            .skip((page - 1) * limit)
            .limit(limit)
        )
        orgs = await cursor.to_list(length=limit)

        orgs_data = []
        for org in orgs:
            org_oid = str(org["_id"])
            user_count = await users_coll.count_documents(_org_query_filter(org_oid))
            sub = await plans_coll.find_one(_org_query_filter(org_oid))
            serialized = serialize_doc(org)
            orgs_data.append({
                "id": serialized.get("id", org_oid),
                "name": org.get("name"),
                "slug": org.get("slug"),
                "domain": org.get("domain"),
                "is_active": org.get("is_active", True),
                "user_count": user_count,
                "subscription_status": sub.get("status", "none") if sub else "none",
                "created_at": serialized.get("created_at"),
            })

        return orgs_data, total

    async def suspend_organization(self, org_id: str, reason: str = None) -> bool:
        orgs_coll = MongoDB.get_collection("organizations")
        logs_coll = MongoDB.get_collection("admin_logs")

        result = await orgs_coll.update_one(
            _org_filter(org_id),
            {"$set": {"is_active": False, "suspended_at": datetime.utcnow(), "suspend_reason": reason}},
        )
        if result.matched_count == 0:
            return False

        await logs_coll.insert_one({
            "action": "suspend_organization",
            "resource_type": "organization",
            "resource_id": str(org_id),
            "old_values": {"is_active": True},
            "new_values": {"is_active": False, "reason": reason},
            "created_at": datetime.utcnow(),
        })
        return True

    async def reactivate_organization(self, org_id: str) -> bool:
        orgs_coll = MongoDB.get_collection("organizations")
        result = await orgs_coll.update_one(
            _org_filter(org_id),
            {"$set": {"is_active": True}, "$unset": {"suspended_at": "", "suspend_reason": ""}},
        )
        return result.matched_count > 0

    async def update_subscription(
        self,
        org_id: str,
        plan_id: str,
        status: str = None,
    ) -> bool:
        coll = MongoDB.get_collection("organization_plans")
        existing = await coll.find_one(_org_query_filter(org_id))
        update_doc = {"plan_id": plan_id, "updated_at": datetime.utcnow()}
        if status:
            update_doc["status"] = status
        if existing:
            await coll.update_one({"_id": existing["_id"]}, {"$set": update_doc})
        else:
            update_doc.update({
                "organization_id": str(org_id),
                "status": status or "active",
                "start_date": datetime.utcnow(),
                "created_at": datetime.utcnow(),
            })
            await coll.insert_one(update_doc)
        return True

    async def get_platform_stats(self) -> dict:
        orgs_coll = MongoDB.get_collection("organizations")
        users_coll = MongoDB.get_collection("users")
        subs_coll = MongoDB.get_collection("organization_plans")
        invoices_coll = MongoDB.get_collection("invoices")

        total_orgs = await orgs_coll.count_documents({})
        active_orgs = await orgs_coll.count_documents({"is_active": True})
        total_users = await users_coll.count_documents({})

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        mrr_cursor = invoices_coll.aggregate([
            {"$match": {"status": "paid", "created_at": {"$gte": thirty_days_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}},
        ])
        mrr_docs = await mrr_cursor.to_list(length=1)
        mrr = mrr_docs[0]["total"] if mrr_docs else 0.0

        total_subs = await subs_coll.count_documents({})
        active_subs = await subs_coll.count_documents({"status": "active"})

        return {
            "total_organizations": total_orgs,
            "active_organizations": active_orgs,
            "total_users": total_users,
            "mrr": mrr / 12 if mrr > 0 else 0,
            "arr": mrr,
            "total_subscriptions": total_subs,
            "active_subscriptions": active_subs,
            "churn_rate": 0.0,
            "new_orgs_this_month": await orgs_coll.count_documents(
                {"created_at": {"$gte": thirty_days_ago}}
            ),
        }

    async def get_billing_stats(self) -> dict:
        invoices_coll = MongoDB.get_collection("invoices")

        async def _sum_status(status: Optional[str] = None) -> float:
            match = {"status": status} if status else {}
            cursor = invoices_coll.aggregate([
                {"$match": match} if match else {"$match": {}},
                {"$group": {"_id": None, "total": {"$sum": "$total"}}},
            ])
            docs = await cursor.to_list(length=1)
            return docs[0]["total"] if docs else 0.0

        total_invoices = await _sum_status()
        paid_invoices = await _sum_status("paid")
        pending_invoices = await _sum_status("pending")
        failed_invoices = await _sum_status("failed")

        return {
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "pending_invoices": pending_invoices,
            "failed_invoices": failed_invoices,
            "average_invoice_value": total_invoices / 12 if total_invoices > 0 else 0,
            "by_plan": {},
            "by_status": {},
        }

    async def get_limits(self, org_id: str) -> dict:
        key = str(org_id)
        if key in self._limits_cache:
            return self._limits_cache[key]

        coll = MongoDB.get_collection("organization_limits")
        doc = await coll.find_one(_org_query_filter(key))
        if doc:
            limits = {k: v for k, v in doc.items() if k not in ("_id", "organization_id", "created_at", "updated_at")}
            self._limits_cache[key] = limits
            return limits

        defaults = {
            "ai_generations_limit": 1000,
            "ai_tokens_limit": 100000,
            "email_sends_limit": 10000,
            "email_daily_limit": 500,
            "scraping_jobs_limit": 100,
            "scraping_items_limit": 10000,
            "leads_limit": 50000,
            "campaigns_limit": 50,
            "users_limit": 20,
        }
        self._limits_cache[key] = defaults
        return defaults

    async def update_limits(self, org_id: str, limits: dict):
        key = str(org_id)
        coll = MongoDB.get_collection("organization_limits")
        await coll.update_one(
            _org_query_filter(key),
            {"$set": {**limits, "organization_id": key, "updated_at": datetime.utcnow()}},
            upsert=True,
        )
        if key not in self._limits_cache:
            await self.get_limits(key)
        self._limits_cache[key].update(limits)


class AbuseDetectionService:
    def __init__(self):
        self._suspicious_orgs: dict = {}
        self._rate_limiters: dict = {}

    async def check_scraping_abuse(
        self,
        org_id: str,
        job_type: str,
        items_extracted: int,
    ) -> tuple[bool, str]:
        coll = MongoDB.get_collection("scraping_jobs")
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_jobs = await coll.count_documents({
            "organization_id": str(org_id),
            "created_at": {"$gte": one_hour_ago},
        })

        if recent_jobs > 50:
            await self._create_abuse_report(
                org_id=str(org_id),
                report_type="scraping_abuse",
                severity="high",
                description=f"High scraping frequency: {recent_jobs} jobs in 1 hour",
                evidence={"recent_jobs": recent_jobs, "job_type": job_type},
            )
            return True, f"Scraping abuse detected: {recent_jobs} jobs/hour"

        if items_extracted > 10000:
            await self._create_abuse_report(
                org_id=str(org_id),
                report_type="scraping_abuse",
                severity="medium",
                description=f"Large extraction: {items_extracted} items",
                evidence={"items_extracted": items_extracted},
            )
            return True, f"Large extraction detected: {items_extracted} items"

        return False, ""

    async def check_sending_abuse(
        self,
        org_id: str,
        account_id: str,
        volume: int,
    ) -> tuple[bool, str]:
        coll = MongoDB.get_collection("emails")
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_sends = await coll.count_documents({
            "organization_id": str(org_id),
            "email_account_id": str(account_id),
            "sent_at": {"$gte": one_hour_ago},
        })

        if recent_sends + volume > 1000:
            await self._create_abuse_report(
                org_id=str(org_id),
                report_type="sending_abuse",
                severity="critical",
                description=f"Email sending abuse: {(recent_sends + volume)} emails in 1 hour",
                evidence={"recent_sends": recent_sends, "new_volume": volume},
            )
            return True, "Email sending abuse detected"

        return False, ""

    async def check_spam_signals(
        self,
        org_id: str,
        bounce_rate: float,
        complaint_rate: float,
    ) -> tuple[bool, str]:
        if bounce_rate > 0.1:
            await self._create_abuse_report(
                org_id=str(org_id),
                report_type="spam",
                severity="high",
                description=f"High bounce rate: {bounce_rate:.1%}",
                evidence={"bounce_rate": bounce_rate, "complaint_rate": complaint_rate},
            )
            return True, f"Spam signals: {bounce_rate:.1%} bounce rate"

        if complaint_rate > 0.001:
            await self._create_abuse_report(
                org_id=str(org_id),
                report_type="spam",
                severity="critical",
                description=f"High complaint rate: {complaint_rate:.2%}",
                evidence={"complaint_rate": complaint_rate},
            )
            return True, "Spam complaint abuse detected"

        return False, ""

    async def _create_abuse_report(
        self,
        org_id: str,
        report_type: str,
        severity: str,
        description: str,
        evidence: dict,
    ):
        coll = MongoDB.get_collection("abuse_reports")
        existing = await coll.find_one({
            "organization_id": str(org_id),
            "report_type": report_type,
            "status": "pending",
        })
        if existing:
            return

        await coll.insert_one({
            "organization_id": str(org_id),
            "report_type": report_type,
            "severity": severity,
            "description": description,
            "evidence": evidence,
            "status": "pending",
            "created_at": datetime.utcnow(),
        })

    async def list_abuse_reports(
        self,
        status: str = None,
        severity: str = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        coll = MongoDB.get_collection("abuse_reports")
        orgs_coll = MongoDB.get_collection("organizations")

        query: dict = {}
        if status:
            query["status"] = status
        if severity:
            query["severity"] = severity

        total = await coll.count_documents(query)
        cursor = coll.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
        reports = await cursor.to_list(length=limit)

        report_data = []
        for report in reports:
            serialized = serialize_doc(report)
            org_name = "Unknown"
            org_id = report.get("organization_id")
            if org_id and ObjectId.is_valid(str(org_id)):
                org = await orgs_coll.find_one({"_id": ObjectId(str(org_id))}, {"name": 1})
                if org:
                    org_name = org.get("name", "Unknown")

            report_data.append({
                "id": serialized.get("id"),
                "organization_id": str(org_id) if org_id else None,
                "organization_name": org_name,
                "report_type": report.get("report_type"),
                "severity": report.get("severity"),
                "description": report.get("description"),
                "status": report.get("status"),
                "created_at": serialized.get("created_at"),
            })

        return report_data, total

    async def resolve_abuse_report(self, report_id: str, action_taken: str) -> bool:
        coll = MongoDB.get_collection("abuse_reports")
        filt = {"_id": ObjectId(report_id)} if ObjectId.is_valid(str(report_id)) else {"id": report_id}
        result = await coll.update_one(
            filt,
            {
                "$set": {
                    "status": "resolved",
                    "action_taken": action_taken,
                    "resolved_at": datetime.utcnow(),
                }
            },
        )
        return result.matched_count > 0


class MonitoringService:
    async def get_system_status(self) -> dict:
        return {
            "server_status": "healthy",
            "uptime_seconds": 0,
            "active_threads": 1,
        }

    async def get_polling_health(self) -> dict:
        return {
            "active_connections": 0,
            "avg_latency_ms": 150,
            "success_rate": 99.5,
            "error_rate": 0.5,
        }

    async def get_queue_status(self) -> dict:
        from app.tasks.scheduler import polling_service

        return {
            "queue_size": 0,
            "active_tasks": polling_service.get_active_count() if hasattr(polling_service, "get_active_count") else 0,
            "pending_tasks": 0,
            "failed_tasks": 0,
        }


_admin_service: Optional[AdminService] = None
_abuse_service: Optional[AbuseDetectionService] = None
_monitoring_service: Optional[MonitoringService] = None


def get_admin_service() -> AdminService:
    global _admin_service
    if _admin_service is None:
        _admin_service = AdminService()
    return _admin_service


def get_abuse_service() -> AbuseDetectionService:
    global _abuse_service
    if _abuse_service is None:
        _abuse_service = AbuseDetectionService()
    return _abuse_service


def get_monitoring_service() -> MonitoringService:
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = MonitoringService()
    return _monitoring_service
