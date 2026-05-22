"""
Outflo - Analytics Engine
Aggregation, reporting, and insights
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Any
from dataclasses import dataclass

from app.db.mongodb import MongoDB

logger = logging.getLogger(__name__)


def _org_filter(org_id) -> dict:
    return {"organization_id": str(org_id)}


@dataclass
class DatePeriod:
    start: datetime
    end: datetime
    label: str


class DateRangeCalculator:
    PRESETS = {
        "today": lambda: DatePeriod(
            start=datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
            end=datetime.utcnow(),
            label="Today",
        ),
        "yesterday": lambda: DatePeriod(
            start=(datetime.utcnow() - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0),
            end=(datetime.utcnow() - timedelta(days=1)).replace(hour=23, minute=59, second=59),
            label="Yesterday",
        ),
        "last_7_days": lambda: DatePeriod(
            start=datetime.utcnow() - timedelta(days=7),
            end=datetime.utcnow(),
            label="Last 7 Days",
        ),
        "last_30_days": lambda: DatePeriod(
            start=datetime.utcnow() - timedelta(days=30),
            end=datetime.utcnow(),
            label="Last 30 Days",
        ),
        "this_month": lambda: DatePeriod(
            start=datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            end=datetime.utcnow(),
            label="This Month",
        ),
        "last_month": lambda: DatePeriod(
            start=(datetime.utcnow() - timedelta(days=30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            end=datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1),
            label="Last Month",
        ),
        "this_quarter": lambda: DatePeriod(
            start=self._quarter_start(),
            end=datetime.utcnow(),
            label="This Quarter",
        ),
        "this_year": lambda: DatePeriod(
            start=datetime.utcnow().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0),
            end=datetime.utcnow(),
            label="This Year",
        ),
    }

    @classmethod
    def _quarter_start(cls) -> datetime:
        now = datetime.utcnow()
        quarter = (now.month - 1) // 3
        month = quarter * 3 + 1
        return now.replace(month=month, day=1, hour=0, minute=0, second=0, microsecond=0)

    @classmethod
    def get_period(cls, preset: str = None, start_date: datetime = None, end_date: datetime = None) -> DatePeriod:
        if preset and preset in cls.PRESETS:
            return cls.PRESETS[preset]()

        if start_date and end_date:
            return DatePeriod(start=start_date, end=end_date, label="Custom Range")

        return cls.PRESETS["last_30_days"]()

    @classmethod
    def get_comparison_period(cls, period: DatePeriod, days: int = 30) -> DatePeriod:
        duration = (period.end - period.start).days
        return DatePeriod(
            start=period.start - timedelta(days=duration or days),
            end=period.start - timedelta(seconds=1),
            label="Previous Period",
        )


class MetricsAggregator:
    def __init__(self, db=None):
        self.db = db

    async def get_lead_metrics(
        self,
        org_id: int,
        start_date: datetime,
        end_date: datetime,
        comparison: bool = False,
        comp_start: datetime = None,
        comp_end: datetime = None,
    ) -> dict:
        coll = MongoDB.get_collection("leads")
        base = _org_filter(org_id)
        total_leads = await coll.count_documents(base)
        leads_discovered = await coll.count_documents({
            **base,
            "created_at": {"$gte": start_date, "$lte": end_date},
        })
        valid_emails = await coll.count_documents({**base, "is_valid_email": True})
        enriched = await coll.count_documents({**base, "enrichment_status": "completed"})

        by_source: dict = {}
        async for doc in coll.aggregate([
            {"$match": base},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]):
            by_source[doc["_id"] or "unknown"] = doc["count"]

        by_status: dict = {}
        async for doc in coll.aggregate([
            {"$match": base},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]):
            by_status[doc["_id"] or "unknown"] = doc["count"]

        current_metrics = {
            "total_leads": total_leads,
            "leads_discovered": leads_discovered,
            "valid_emails": valid_emails,
            "email_validity_rate": (valid_emails / total_leads * 100) if total_leads > 0 else 0,
            "enriched_leads": enriched,
            "enrichment_score": (enriched / total_leads * 100) if total_leads > 0 else 0,
            "by_source": by_source,
            "by_status": by_status,
        }

        if comparison and comp_start and comp_end:
            comp_discovered = await coll.count_documents({
                **base,
                "created_at": {"$gte": comp_start, "$lte": comp_end},
            })
            current_metrics["leads_discovered_comparison"] = comp_discovered
            current_metrics["leads_discovered_change"] = (
                ((leads_discovered - comp_discovered) / comp_discovered * 100)
                if comp_discovered > 0 else 0
            )

        return current_metrics

    async def _email_query(self, org_id, campaign_id=None, start_date=None, end_date=None) -> dict:
        q = _org_filter(org_id)
        if campaign_id is not None:
            q["campaign_id"] = str(campaign_id)
        if start_date and end_date:
            q["sent_at"] = {"$gte": start_date, "$lte": end_date}
        return q

    async def get_campaign_metrics(
        self,
        org_id: int,
        campaign_id: Optional[int] = None,
        start_date: datetime = None,
        end_date: datetime = None,
    ) -> dict:
        coll = MongoDB.get_collection("emails")
        q = await self._email_query(org_id, campaign_id, start_date, end_date)
        emails = await coll.find(q).to_list(length=50000)
        sent = len([e for e in emails if e.get("sent_at")])
        delivered = len([e for e in emails if e.get("sent_at") and not e.get("bounced_at")])
        opened = len([e for e in emails if e.get("opened_at")])
        clicked = len([e for e in emails if e.get("clicked_at")])
        replied = len([e for e in emails if e.get("replied_at")])
        bounced = len([e for e in emails if e.get("bounced_at")])

        campaigns_coll = MongoDB.get_collection("campaigns")
        by_campaign = []
        async for c in campaigns_coll.find(_org_filter(org_id)).limit(10):
            cid = str(c["_id"])
            camp_emails = [e for e in emails if str(e.get("campaign_id")) == cid]
            s = len(camp_emails)
            o = len([e for e in camp_emails if e.get("opened_at")])
            r = len([e for e in camp_emails if e.get("replied_at")])
            b = len([e for e in camp_emails if e.get("bounced_at")])
            by_campaign.append({
                "id": cid,
                "name": c.get("name", "Campaign"),
                "sent": s,
                "opened": o,
                "replied": r,
                "bounced": b,
                "open_rate": (o / s * 100) if s else 0,
                "reply_rate": (r / s * 100) if s else 0,
            })
        by_campaign.sort(key=lambda x: x["sent"], reverse=True)

        return {
            "sent": sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "replied": replied,
            "bounced": bounced,
            "delivery_rate": (delivered / sent * 100) if sent else 0,
            "open_rate": (opened / delivered * 100) if delivered else 0,
            "click_rate": (clicked / delivered * 100) if delivered else 0,
            "reply_rate": (replied / delivered * 100) if delivered else 0,
            "bounce_rate": (bounced / sent * 100) if sent else 0,
            "by_campaign": by_campaign,
            "funnel": [],
        }

    async def get_sales_metrics(
        self,
        org_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        return {
            "meetings_booked": 0,
            "meetings_completed": 0,
            "meeting_completion_rate": 0,
            "conversions": 0,
            "conversion_rate": 0,
            "revenue": 0.0,
            "avg_deal_size": 0,
            "roi": 0.0,
            "by_source": {},
            "sales_funnel": [],
        }

    async def get_ai_metrics(
        self,
        org_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        coll = MongoDB.get_collection("ai_usage")
        q = {**_org_filter(org_id), "created_at": {"$gte": start_date, "$lte": end_date}}
        records = await coll.find(q).to_list(length=10000)
        total_generations = len(records)
        total_tokens = sum(r.get("total_tokens", 0) or 0 for r in records)
        latencies = [r.get("latency_ms", 0) for r in records if r.get("latency_ms")]
        successes = sum(1 for r in records if r.get("success"))
        by_feature: dict = {}
        by_model: dict = {}
        for r in records:
            feat = r.get("feature") or "unknown"
            model = r.get("model") or "unknown"
            by_feature.setdefault(feat, {"count": 0, "tokens": 0})
            by_feature[feat]["count"] += 1
            by_feature[feat]["tokens"] += r.get("total_tokens", 0) or 0
            by_model.setdefault(model, {"count": 0, "tokens": 0})
            by_model[model]["count"] += 1
            by_model[model]["tokens"] += r.get("total_tokens", 0) or 0
        return {
            "total_generations": total_generations,
            "total_tokens": total_tokens,
            "avg_latency_ms": (sum(latencies) / len(latencies)) if latencies else 0,
            "success_rate": (successes / total_generations * 100) if total_generations else 0,
            "by_feature": by_feature,
            "by_model": by_model,
            "personalization_score": 0,
            "cost_savings": 0.0,
        }

    async def get_system_metrics(
        self,
        org_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        coll = MongoDB.get_collection("scraping_jobs")
        q = {**_org_filter(org_id), "created_at": {"$gte": start_date, "$lte": end_date}}
        jobs = await coll.find(q).to_list(length=5000)
        completed = sum(1 for j in jobs if j.get("status") == "completed")
        return {
            "scraping_jobs": len(jobs),
            "scraping_success_rate": (completed / len(jobs) * 100) if jobs else 0,
            "items_extracted": sum(j.get("successful_items", 0) or 0 for j in jobs),
            "queue_size": 0,
            "worker_health": {"active": 0, "idle": 0, "failed": 0},
            "api_latency": 0,
            "error_rate": 0,
        }

    async def get_trend_data(
        self,
        org_id: int,
        metric: str,
        start_date: datetime,
        end_date: datetime,
        interval: str = "day",
    ) -> dict:
        days = max((end_date - start_date).days, 1)
        labels, values = [], []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            if metric == "leads":
                count = await MongoDB.get_collection("leads").count_documents({
                    **_org_filter(org_id),
                    "created_at": {"$gte": day_start, "$lt": day_end},
                })
            elif metric in ("emails_sent", "emails_opened"):
                field = "sent_at" if metric == "emails_sent" else "opened_at"
                count = await MongoDB.get_collection("emails").count_documents({
                    **_org_filter(org_id),
                    field: {"$gte": day_start, "$lt": day_end},
                })
            else:
                count = 0
            labels.append(day_start.strftime("%b %d"))
            values.append(count)
        return {"labels": labels, "datasets": [{"label": metric.replace("_", " ").title(), "data": values}], "type": "line"}

    async def get_activity_feed(self, org_id: int, limit: int = 20) -> list[dict]:
        coll = MongoDB.get_collection("audit_logs")
        cursor = coll.find(_org_filter(org_id)).sort("created_at", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        return [
            {
                "id": str(log.get("_id")),
                "type": log.get("action", "activity"),
                "title": str(log.get("action", "activity")).replace("_", " ").title(),
                "description": f"{log.get('resource_type', '')} {log.get('resource_id', '')}".strip(),
                "timestamp": log.get("created_at", datetime.utcnow()).isoformat()
                if hasattr(log.get("created_at"), "isoformat")
                else str(log.get("created_at")),
                "metadata": log.get("new_values") or log.get("details") or {},
            }
            for log in logs
        ]



class ReportGenerator:
    def __init__(self, db=None):
        self.db = db
        self.aggregator = MetricsAggregator(db)

    async def generate_executive_summary(self, org_id: int, start_date: datetime, end_date: datetime) -> dict:
        campaign = await self.aggregator.get_campaign_metrics(org_id, None, start_date, end_date)
        sales = await self.aggregator.get_sales_metrics(org_id, start_date, end_date)
        leads = await self.aggregator.get_lead_metrics(org_id, start_date, end_date)
        ai = await self.aggregator.get_ai_metrics(org_id, start_date, end_date)
        top_campaigns = sorted(campaign.get("by_campaign", []), key=lambda x: x.get("sent", 0), reverse=True)[:5]
        top_sources = sorted(leads.get("by_source", {}).items(), key=lambda x: x[1], reverse=True)[:5]
        return {
            "period": {"start_date": start_date, "end_date": end_date},
            "campaigns_active": leads.get("total_leads", 0),
            "emails_sent": campaign.get("sent", 0),
            "reply_rate": campaign.get("reply_rate", 0),
            "revenue": sales.get("revenue", 0),
            "conversions": sales.get("conversions", 0),
            "ai_usage": ai.get("total_generations", 0),
            "top_campaigns": top_campaigns,
            "top_sources": [{"name": s[0], "value": s[1]} for s in top_sources],
            "key_insights": [],
        }

    async def export_data(
        self,
        report_type: str,
        org_id: int,
        start_date: datetime,
        end_date: datetime,
        format: str = "csv",
        columns: list = None,
    ) -> dict:
        rows = []
        if report_type == "leads":
            coll = MongoDB.get_collection("leads")
            docs = await coll.find({
                **_org_filter(org_id),
                "created_at": {"$gte": start_date, "$lte": end_date},
            }).sort("created_at", -1).to_list(5000)
            headers = ["Email", "First Name", "Last Name", "Company", "Status", "Created"]
            rows = [
                [d.get("email"), d.get("first_name"), d.get("last_name"), d.get("company_name"), d.get("status"), d.get("created_at")]
                for d in docs
            ]
        elif report_type == "campaigns":
            coll = MongoDB.get_collection("emails")
            docs = await coll.find({
                **_org_filter(org_id),
                "sent_at": {"$gte": start_date, "$lte": end_date},
            }).sort("sent_at", -1).to_list(5000)
            headers = ["Subject", "To", "Status", "Sent"]
            rows = [[d.get("subject"), d.get("to_email"), d.get("status"), d.get("sent_at")] for d in docs]
        else:
            headers = ["Data"]
        return {
            "report_type": report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "headers": headers,
            "rows": [[str(c) if c is not None else "" for c in row] for row in rows],
            "total": len(rows),
        }


def get_metrics_aggregator(db=None) -> MetricsAggregator:
    return MetricsAggregator(db)


def get_report_generator(db=None) -> ReportGenerator:
    return ReportGenerator(db)
