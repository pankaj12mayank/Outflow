from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.models.cms_landing import (
    PageStatus, BlockType, DEFAULT_BLOCK_TEMPLATES
)


class LandingPageService:
    @staticmethod
    async def get_all_pages(status: str = None) -> List[Dict]:
        query = {}
        if status:
            query["status"] = status
        
        pages = await MongoDB.get_collection("landing_pages").find(query).sort("updated_at", -1).to_list(length=100)
        return [serialize_doc(p) for p in pages]

    @staticmethod
    async def get_page_by_slug(slug: str, preview: bool = False) -> Optional[Dict]:
        page = await MongoDB.get_collection("landing_pages").find_one({"slug": slug})
        
        if not page:
            return None
        
        page = serialize_doc(page)
        
        if preview or page.get("status") == PageStatus.PUBLISHED.value:
            return page
        else:
            return None

    @staticmethod
    async def get_page(page_id: str) -> Optional[Dict]:
        try:
            page = await MongoDB.get_collection("landing_pages").find_one({"_id": ObjectId(page_id)})
            return serialize_doc(page) if page else None
        except:
            return None

    @staticmethod
    async def create_page(page_data: Dict, user_id: str = None) -> Dict:
        page_doc = {
            "slug": page_data.get("slug"),
            "name": page_data.get("name"),
            "description": page_data.get("description"),
            "status": PageStatus.DRAFT.value,
            "blocks": [],
            "published_blocks": [],
            "version": 1,
            "scheduled_publish": None,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "published_at": None
        }
        
        result = await MongoDB.get_collection("landing_pages").insert_one(page_doc)
        page_doc["_id"] = str(result.inserted_id)
        return page_doc

    @staticmethod
    async def update_page(page_id: str, page_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in page_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection("landing_pages").update_one(
            {"_id": ObjectId(page_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            page = await MongoDB.get_collection("landing_pages").find_one({"_id": ObjectId(page_id)})
            return serialize_doc(page)
        return None

    @staticmethod
    async def delete_page(page_id: str) -> bool:
        result = await MongoDB.get_collection("landing_pages").delete_one({"_id": ObjectId(page_id)})
        
        if result.deleted_count > 0:
            await MongoDB.get_collection("landing_blocks").delete_many({"page_id": page_id})
            await MongoDB.get_collection("landing_versions").delete_many({"page_id": page_id})
            await MongoDB.get_collection("seo_configs").delete_many({"page_id": page_id})
            return True
        return False

    @staticmethod
    async def publish_page(page_id: str, user_id: str = None) -> Optional[Dict]:
        page = await LandingPageService.get_page(page_id)
        if not page:
            return None
        
        await LandingPageService.create_version(page_id, page.get("blocks", []), user_id, "Published")
        
        result = await MongoDB.get_collection("landing_pages").update_one(
            {"_id": ObjectId(page_id)},
            {"$set": {
                "status": PageStatus.PUBLISHED.value,
                "published_blocks": page.get("blocks", []),
                "version": page.get("version", 1) + 1,
                "published_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            return await LandingPageService.get_page(page_id)
        return None

    @staticmethod
    async def unpublish_page(page_id: str) -> Optional[Dict]:
        result = await MongoDB.get_collection("landing_pages").update_one(
            {"_id": ObjectId(page_id)},
            {"$set": {
                "status": PageStatus.DRAFT.value,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            return await LandingPageService.get_page(page_id)
        return None


class LandingBlockService:
    @staticmethod
    async def get_blocks(page_id: str) -> List[Dict]:
        blocks = await MongoDB.get_collection("landing_blocks").find(
            {"page_id": page_id, "is_enabled": True}
        ).sort("order", 1).to_list(length=100)
        return [serialize_doc(b) for b in blocks]

    @staticmethod
    async def add_block(page_id: str, block_type: str, order: int) -> Dict:
        template = next((t for t in DEFAULT_BLOCK_TEMPLATES if t["type"] == block_type), None)
        
        block_doc = {
            "page_id": page_id,
            "block_type": block_type,
            "order": order,
            "data": template.get("default_data", {}) if template else {},
            "is_enabled": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("landing_blocks").insert_one(block_doc)
        block_doc["_id"] = str(result.inserted_id)
        
        await LandingPageService.update_page(page_id, {"blocks": await LandingBlockService.get_blocks(page_id)})
        
        return block_doc

    @staticmethod
    async def update_block(block_id: str, block_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in block_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection("landing_blocks").update_one(
            {"_id": ObjectId(block_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            block = await MongoDB.get_collection("landing_blocks").find_one({"_id": ObjectId(block_id)})
            block = serialize_doc(block)
            
            page = await LandingPageService.get_page(block.get("page_id"))
            if page:
                blocks = await LandingBlockService.get_blocks(block.get("page_id"))
                await LandingPageService.update_page(block.get("page_id"), {"blocks": blocks})
            
            return block
        return None

    @staticmethod
    async def delete_block(block_id: str) -> bool:
        block = await MongoDB.get_collection("landing_blocks").find_one({"_id": ObjectId(block_id)})
        
        result = await MongoDB.get_collection("landing_blocks").delete_one({"_id": ObjectId(block_id)})
        
        if result.deleted_count > 0 and block:
            blocks = await LandingBlockService.get_blocks(block.get("page_id"))
            await LandingPageService.update_page(block.get("page_id"), {"blocks": blocks})
        
        return result.deleted_count > 0

    @staticmethod
    async def reorder_blocks(page_id: str, block_orders: List[Dict]) -> bool:
        for item in block_orders:
            await MongoDB.get_collection("landing_blocks").update_one(
                {"_id": ObjectId(item.get("block_id"))},
                {"$set": {"order": item.get("order")}}
            )
        
        blocks = await LandingBlockService.get_blocks(page_id)
        await LandingPageService.update_page(page_id, {"blocks": blocks})
        
        return True


class VersionService:
    @staticmethod
    async def create_version(page_id: str, blocks: List[Dict], user_id: str = None, note: str = None) -> Dict:
        page = await LandingPageService.get_page(page_id)
        
        version_doc = {
            "page_id": page_id,
            "version": page.get("version", 1),
            "blocks": blocks,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "note": note
        }
        
        result = await MongoDB.get_collection("landing_versions").insert_one(version_doc)
        version_doc["_id"] = str(result.inserted_id)
        return version_doc

    @staticmethod
    async def get_versions(page_id: str) -> List[Dict]:
        versions = await MongoDB.get_collection("landing_versions").find(
            {"page_id": page_id}
        ).sort("created_at", -1).to_list(length=50)
        return [serialize_doc(v) for v in versions]

    @staticmethod
    async def restore_version(page_id: str, version_id: str) -> Optional[Dict]:
        version = await MongoDB.get_collection("landing_versions").find_one({"_id": ObjectId(version_id)})
        
        if not version or version.get("page_id") != page_id:
            return None
        
        await LandingPageService.create_version(page_id, version.get("blocks", []), None, f"Restored from v{version.get('version')}")
        
        return await LandingPageService.update_page(page_id, {
            "blocks": version.get("blocks", []),
            "version": (await LandingPageService.get_page(page_id)).get("version", 1) + 1
        })


class SeoService:
    @staticmethod
    async def get_seo(page_id: str) -> Optional[Dict]:
        seo = await MongoDB.get_collection("seo_configs").find_one({"page_id": page_id})
        return serialize_doc(seo) if seo else None

    @staticmethod
    async def upsert_seo(page_id: str, seo_data: Dict) -> Dict:
        existing = await MongoDB.get_collection("seo_configs").find_one({"page_id": page_id})
        
        seo_doc = {
            "page_id": page_id,
            "title": seo_data.get("title", ""),
            "description": seo_data.get("description"),
            "keywords": seo_data.get("keywords", []),
            "og_image": seo_data.get("og_image"),
            "canonical_url": seo_data.get("canonical_url"),
            "no_index": seo_data.get("no_index", False),
            "og_type": seo_data.get("og_type", "website"),
            "twitter_card": seo_data.get("twitter_card", "summary_large_image"),
            "updated_at": datetime.utcnow()
        }
        
        if existing:
            await MongoDB.get_collection("seo_configs").update_one(
                {"_id": existing["_id"]},
                {"$set": seo_doc}
            )
            seo_doc["_id"] = str(existing["_id"])
        else:
            seo_doc["created_at"] = datetime.utcnow()
            result = await MongoDB.get_collection("seo_configs").insert_one(seo_doc)
            seo_doc["_id"] = str(result.inserted_id)
        
        return seo_doc


class BlockTemplateService:
    @staticmethod
    def get_all_templates() -> List[Dict]:
        return DEFAULT_BLOCK_TEMPLATES

    @staticmethod
    def get_template(block_type: str) -> Optional[Dict]:
        return next((t for t in DEFAULT_BLOCK_TEMPLATES if t["type"] == block_type), None)


DEFAULT_LANDING_CONTENT = {
    "branding": {
        "site_name": "Outflo",
        "logo_url": "",
        "favicon_url": "",
        "tagline": "AI Outreach Automation",
    },
    "hero": {
        "badge": "AI-Powered Outreach Platform",
        "title": "Scale Your Outreach with AI That Actually Works",
        "subtitle": "Stop wasting time on manual outreach. Outflo's AI discovers, personalizes, and automates your entire outbound process so you can focus on closing deals.",
        "cta": "Start Free Trial",
        "ctaSecondary": "Watch Demo",
        "trustText": "No credit card required • 14-day free trial • Cancel anytime",
    },
    "features": [
        {"icon": "Bot", "title": "AI-Powered Personalization", "description": "Hyper-personalized emails at scale using advanced LLMs.", "active": True},
        {"icon": "Target", "title": "Smart Lead Discovery", "description": "AI agents discover and qualify leads from multiple sources.", "active": True},
        {"icon": "TrendingUp", "title": "Behavioral Prediction", "description": "Predict which prospects are most likely to convert.", "active": True},
        {"icon": "Mail", "title": "Intelligent Sequencing", "description": "Multi-channel sequences that adapt based on behavior.", "active": True},
        {"icon": "BarChart3", "title": "Real-Time Analytics", "description": "Comprehensive dashboards with actionable insights.", "active": True},
        {"icon": "Shield", "title": "Enterprise Security", "description": "SOC 2 compliant with role-based access and SSO.", "active": True},
    ],
    "stats": [
        {"value": "10M+", "label": "Emails Sent"},
        {"value": "500K+", "label": "Leads Enriched"},
        {"value": "98%", "label": "Deliverability"},
        {"value": "3x", "label": "Reply Rates"},
    ],
    "pricing": [
        {"name": "Starter", "price": "49", "features": ["5,000 emails/month", "1,000 lead enrichments", "5 campaigns", "Basic analytics"], "active": True},
        {"name": "Professional", "price": "149", "features": ["25,000 emails/month", "10,000 enrichments", "Unlimited campaigns", "AI personalization", "Priority support"], "popular": True, "active": True},
        {"name": "Enterprise", "price": "499", "features": ["Unlimited emails", "Unlimited enrichments", "Custom AI models", "Dedicated CSM", "SSO & API"], "active": True},
    ],
    "faqs": [
        {"question": "How does the AI personalization work?", "answer": "Our AI analyzes thousands of data points about each prospect to craft hyper-personalized messages.", "active": True},
        {"question": "Can I connect my existing tools?", "answer": "Yes! Outflo integrates with 50+ tools including Salesforce, HubSpot, Slack, and more.", "active": True},
        {"question": "What's included in lead enrichment?", "answer": "Every lead gets enriched with verified emails, phone numbers, company data, and social profiles.", "active": True},
        {"question": "How do you ensure email deliverability?", "answer": "We use proprietary warmup algorithms, domain monitoring, and intelligent sending limits.", "active": True},
        {"question": "Can I migrate from another platform?", "answer": "Absolutely! Our team handles full migration including campaigns, sequences, and historical data.", "active": True},
    ],
    "footer": {
        "company": "Outflo Inc.",
        "email": "hello@outflo.com",
        "copyright": f"© {datetime.now().year} Outflo. All rights reserved.",
    },
}


class LandingContentService:
    COLLECTION = "landing_content"

    @classmethod
    async def get_landing_content(cls) -> Dict:
        content = await MongoDB.get_collection(cls.COLLECTION).find_one({"type": "landing_page"})
        if not content:
            await cls.reset_to_default()
            content = await MongoDB.get_collection(cls.COLLECTION).find_one({"type": "landing_page"})
        return content.get("content", DEFAULT_LANDING_CONTENT) if content else DEFAULT_LANDING_CONTENT

    @classmethod
    async def update_section(cls, section: str, data: Dict) -> Dict:
        if section not in DEFAULT_LANDING_CONTENT:
            raise ValueError(f"Invalid section: {section}")

        await MongoDB.get_collection(cls.COLLECTION).update_one(
            {"type": "landing_page"},
            {"$set": {f"content.{section}": data}},
            upsert=True
        )
        return data

    @classmethod
    async def reset_to_default(cls) -> None:
        await MongoDB.get_collection(cls.COLLECTION).update_one(
            {"type": "landing_page"},
            {"$set": {"content": DEFAULT_LANDING_CONTENT, "updated_at": datetime.utcnow()}},
            upsert=True
        )