from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from app.db.mongodb import MongoDB, serialize_doc


class SystemOwnerDashboardService:
    @staticmethod
    async def get_platform_overview() -> Dict:
        """Get comprehensive platform overview with all key metrics."""
        
        users_count = await MongoDB.get_collection("users").count_documents({})
        organizations_count = await MongoDB.get_collection("organizations").count_documents({"is_active": True})
        
        leads_count = await MongoDB.get_collection("leads").count_documents({})
        campaigns_count = await MongoDB.get_collection("campaigns").count_documents({})
        
        active_campaigns = await MongoDB.get_collection("campaigns").count_documents({"status": "running"})
        
        meetings_count = await MongoDB.get_collection("meetings").count_documents({})
        
        emails_sent = await MongoDB.get_collection("email_messages").count_documents({"status": "sent"})
        
        scraping_jobs = await MongoDB.get_collection("scraping_jobs").count_documents({})
        scraping_completed = await MongoDB.get_collection("scraping_jobs").count_documents({"status": "completed"})
        
        workers_active = await MongoDB.get_collection("background_tasks").count_documents({"status": "running"})
        
        return {
            "total_users": users_count,
            "total_organizations": organizations_count,
            "total_leads": leads_count,
            "total_campaigns": campaigns_count,
            "active_campaigns": active_campaigns,
            "total_meetings": meetings_count,
            "emails_sent": emails_sent,
            "scraping_jobs": scraping_jobs,
            "scraping_completed": scraping_completed,
            "workers_active": workers_active,
            "timestamp": datetime.utcnow()
        }

    @staticmethod
    async def get_subscription_metrics() -> Dict:
        """Calculate MRR, ARR, and subscription metrics."""
        
        coll = MongoDB.get_collection("organization_plans")
        plans_coll = MongoDB.get_collection("plans")
        
        pipeline = [
            {"$match": {"status": "active"}},
            {"$lookup": {
                "from": "plans",
                "localField": "plan_id",
                "foreignField": "_id",
                "as": "plan"
            }},
            {"$unwind": {"path": "$plan", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": None,
                "total_subscriptions": {"$sum": 1},
                "total_monthly_revenue": {"$sum": {"$ifNull": ["$plan.price", 0]}},
                "plans_breakdown": {"$push": {"$ifNull": ["$plan.name", "Unknown"]}}
            }}
        ]
        
        result = await coll.aggregate(pipeline).to_list(length=1)
        
        if result:
            total_monthly = result[0].get("total_monthly_revenue", 0)
            return {
                "mrr": total_monthly,
                "arr": total_monthly * 12,
                "total_subscriptions": result[0].get("total_subscriptions", 0),
                "plans_breakdown": result[0].get("plans_breakdown", []),
                "avg_subscription_value": total_monthly / max(result[0].get("total_subscriptions", 1), 1)
            }
        
        return {
            "mrr": 0,
            "arr": 0,
            "total_subscriptions": 0,
            "plans_breakdown": [],
            "avg_subscription_value": 0
        }

    @staticmethod
    async def get_organizations_list(skip: int = 0, limit: int = 20) -> List[Dict]:
        """Get organizations with subscription details."""
        
        pipeline = [
            {"$match": {"is_active": True}},
            {"$lookup": {
                "from": "organization_plans",
                "pipeline": [
                    {"$match": {"status": "active"}},
                    {"$sort": {"created_at": -1}},
                    {"$limit": 1}
                ],
                "as": "subscription"
            }},
            {"$unwind": {"path": "$subscription", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "plans",
                "localField": "subscription.plan_id",
                "foreignField": "_id",
                "as": "plan"
            }},
            {"$unwind": {"path": "$plan", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "users",
                "pipeline": [{"$match": {"organization_id": {"$exists": True}}}],
                "as": "users"
            }},
            {"$addFields": {
                "user_count": {"$size": "$users"},
                "plan_name": {"$ifNull": ["$plan.name", "Free"]},
                "plan_price": {"$ifNull": ["$plan.price", 0]}
            }},
            {"$project": {
                "users": 0
            }},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        results = await MongoDB.get_collection("organizations").aggregate(pipeline).to_list(length=limit)
        return [serialize_doc(doc) for doc in results]

    @staticmethod
    async def get_revenue_analytics(days: int = 30) -> Dict:
        """Get revenue analytics with daily breakdown."""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "status": "active",
                "created_at": {"$gte": start_date}
            }},
            {"$lookup": {
                "from": "plans",
                "localField": "plan_id",
                "foreignField": "_id",
                "as": "plan"
            }},
            {"$unwind": {"path": "$plan", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"}
                },
                "new_subscriptions": {"$sum": 1},
                "revenue": {"$sum": {"$ifNull": ["$plan.price", 0]}}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        
        results = await MongoDB.get_collection("organization_plans").aggregate(pipeline).to_list(length=days)
        
        daily_data = []
        running_total = 0
        
        for r in results:
            running_total += r.get("revenue", 0)
            daily_data.append({
                "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
                "new_subscriptions": r.get("new_subscriptions", 0),
                "revenue": r.get("revenue", 0),
                "cumulative_revenue": running_total
            })
        
        total_revenue = sum(d.get("revenue", 0) for d in daily_data)
        total_subs = sum(d.get("new_subscriptions", 0) for d in daily_data)
        
        return {
            "period_days": days,
            "total_revenue": total_revenue,
            "total_new_subscriptions": total_subs,
            "avg_revenue_per_day": total_revenue / max(days, 1),
            "daily_breakdown": daily_data
        }

    @staticmethod
    async def get_ai_usage_analytics() -> Dict:
        """Get AI usage metrics and trends."""
        
        total_generations = await MongoDB.get_collection("ai_usage_logs").count_documents({})
        
        pipeline = [
            {"$group": {
                "_id": "$model",
                "count": {"$sum": 1},
                "total_tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}}
            }},
            {"$sort": {"count": -1}}
        ]
        
        model_usage = await MongoDB.get_collection("ai_usage_logs").aggregate(pipeline).to_list(length=10)
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        daily_pipeline = [
            {"$match": {"created_at": {"$gte": today_start}}},
            {"$group": {
                "_id": None,
                "today_generations": {"$sum": 1},
                "today_tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}}
            }}
        ]
        
        today_usage = await MongoDB.get_collection("ai_usage_logs").aggregate(daily_pipeline).to_list(length=1)
        
        last_7_days = datetime.utcnow() - timedelta(days=7)
        weekly_pipeline = [
            {"$match": {"created_at": {"$gte": last_7_days}}},
            {"$group": {
                "_id": None,
                "weekly_generations": {"$sum": 1},
                "weekly_tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}}
            }}
        ]
        
        weekly_usage = await MongoDB.get_collection("ai_usage_logs").aggregate(weekly_pipeline).to_list(length=1)
        
        return {
            "total_generations": total_generations,
            "model_usage": [{"model": m.get("_id", "unknown"), "count": m.get("count", 0), "tokens": m.get("total_tokens", 0)} for m in model_usage],
            "today_generations": today_usage[0].get("today_generations", 0) if today_usage else 0,
            "today_tokens": today_usage[0].get("today_tokens", 0) if today_usage else 0,
            "weekly_generations": weekly_usage[0].get("weekly_generations", 0) if weekly_usage else 0,
            "weekly_tokens": weekly_usage[0].get("weekly_tokens", 0) if weekly_usage else 0
        }

    @staticmethod
    async def get_smtp_health() -> Dict:
        """Get SMTP health metrics."""
        
        total_smtp = await MongoDB.get_collection("smtp_configs").count_documents({})
        active_smtp = await MongoDB.get_collection("smtp_configs").count_documents({"is_active": True})
        
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        sent_24h = await MongoDB.get_collection("email_messages").count_documents({
            "created_at": {"$gte": last_24h}
        })
        
        failed_24h = await MongoDB.get_collection("email_messages").count_documents({
            "created_at": {"$gte": last_24h},
            "status": "failed"
        })
        
        bounce_rate = (failed_24h / max(sent_24h, 1)) * 100
        
        pipeline = [
            {"$match": {"created_at": {"$gte": last_24h}}},
            {"$group": {
                "_id": "$smtp_config_id",
                "sent": {"$sum": 1},
                "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}
            }},
            {"$sort": {"sent": -1}},
            {"$limit": 5}
        ]
        
        top_smtp = await MongoDB.get_collection("email_messages").aggregate(pipeline).to_list(length=5)
        
        return {
            "total_configs": total_smtp,
            "active_configs": active_smtp,
            "emails_sent_24h": sent_24h,
            "emails_failed_24h": failed_24h,
            "bounce_rate": round(bounce_rate, 2),
            "delivery_rate": round(100 - bounce_rate, 2),
            "top_configs": top_smtp
        }

    @staticmethod
    async def get_scraping_health() -> Dict:
        """Get scraping service health metrics."""
        
        total_jobs = await MongoDB.get_collection("scraping_jobs").count_documents({})
        
        status_pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_breakdown = await MongoDB.get_collection("scraping_jobs").aggregate(status_pipeline).to_list(length=10)
        
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        jobs_24h = await MongoDB.get_collection("scraping_jobs").count_documents({
            "created_at": {"$gte": last_24h}
        })
        
        completed_24h = await MongoDB.get_collection("scraping_jobs").count_documents({
            "created_at": {"$gte": last_24h},
            "status": "completed"
        })
        
        failed_24h = await MongoDB.get_collection("scraping_jobs").count_documents({
            "created_at": {"$gte": last_24h},
            "status": "failed"
        })
        
        return {
            "total_jobs": total_jobs,
            "jobs_24h": jobs_24h,
            "completed_24h": completed_24h,
            "failed_24h": failed_24h,
            "success_rate": round((completed_24h / max(jobs_24h, 1)) * 100, 2),
            "status_breakdown": {s.get("_id", "unknown"): s.get("count", 0) for s in status_breakdown}
        }

    @staticmethod
    async def get_worker_health() -> Dict:
        """Get background worker health metrics."""
        
        active_workers = await MongoDB.get_collection("background_tasks").count_documents({"status": "running"})
        pending_tasks = await MongoDB.get_collection("background_tasks").count_documents({"status": "pending"})
        
        last_1h = datetime.utcnow() - timedelta(hours=1)
        
        completed_1h = await MongoDB.get_collection("background_tasks").count_documents({
            "created_at": {"$gte": last_1h},
            "status": "completed"
        })
        
        failed_1h = await MongoDB.get_collection("background_tasks").count_documents({
            "created_at": {"$gte": last_1h},
            "status": "failed"
        })
        
        pipeline = [
            {"$match": {"status": "pending"}},
            {"$group": {
                "_id": "$task_type",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        pending_by_type = await MongoDB.get_collection("background_tasks").aggregate(pipeline).to_list(length=10)
        
        return {
            "active_workers": active_workers,
            "pending_tasks": pending_tasks,
            "completed_1h": completed_1h,
            "failed_1h": failed_1h,
            "success_rate": round((completed_1h / max(completed_1h + failed_1h, 1)) * 100, 2),
            "pending_by_type": {t.get("_id", "unknown"): t.get("count", 0) for t in pending_by_type}
        }

    @staticmethod
    async def get_queue_monitoring() -> Dict:
        """Get queue monitoring data."""
        
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": last_24h}}},
            {"$group": {
                "_id": {
                    "hour": {"$hour": "$created_at"},
                    "task_type": "$task_type"
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.hour": 1}}
        ]
        
        hourly_data = await MongoDB.get_collection("background_tasks").aggregate(pipeline).to_list(length=200)
        
        hourly_aggregated = {}
        for h in hourly_data:
            hour = h.get("_id", {}).get("hour", 0)
            task_type = h.get("_id", {}).get("task_type", "unknown")
            if hour not in hourly_aggregated:
                hourly_aggregated[hour] = {}
            hourly_aggregated[hour][task_type] = h.get("count", 0)
        
        task_type_pipeline = [
            {"$match": {"created_at": {"$gte": last_24h}}},
            {"$group": {
                "_id": "$task_type",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}
            }},
            {"$sort": {"total": -1}}
        ]
        
        task_types = await MongoDB.get_collection("background_tasks").aggregate(task_type_pipeline).to_list(length=20)
        
        return {
            "hourly_breakdown": hourly_aggregated,
            "task_types": [{
                "name": t.get("_id", "unknown"),
                "total": t.get("total", 0),
                "completed": t.get("completed", 0),
                "failed": t.get("failed", 0)
            } for t in task_types],
            "total_tasks_24h": sum(t.get("total", 0) for t in task_types)
        }

    @staticmethod
    async def get_campaigns_analytics() -> Dict:
        """Get campaigns performance analytics."""
        
        total_campaigns = await MongoDB.get_collection("campaigns").count_documents({})
        active_campaigns = await MongoDB.get_collection("campaigns").count_documents({"status": "running"})
        
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_breakdown = await MongoDB.get_collection("campaigns").aggregate(pipeline).to_list(length=10)
        
        metrics_pipeline = [
            {"$group": {
                "_id": None,
                "total_recipients": {"$sum": {"$ifNull": ["$total_recipients", 0]}},
                "emails_sent": {"$sum": {"$ifNull": ["$emails_sent", 0]}},
                "emails_opened": {"$sum": {"$ifNull": ["$emails_opened", 0]}},
                "emails_clicked": {"$sum": {"$ifNull": ["$emails_clicked", 0]}},
                "emails_replied": {"$sum": {"$ifNull": ["$emails_replied", 0]}}
            }}
        ]
        
        metrics = await MongoDB.get_collection("campaigns").aggregate(metrics_pipeline).to_list(length=1)
        
        m = metrics[0] if metrics else {}
        
        emails_sent = m.get("emails_sent", 0)
        emails_opened = m.get("emails_opened", 0)
        
        return {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "status_breakdown": {s.get("_id", "unknown"): s.get("count", 0) for s in status_breakdown},
            "total_recipients": m.get("total_recipients", 0),
            "emails_sent": emails_sent,
            "open_rate": round((emails_opened / max(emails_sent, 1)) * 100, 2),
            "click_rate": round((m.get("emails_clicked", 0) / max(emails_sent, 1)) * 100, 2),
            "reply_rate": round((m.get("emails_replied", 0) / max(emails_sent, 1)) * 100, 2)
        }

    @staticmethod
    async def get_leads_analytics() -> Dict:
        """Get leads generation analytics."""
        
        total_leads = await MongoDB.get_collection("leads").count_documents({})
        
        last_30d = datetime.utcnow() - timedelta(days=30)
        
        leads_30d = await MongoDB.get_collection("leads").count_documents({"created_at": {"$gte": last_30d}})
        
        pipeline = [
            {"$match": {"created_at": {"$gte": last_30d}}},
            {"$group": {
                "_id": {"$month": "$created_at"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        monthly_leads = await MongoDB.get_collection("leads").aggregate(pipeline).to_list(length=12)
        
        source_pipeline = [
            {"$match": {"created_at": {"$gte": last_30d}}},
            {"$group": {
                "_id": {"$ifNull": ["$source", "direct"]},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        sources = await MongoDB.get_collection("leads").aggregate(source_pipeline).to_list(length=10)
        
        return {
            "total_leads": total_leads,
            "leads_30d": leads_30d,
            "monthly_breakdown": [{"month": m.get("_id", 0), "count": m.get("count", 0)} for m in monthly_leads],
            "sources": [{"source": s.get("_id", "unknown"), "count": s.get("count", 0)} for s in sources]
        }

    @staticmethod
    async def get_meetings_analytics() -> Dict:
        """Get meetings booking analytics."""
        
        total_meetings = await MongoDB.get_collection("meetings").count_documents({})
        
        last_30d = datetime.utcnow() - timedelta(days=30)
        
        meetings_30d = await MongoDB.get_collection("meetings").count_documents({"created_at": {"$gte": last_30d}})
        
        completed_pipeline = [
            {"$match": {
                "created_at": {"$gte": last_30d},
                "status": "completed"
            }},
            {"$count": "completed"}
        ]
        
        completed = await MongoDB.get_collection("meetings").aggregate(completed_pipeline).to_list(length=1)
        
        return {
            "total_meetings": total_meetings,
            "meetings_30d": meetings_30d,
            "completed_30d": completed[0].get("completed", 0) if completed else 0,
            "completion_rate": round((completed[0].get("completed", 0) / max(meetings_30d, 1)) * 100, 2) if meetings_30d > 0 else 0
        }

    @staticmethod
    async def get_comprehensive_dashboard() -> Dict:
        """Get all dashboard data in one call."""
        
        overview = await SystemOwnerDashboardService.get_platform_overview()
        subscriptions = await SystemOwnerDashboardService.get_subscription_metrics()
        revenue = await SystemOwnerDashboardService.get_revenue_analytics()
        ai_usage = await SystemOwnerDashboardService.get_ai_usage_analytics()
        smtp = await SystemOwnerDashboardService.get_smtp_health()
        scraping = await SystemOwnerDashboardService.get_scraping_health()
        workers = await SystemOwnerDashboardService.get_worker_health()
        queue = await SystemOwnerDashboardService.get_queue_monitoring()
        campaigns = await SystemOwnerDashboardService.get_campaigns_analytics()
        leads = await SystemOwnerDashboardService.get_leads_analytics()
        meetings = await SystemOwnerDashboardService.get_meetings_analytics()
        
        return {
            "overview": overview,
            "subscriptions": subscriptions,
            "revenue": revenue,
            "ai_usage": ai_usage,
            "smtp": smtp,
            "scraping": scraping,
            "workers": workers,
            "queue": queue,
            "campaigns": campaigns,
            "leads": leads,
            "meetings": meetings,
            "generated_at": datetime.utcnow()
        }