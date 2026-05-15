from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.repositories.mongo_repositories import CampaignRepository
from app.db.mongodb import MongoDB, serialize_doc


class CampaignService:
    def __init__(self, organization_id: str):
        self.repo = CampaignRepository(organization_id)

    async def create_campaign(self, campaign_in: dict) -> dict:
        campaign_data = {
            "name": campaign_in.get("name"),
            "description": campaign_in.get("description"),
            "email_account_id": campaign_in.get("email_account_id"),
            "settings": campaign_in.get("settings", {}),
            "status": "draft",
            "total_recipients": 0,
            "emails_sent": 0,
            "emails_delivered": 0,
            "emails_opened": 0,
            "emails_clicked": 0,
            "emails_replied": 0,
            "emails_bounced": 0,
            "emails_failed": 0,
        }
        return await self.repo.create(campaign_data)

    async def get_campaign(self, campaign_id: str) -> Optional[dict]:
        return await self.repo.get_by_id(campaign_id)

    async def get_campaigns(self, skip: int = 0, limit: int = 100) -> List[dict]:
        return await self.repo.get_all(skip=skip, limit=limit, order_by="created_at", order_desc=True)

    async def update_campaign(self, campaign_id: str, campaign_in: dict) -> Optional[dict]:
        update_data = {k: v for k, v in campaign_in.items() if v is not None}
        return await self.repo.update(campaign_id, update_data)

    async def delete_campaign(self, campaign_id: str) -> bool:
        return await self.repo.delete(campaign_id)

    async def start_campaign(self, campaign_id: str) -> Optional[dict]:
        return await self.repo.update(campaign_id, {
            "status": "running",
            "started_at": datetime.utcnow()
        })

    async def pause_campaign(self, campaign_id: str) -> Optional[dict]:
        return await self.repo.update(campaign_id, {"status": "paused"})

    async def get_campaign_stats(self, campaign_id: str) -> dict:
        campaign = await self.repo.get_by_id(campaign_id)
        if not campaign:
            return {}

        coll = MongoDB.get_collection("campaign_leads")
        try:
            doc_id = ObjectId(campaign_id)
        except:
            return {"total_leads": 0, "pending": 0, "completed": 0, "active": 0}

        total = await coll.count_documents({"campaign_id": campaign_id})
        pending = await coll.count_documents({"campaign_id": campaign_id, "status": "pending"})
        completed = await coll.count_documents({"campaign_id": campaign_id, "status": "completed"})

        return {
            "total_leads": total,
            "pending": pending,
            "completed": completed,
            "active": total - pending - completed,
        }

    async def get_campaign_detail(self, campaign_id: str) -> Optional[dict]:
        campaign = await self.repo.get_by_id(campaign_id)
        if not campaign:
            return None

        seq_coll = MongoDB.get_collection("campaign_sequences")
        seq_count = await seq_coll.count_documents({"campaign_id": campaign_id})

        lead_coll = MongoDB.get_collection("campaign_leads")
        lead_count = await lead_coll.count_documents({"campaign_id": campaign_id})

        campaign["sequence_count"] = seq_count
        campaign["lead_count"] = lead_count
        return campaign