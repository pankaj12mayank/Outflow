from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.repositories.mongo_repositories import LeadRepository
from app.models.documents import Lead as LeadDocument


class LeadService:
    def __init__(self, organization_id: str):
        self.repo = LeadRepository(organization_id)

    async def create_lead(self, lead_in: dict) -> dict:
        lead_data = {
            "email": lead_in.get("email"),
            "first_name": lead_in.get("first_name"),
            "last_name": lead_in.get("last_name"),
            "company": lead_in.get("company_name"),
            "company_domain": lead_in.get("company_domain"),
            "company_size": lead_in.get("company_size"),
            "job_title": lead_in.get("job_title"),
            "linkedin_url": lead_in.get("linkedin_url"),
            "phone": lead_in.get("phone"),
            "location": lead_in.get("city"),
            "country": lead_in.get("country"),
            "industry": lead_in.get("industry"),
            "source": lead_in.get("source"),
            "status": "new",
        }
        return await self.repo.create(lead_data)

    async def get_lead(self, lead_id: str) -> Optional[dict]:
        return await self.repo.get_by_id(lead_id)

    async def get_leads(self, skip: int = 0, limit: int = 100) -> List[dict]:
        return await self.repo.get_all(skip=skip, limit=limit, order_by="created_at", order_desc=True)

    async def update_lead(self, lead_id: str, lead_in: dict) -> Optional[dict]:
        update_data = {k: v for k, v in lead_in.items() if v is not None}
        return await self.repo.update(lead_id, update_data)

    async def delete_lead(self, lead_id: str) -> bool:
        return await self.repo.delete(lead_id)

    async def bulk_create_leads(self, leads_in: List[dict], duplicate_handling: str = "skip") -> List[dict]:
        if duplicate_handling == "skip":
            return await self.repo.bulk_create_from_list(leads_in)
        else:
            return await self.repo.bulk_create(leads_in)

    async def enrich_lead(self, lead_id: str, fields: List[str]) -> Optional[dict]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            return None

        enriched = lead.get("enriched_data", {})

        if "company_info" in fields and lead.get("company_domain"):
            enriched["company"] = await self._enrich_company_info(lead.get("company_domain"))

        if "job_title" in fields and not lead.get("job_title"):
            enriched["job_title"] = lead.get("job_title", "Unknown")

        return await self.repo.update(lead_id, {"enriched_data": enriched})

    async def _enrich_company_info(self, domain: str) -> dict:
        return {"domain": domain, "enriched": True}

    async def search_leads(self, query: str, skip: int = 0, limit: int = 100) -> List[dict]:
        return await self.repo.search_leads(query, skip, limit)

    async def count_leads(self) -> int:
        return await self.repo.count()

    async def get_stats(self) -> dict:
        coll = self.repo._collection
        org_filter = {"organization_id": self.repo.organization_id, "deleted_at": None}
        total = await coll.count_documents(org_filter)
        pipeline = [
            {"$match": org_filter},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        by_status: dict = {}
        async for doc in coll.aggregate(pipeline):
            by_status[doc["_id"] or "unknown"] = doc["count"]
        verified = await coll.count_documents({**org_filter, "email_verified": True})
        enriched = await coll.count_documents({**org_filter, "enriched_data": {"$exists": True, "$ne": {}}})
        return {
            "total": total,
            "by_status": by_status,
            "verified": verified,
            "enriched": enriched,
            "new": by_status.get("new", 0),
        }

    async def verify_lead_email(self, lead_id: str) -> Optional[dict]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            return None
        return await self.repo.update(
            lead_id,
            {"email_verified": True, "email_verified_at": datetime.utcnow()},
        )

    async def bulk_delete_leads(self, ids: List[str]) -> dict:
        deleted = 0
        for lid in ids:
            if await self.repo.delete(lid):
                deleted += 1
        return {"deleted": deleted, "requested": len(ids)}

    async def deduplicate_leads(self, ids: Optional[List[str]] = None) -> dict:
        """Keep oldest lead per email; soft-delete newer duplicates."""
        coll = self.repo._collection
        match = {"organization_id": self.repo.organization_id, "deleted_at": None}
        if ids:
            oids = []
            for lid in ids:
                try:
                    oids.append(ObjectId(lid))
                except Exception:
                    continue
            if oids:
                match["_id"] = {"$in": oids}

        cursor = coll.find(match, {"email": 1, "created_at": 1}).sort("created_at", 1)
        seen: dict[str, ObjectId] = {}
        removed = 0
        async for doc in cursor:
            email = (doc.get("email") or "").strip().lower()
            if not email:
                continue
            if email in seen:
                await coll.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"deleted_at": datetime.utcnow(), "duplicate_of": str(seen[email])}},
                )
                removed += 1
            else:
                seen[email] = doc["_id"]
        return {"removed": removed, "unique_emails": len(seen)}