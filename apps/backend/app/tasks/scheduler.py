import asyncio
from datetime import datetime, timedelta
from typing import Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.services.task_service import TaskService


class PollingService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running = False

    async def start(self):
        self.scheduler.add_job(
            self.check_pending_tasks,
            trigger=IntervalTrigger(seconds=5),
            id="check_pending_tasks",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.check_campaign_schedules,
            trigger=IntervalTrigger(minutes=1),
            id="check_campaign_schedules",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.check_email_statuses,
            trigger=IntervalTrigger(minutes=2),
            id="check_email_statuses",
            replace_existing=True,
        )
        self.scheduler.start()
        self._running = True

    async def stop(self):
        self.scheduler.shutdown(wait=False)
        self._running = False

    def get_active_count(self) -> int:
        return 0

    async def check_pending_tasks(self):
        try:
            task_service = TaskService()
            tasks = await task_service.get_pending_tasks(10)
            for task in tasks:
                await self.process_task(task, task_service)
        except Exception as e:
            print(f"Error checking pending tasks: {e}")

    async def process_task(self, task: dict, task_service: TaskService):
        task_id = task.get("id")
        if not task_id:
            return
        try:
            await task_service.mark_task_started(task_id)
            task_type = task.get("task_name") or task.get("task_type")
            if task_type == "send_email":
                await self._process_send_email(task)
            elif task_type == "personalize_content":
                await self._process_personalize_content(task)
            elif task_type == "enrich_lead":
                await self._process_enrich_lead(task)
            elif task_type == "scrape_data":
                pass
            await task_service.mark_task_completed(task_id, {"status": "completed"})
        except Exception as e:
            await task_service.mark_task_failed(task_id, str(e))

    async def _process_send_email(self, task: dict):
        payload = task.get("payload") or {}
        campaign_id = payload.get("campaign_id")
        lead_id = payload.get("lead_id")
        if not campaign_id or not lead_id:
            return
        coll = MongoDB.get_collection("campaign_leads")
        await coll.update_one(
            {"campaign_id": str(campaign_id), "lead_id": str(lead_id)},
            {"$set": {"status": "completed", "updated_at": datetime.utcnow()}},
            upsert=True,
        )

    async def _process_personalize_content(self, task: dict):
        payload = task.get("payload") or {}
        campaign_lead_id = payload.get("campaign_lead_id")
        if not campaign_lead_id:
            return
        coll = MongoDB.get_collection("campaign_leads")
        try:
            oid = ObjectId(campaign_lead_id)
        except Exception:
            return
        await coll.update_one(
            {"_id": oid},
            {"$set": {"ai_personalized_content": "Personalized content generated.", "updated_at": datetime.utcnow()}},
        )

    async def _process_enrich_lead(self, task: dict):
        payload = task.get("payload") or {}
        lead_id = payload.get("lead_id")
        if not lead_id:
            return
        coll = MongoDB.get_collection("leads")
        try:
            oid = ObjectId(lead_id)
        except Exception:
            return
        await coll.update_one(
            {"_id": oid},
            {"$set": {"enriched_data": {"enriched": True, "timestamp": datetime.utcnow().isoformat()}, "updated_at": datetime.utcnow()}},
        )

    async def check_campaign_schedules(self):
        try:
            now = datetime.utcnow()
            coll = MongoDB.get_collection("campaigns")
            cursor = coll.find({"status": "active", "next_run_at": {"$lte": now}})
            campaigns = await cursor.to_list(length=50)
            for campaign in campaigns:
                await self.process_campaign(campaign)
        except Exception as e:
            print(f"Error checking campaign schedules: {e}")

    async def process_campaign(self, campaign: dict):
        coll = MongoDB.get_collection("campaigns")
        campaign_id = campaign.get("_id")
        seq_coll = MongoDB.get_collection("sequences")
        sequences = await seq_coll.find({"campaign_id": str(campaign_id)}).sort("step_number", 1).to_list(length=10)
        next_run = datetime.utcnow()
        if sequences:
            seq = sequences[0]
            delay_total = (seq.get("delay_days") or 0) * 86400 + (seq.get("delay_hours") or 0) * 3600
            next_run = datetime.utcnow() + timedelta(seconds=delay_total)
        await coll.update_one(
            {"_id": campaign_id},
            {"$set": {"last_run_at": datetime.utcnow(), "next_run_at": next_run, "updated_at": datetime.utcnow()}},
        )

    async def check_email_statuses(self):
        pass


polling_service = PollingService()
