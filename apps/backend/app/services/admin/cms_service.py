"""
Outflo - CMS Service (MongoDB)
Content management for landing page, pricing, FAQs, etc.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any

from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc


def _oid(value) -> ObjectId:
    return value if isinstance(value, ObjectId) else ObjectId(str(value))


class CMSService:
    async def get_landing_page_content(self) -> dict:
        coll = MongoDB.get_collection("cms_landing_sections")
        cursor = coll.find({"page": "landing"}).sort("sort_order", 1)
        sections = await cursor.to_list(length=100)
        return {
            "sections": [
                {
                    "key": s.get("section_key"),
                    "name": s.get("section_name"),
                    "title": s.get("title"),
                    "subtitle": s.get("subtitle"),
                    "description": s.get("description"),
                    "content": s.get("content"),
                    "media": s.get("media"),
                    "is_visible": s.get("is_visible", True),
                    "sort_order": s.get("sort_order", 0),
                }
                for s in sections
            ]
        }

    async def update_landing_section(self, section_key: str, data: dict) -> bool:
        coll = MongoDB.get_collection("cms_landing_sections")
        existing = await coll.find_one({"page": "landing", "section_key": section_key})
        update = {
            "page": "landing",
            "section_key": section_key,
            "section_name": data.get("name", section_key),
            "updated_at": datetime.utcnow(),
        }
        for field in ("title", "subtitle", "description", "content", "media", "is_visible", "sort_order"):
            if field in data:
                update[field] = data[field]
        if existing:
            await coll.update_one({"_id": existing["_id"]}, {"$set": update})
        else:
            update["created_at"] = datetime.utcnow()
            await coll.insert_one(update)
        return True

    async def get_pricing_plans(self) -> list[dict]:
        coll = MongoDB.get_collection("plans")
        cursor = coll.find({"is_active": True}).sort("sort_order", 1)
        plans = await cursor.to_list(length=50)
        if not plans:
            cursor = coll.find().sort("monthly_price", 1)
            plans = await cursor.to_list(length=50)
        return [
            {
                "key": p.get("slug") or p.get("plan_key") or str(p.get("_id")),
                "name": p.get("name"),
                "description": p.get("description"),
                "monthly_price": p.get("monthly_price", 0),
                "yearly_price": p.get("yearly_price", 0),
                "features": p.get("features") or [],
                "limitations": p.get("limitations") or {},
                "is_highlighted": p.get("is_featured", p.get("is_highlighted", False)),
                "highlight_label": p.get("highlight_label"),
                "cta_text": p.get("cta_text"),
            }
            for p in plans
        ]

    async def update_pricing_plan(self, plan_key: str, data: dict) -> bool:
        coll = MongoDB.get_collection("plans")
        existing = await coll.find_one({"$or": [{"slug": plan_key}, {"plan_key": plan_key}]})
        update = {**data, "updated_at": datetime.utcnow()}
        if existing:
            await coll.update_one({"_id": existing["_id"]}, {"$set": update})
        else:
            update.update({
                "slug": plan_key,
                "plan_key": plan_key,
                "name": data.get("name", plan_key),
                "is_active": data.get("is_active", True),
                "created_at": datetime.utcnow(),
            })
            await coll.insert_one(update)
        return True

    async def get_faqs(self, category: str = None) -> list[dict]:
        coll = MongoDB.get_collection("cms_faqs")
        query: Dict[str, Any] = {"is_visible": True}
        if category:
            query["category"] = category
        cursor = coll.find(query).sort("sort_order", 1)
        faqs = await cursor.to_list(length=200)
        return [
            {
                "id": str(f["_id"]),
                "category": f.get("category", "general"),
                "question": f.get("question"),
                "answer": f.get("answer"),
                "sort_order": f.get("sort_order", 0),
            }
            for f in faqs
        ]

    async def create_faq(self, data: dict) -> str:
        coll = MongoDB.get_collection("cms_faqs")
        doc = {
            "category": data["category"],
            "question": data["question"],
            "answer": data["answer"],
            "is_visible": data.get("is_visible", True),
            "sort_order": data.get("sort_order", 0),
            "created_at": datetime.utcnow(),
        }
        result = await coll.insert_one(doc)
        return str(result.inserted_id)

    async def update_faq(self, faq_id: str, data: dict) -> bool:
        coll = MongoDB.get_collection("cms_faqs")
        update = {k: v for k, v in data.items() if k in ("category", "question", "answer", "is_visible", "sort_order")}
        result = await coll.update_one({"_id": _oid(faq_id)}, {"$set": update})
        return result.matched_count > 0

    async def delete_faq(self, faq_id: str) -> bool:
        coll = MongoDB.get_collection("cms_faqs")
        result = await coll.delete_one({"_id": _oid(faq_id)})
        return result.deleted_count > 0

    async def get_testimonials(self, featured: bool = False) -> list[dict]:
        coll = MongoDB.get_collection("cms_testimonials")
        query: Dict[str, Any] = {"is_visible": True}
        if featured:
            query["is_featured"] = True
        cursor = coll.find(query).sort("sort_order", 1)
        items = await cursor.to_list(length=100)
        return [
            {
                "id": str(t["_id"]),
                "author_name": t.get("author_name"),
                "author_title": t.get("author_title"),
                "author_company": t.get("author_company"),
                "author_avatar": t.get("author_avatar"),
                "quote": t.get("quote"),
                "rating": t.get("rating", 5),
                "is_featured": t.get("is_featured", False),
            }
            for t in items
        ]

    async def create_testimonial(self, data: dict) -> str:
        coll = MongoDB.get_collection("cms_testimonials")
        doc = {
            "author_name": data["author_name"],
            "author_title": data.get("author_title"),
            "author_company": data.get("author_company"),
            "author_avatar": data.get("author_avatar"),
            "quote": data["quote"],
            "rating": data.get("rating", 5),
            "is_visible": data.get("is_visible", True),
            "is_featured": data.get("is_featured", False),
            "sort_order": data.get("sort_order", 0),
            "created_at": datetime.utcnow(),
        }
        result = await coll.insert_one(doc)
        return str(result.inserted_id)

    async def get_seo_config(self, page: str) -> Optional[dict]:
        coll = MongoDB.get_collection("cms_seo")
        doc = await coll.find_one({"page": page})
        if not doc:
            return None
        cfg = doc.get("config") or doc
        return {
            "page": page,
            "title": cfg.get("title") or cfg.get("page_title", ""),
            "description": cfg.get("description") or cfg.get("meta_description", ""),
            "keywords": cfg.get("keywords", ""),
            "og_title": cfg.get("og_title", ""),
            "og_description": cfg.get("og_description", ""),
            "og_image": cfg.get("og_image", ""),
            "canonical_url": cfg.get("canonical_url", ""),
            "robots": cfg.get("robots", ""),
        }

    async def update_seo_config(self, page: str, data: dict) -> bool:
        coll = MongoDB.get_collection("cms_seo")
        await coll.update_one(
            {"page": page},
            {"$set": {"page": page, "config": data, "updated_at": datetime.utcnow()}},
            upsert=True,
        )
        return True

    async def get_navigation(self, location: str = "header") -> list[dict]:
        coll = MongoDB.get_collection("cms_navigation")
        cursor = coll.find({"location": location, "is_visible": True}).sort("sort_order", 1)
        items = await cursor.to_list(length=100)
        return [
            {
                "id": str(i["_id"]),
                "label": i.get("label"),
                "url": i.get("url"),
                "target": i.get("target"),
                "icon": i.get("icon"),
                "badge": i.get("badge"),
                "sort_order": i.get("sort_order", 0),
            }
            for i in items
        ]

    async def get_integrations(self, category: str = None) -> list[dict]:
        coll = MongoDB.get_collection("cms_integrations")
        query: Dict[str, Any] = {"is_active": True}
        if category:
            query["category"] = category
        cursor = coll.find(query).sort([("is_featured", -1), ("name", 1)])
        items = await cursor.to_list(length=100)
        return [
            {
                "key": i.get("integration_key"),
                "name": i.get("name"),
                "description": i.get("description"),
                "category": i.get("category"),
                "features": i.get("features") or [],
                "is_featured": i.get("is_featured", False),
            }
            for i in items
        ]


_cms_service: Optional[CMSService] = None


def get_cms_service() -> CMSService:
    global _cms_service
    if _cms_service is None:
        _cms_service = CMSService()
    return _cms_service
