"""
Outflo - Super Admin Service
Organization management, billing, monitoring, and abuse detection
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Any
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update, or_

from app.db import AsyncSessionLocal

logger = logging.getLogger(__name__)


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

    async def get_organization(self, org_id: int, db: AsyncSession) -> Optional[dict]:
        from app.models.models import Organization, User
        from app.models.admin_models import Subscription, Plan

        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = result.scalar_one_or_none()
        if not org:
            return None

        user_count_result = await db.execute(
            select(func.count(User.id)).where(User.organization_id == org_id)
        )
        user_count = user_count_result.scalar() or 0

        sub_result = await db.execute(
            select(Subscription).where(Subscription.organization_id == org_id)
        )
        sub = sub_result.scalar_one_or_none()

        plan_name = None
        if sub:
            plan_result = await db.execute(
                select(Plan).where(Plan.id == sub.plan_id)
            )
            plan = plan_result.scalar_one_or_none()
            plan_name = plan.name if plan else None

        return {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "domain": org.domain,
            "is_active": org.is_active,
            "plan_name": plan_name,
            "subscription_status": sub.status if sub else None,
            "user_count": user_count,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        }

    async def list_organizations(
        self,
        db: AsyncSession,
        search: str = None,
        status: str = None,
        plan: str = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        from app.models.models import Organization, User
        from app.models.admin_models import Subscription, Plan

        conditions = []
        if search:
            conditions.append(Organization.name.ilike(f"%{search}%"))
        if status == "active":
            conditions.append(Organization.is_active == True)
        elif status == "inactive":
            conditions.append(Organization.is_active == False)

        count_query = select(func.count(Organization.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        query = select(Organization).order_by(Organization.created_at.desc())
        if conditions:
            query = query.where(and_(*conditions))
        query = query.offset((page - 1) * limit).limit(limit)

        result = await db.execute(query)
        orgs = result.scalars().all()

        orgs_data = []
        for org in orgs:
            user_count_result = await db.execute(
                select(func.count(User.id)).where(User.organization_id == org.id)
            )
            user_count = user_count_result.scalar() or 0

            sub_result = await db.execute(
                select(Subscription).where(Subscription.organization_id == org.id)
            )
            sub = sub_result.scalar_one_or_none()

            orgs_data.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "domain": org.domain,
                "is_active": org.is_active,
                "user_count": user_count,
                "subscription_status": sub.status if sub else "none",
                "created_at": org.created_at.isoformat() if org.created_at else None,
            })

        return orgs_data, total

    async def suspend_organization(self, org_id: int, db: AsyncSession, reason: str = None) -> bool:
        from app.models.models import Organization
        from app.models.admin_models import AdminLog

        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = result.scalar_one_or_none()
        if not org:
            return False

        org.is_active = False

        log = AdminLog(
            admin_user_id=0,
            action="suspend_organization",
            resource_type="organization",
            resource_id=str(org_id),
            old_values={"is_active": True},
            new_values={"is_active": False, "reason": reason},
        )
        db.add(log)

        await db.commit()
        return True

    async def reactivate_organization(self, org_id: int, db: AsyncSession) -> bool:
        from app.models.models import Organization

        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = result.scalar_one_or_none()
        if not org:
            return False

        org.is_active = True
        await db.commit()
        return True

    async def update_subscription(
        self,
        org_id: int,
        plan_id: int,
        status: str = None,
        db: AsyncSession = None,
    ) -> bool:
        from app.models.admin_models import Subscription

        async with AsyncSessionLocal() as db_session:
            result = await db_session.execute(
                select(Subscription).where(Subscription.organization_id == org_id)
            )
            sub = result.scalar_one_or_none()

            if sub:
                if plan_id:
                    sub.plan_id = plan_id
                if status:
                    sub.status = status
            else:
                sub = Subscription(
                    organization_id=org_id,
                    plan_id=plan_id,
                    status=status or "active",
                )
                db_session.add(sub)

            await db_session.commit()
            return True

    async def get_platform_stats(self, db: AsyncSession) -> dict:
        from app.models.models import Organization, User
        from app.models.admin_models import Subscription, Invoice

        org_count_result = await db.execute(
            select(func.count(Organization.id))
        )
        total_orgs = org_count_result.scalar() or 0

        active_orgs_result = await db.execute(
            select(func.count(Organization.id)).where(Organization.is_active == True)
        )
        active_orgs = active_orgs_result.scalar() or 0

        user_count_result = await db.execute(
            select(func.count(User.id))
        )
        total_users = user_count_result.scalar() or 0

        mrr_result = await db.execute(
            select(func.sum(Invoice.total)).where(
                and_(
                    Invoice.status == "paid",
                    Invoice.created_at >= datetime.utcnow() - timedelta(days=30),
                )
            )
        )
        mrr = mrr_result.scalar() or 0.0

        sub_count_result = await db.execute(
            select(func.count(Subscription.id))
        )
        total_subs = sub_count_result.scalar() or 0

        active_sub_result = await db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.status == "active"
            )
        )
        active_subs = active_sub_result.scalar() or 0

        return {
            "total_organizations": total_orgs,
            "active_organizations": active_orgs,
            "total_users": total_users,
            "mrr": mrr / 12 if mrr > 0 else 0,
            "arr": mrr,
            "total_subscriptions": total_subs,
            "active_subscriptions": active_subs,
            "churn_rate": 0.0,
            "new_orgs_this_month": 0,
        }

    async def get_billing_stats(self, db: AsyncSession) -> dict:
        from app.models.admin_models import Invoice, Plan

        total_result = await db.execute(
            select(func.sum(Invoice.total))
        )
        total_invoices = total_result.scalar() or 0.0

        paid_result = await db.execute(
            select(func.sum(Invoice.total)).where(Invoice.status == "paid")
        )
        paid_invoices = paid_result.scalar() or 0.0

        pending_result = await db.execute(
            select(func.sum(Invoice.total)).where(Invoice.status == "pending")
        )
        pending_invoices = pending_result.scalar() or 0.0

        failed_result = await db.execute(
            select(func.sum(Invoice.total)).where(Invoice.status == "failed")
        )
        failed_invoices = failed_result.scalar() or 0.0

        return {
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "pending_invoices": pending_invoices,
            "failed_invoices": failed_invoices,
            "average_invoice_value": total_invoices / 12 if total_invoices > 0 else 0,
            "by_plan": {},
            "by_status": {},
        }

    async def get_limits(self, org_id: int) -> dict:
        if org_id in self._limits_cache:
            return self._limits_cache[org_id]

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

        self._limits_cache[org_id] = defaults
        return defaults

    async def update_limits(self, org_id: int, limits: dict):
        if org_id not in self._limits_cache:
            await self.get_limits(org_id)

        self._limits_cache[org_id].update(limits)


class AbuseDetectionService:
    def __init__(self):
        self._suspicious_orgs: dict = {}
        self._rate_limiters: dict = {}

    async def check_scraping_abuse(
        self,
        org_id: int,
        job_type: str,
        items_extracted: int,
        db: AsyncSession,
    ) -> tuple[bool, str]:
        async with AsyncSessionLocal() as db_session:
            from app.models.models import ScrapingJob

            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            result = await db_session.execute(
                select(func.count(ScrapingJob.id)).where(
                    and_(
                        ScrapingJob.organization_id == org_id,
                        ScrapingJob.created_at >= one_hour_ago,
                    )
                )
            )
            recent_jobs = result.scalar() or 0

            if recent_jobs > 50:
                await self._create_abuse_report(
                    org_id=org_id,
                    report_type="scraping_abuse",
                    severity="high",
                    description=f"High scraping frequency: {recent_jobs} jobs in 1 hour",
                    evidence={"recent_jobs": recent_jobs, "job_type": job_type},
                    db=db_session,
                )
                return True, f"Scraping abuse detected: {recent_jobs} jobs/hour"

            if items_extracted > 10000:
                await self._create_abuse_report(
                    org_id=org_id,
                    report_type="scraping_abuse",
                    severity="medium",
                    description=f"Large extraction: {items_extracted} items",
                    evidence={"items_extracted": items_extracted},
                    db=db_session,
                )
                return True, f"Large extraction detected: {items_extracted} items"

            return False, ""

    async def check_sending_abuse(
        self,
        org_id: int,
        account_id: int,
        volume: int,
        db: AsyncSession,
    ) -> tuple[bool, str]:
        async with AsyncSessionLocal() as db_session:
            from app.models.models import Email

            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            result = await db_session.execute(
                select(func.count(Email.id)).where(
                    and_(
                        Email.organization_id == org_id,
                        Email.email_account_id == account_id,
                        Email.sent_at >= one_hour_ago,
                    )
                )
            )
            recent_sends = result.scalar() or 0

            if recent_sends + volume > 1000:
                await self._create_abuse_report(
                    org_id=org_id,
                    report_type="sending_abuse",
                    severity="critical",
                    description=f"Email sending abuse: {(recent_sends + volume)} emails in 1 hour",
                    evidence={"recent_sends": recent_sends, "new_volume": volume},
                    db=db_session,
                )
                return True, "Email sending abuse detected"

            return False, ""

    async def check_spam_signals(
        self,
        org_id: int,
        bounce_rate: float,
        complaint_rate: float,
        db: AsyncSession,
    ) -> tuple[bool, str]:
        if bounce_rate > 0.1:
            await self._create_abuse_report(
                org_id=org_id,
                report_type="spam",
                severity="high",
                description=f"High bounce rate: {bounce_rate:.1%}",
                evidence={"bounce_rate": bounce_rate, "complaint_rate": complaint_rate},
                db=db,
            )
            return True, f"Spam signals: {bounce_rate:.1%} bounce rate"

        if complaint_rate > 0.001:
            await self._create_abuse_report(
                org_id=org_id,
                report_type="spam",
                severity="critical",
                description=f"High complaint rate: {complaint_rate:.2%}",
                evidence={"complaint_rate": complaint_rate},
                db=db,
            )
            return True, "Spam complaint abuse detected"

        return False, ""

    async def _create_abuse_report(
        self,
        org_id: int,
        report_type: str,
        severity: str,
        description: str,
        evidence: dict,
        db: AsyncSession,
    ):
        from app.models.admin_models import AbuseReport

        existing = await db.execute(
            select(AbuseReport).where(
                and_(
                    AbuseReport.organization_id == org_id,
                    AbuseReport.report_type == report_type,
                    AbuseReport.status == "pending",
                )
            )
        )
        if existing.scalar_one_or_none():
            return

        report = AbuseReport(
            organization_id=org_id,
            report_type=report_type,
            severity=severity,
            description=description,
            evidence=evidence,
            status="pending",
        )
        db.add(report)
        await db.commit()

    async def list_abuse_reports(
        self,
        db: AsyncSession,
        status: str = None,
        severity: str = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        from app.models.admin_models import AbuseReport
        from app.models.models import Organization

        conditions = []
        if status:
            conditions.append(AbuseReport.status == status)
        if severity:
            conditions.append(AbuseReport.severity == severity)

        count_query = select(func.count(AbuseReport.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        query = select(AbuseReport).order_by(AbuseReport.created_at.desc())
        if conditions:
            query = query.where(and_(*conditions))
        query = query.offset((page - 1) * limit).limit(limit)

        result = await db.execute(query)
        reports = result.scalars().all()

        report_data = []
        for report in reports:
            org_result = await db.execute(
                select(Organization.name).where(Organization.id == report.organization_id)
            )
            org_name = org_result.scalar() or "Unknown"

            report_data.append({
                "id": report.id,
                "organization_id": report.organization_id,
                "organization_name": org_name,
                "report_type": report.report_type,
                "severity": report.severity,
                "description": report.description,
                "status": report.status,
                "created_at": report.created_at.isoformat() if report.created_at else None,
            })

        return report_data, total

    async def resolve_abuse_report(
        self,
        report_id: int,
        action_taken: str,
        db: AsyncSession,
    ) -> bool:
        from app.models.admin_models import AbuseReport

        result = await db.execute(
            select(AbuseReport).where(AbuseReport.id == report_id)
        )
        report = result.scalar_one_or_none()
        if not report:
            return False

        report.status = "resolved"
        report.action_taken = action_taken
        report.resolved_at = datetime.utcnow()

        await db.commit()
        return True


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