import asyncio
from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import selectinload

from app.db import AsyncSessionLocal
from app.models import Campaign, CampaignLead, Email, Sequence, BackgroundTask
from app.services import TaskService


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

    async def check_pending_tasks(self):
        async with AsyncSessionLocal() as db:
            try:
                task_service = TaskService(db)
                tasks = await task_service.get_pending_tasks(10)
                for task in tasks:
                    await self.process_task(task, db)
                await db.commit()
            except Exception as e:
                await db.rollback()
                print(f"Error checking pending tasks: {e}")

    async def process_task(self, task: BackgroundTask, db: AsyncSession):
        try:
            task_service = TaskService(db)
            await task_service.mark_task_started(task.id)

            task_type = task.task_name
            if task_type == "send_email":
                await self._process_send_email(task, db)
            elif task_type == "personalize_content":
                await self._process_personalize_content(task, db)
            elif task_type == "enrich_lead":
                await self._process_enrich_lead(task, db)
            elif task_type == "scrape_data":
                await self._process_scrape_data(task, db)
            else:
                await task_service.mark_task_completed(task.id, {"status": "unknown_task_type"})

            await task_service.mark_task_completed(task.id, {"status": "completed"})
        except Exception as e:
            await task_service.mark_task_failed(task.id, str(e))

    async def _process_send_email(self, task: BackgroundTask, db: AsyncSession):
        payload = task.payload
        lead_id = payload.get("lead_id")
        campaign_id = payload.get("campaign_id")
        sequence_id = payload.get("sequence_id")

        result = await db.execute(
            select(CampaignLead).where(
                and_(CampaignLead.campaign_id == campaign_id, CampaignLead.lead_id == lead_id)
            )
        )
        campaign_lead = result.scalar_one_or_none()
        if not campaign_lead:
            return

        campaign_lead.status = "completed"

    async def _process_personalize_content(self, task: BackgroundTask, db: AsyncSession):
        payload = task.payload
        campaign_lead_id = payload.get("campaign_lead_id")

        result = await db.execute(
            select(CampaignLead).where(CampaignLead.id == campaign_lead_id)
        )
        campaign_lead = result.scalar_one_or_none()
        if campaign_lead:
            campaign_lead.ai_personalized_content = "Personalized content generated."

    async def _process_enrich_lead(self, task: BackgroundTask, db: AsyncSession):
        payload = task.payload
        lead_id = payload.get("lead_id")

        result = await db.execute(select(__import__("app.models", fromlist=["Lead"]).Lead).where(__import__("app.models", fromlist=["Lead"]).Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if lead:
            lead.enriched_data = {"enriched": True, "timestamp": datetime.utcnow().isoformat()}

    async def _process_scrape_data(self, task: BackgroundTask, db: AsyncSession):
        pass

    async def check_campaign_schedules(self):
        async with AsyncSessionLocal() as db:
            try:
                now = datetime.utcnow()
                result = await db.execute(
                    select(Campaign).where(
                        and_(
                            Campaign.status == "active",
                            Campaign.next_run_at <= now,
                        )
                    )
                )
                campaigns = result.scalars().all()
                for campaign in campaigns:
                    await self.process_campaign(campaign, db)
                await db.commit()
            except Exception as e:
                await db.rollback()
                print(f"Error checking campaign schedules: {e}")

    async def process_campaign(self, campaign: Campaign, db: AsyncSession):
        campaign.last_run_at = datetime.utcnow()

        result = await db.execute(
            select(Sequence).where(Sequence.campaign_id == campaign.id).order_by(Sequence.step_number)
        )
        sequences = result.scalars().all()

        for seq in sequences:
            delay_total = seq.delay_days * 86400 + seq.delay_hours * 3600
            next_run = datetime.utcnow() + timedelta(seconds=delay_total)
            campaign.next_run_at = next_run
            break

    async def check_email_statuses(self):
        pass


polling_service = PollingService()