"""
Outflo - CMS Service
Content management for landing page, pricing, FAQs, etc.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update

from app.db import AsyncSessionLocal


class CMSService:
    async def get_landing_page_content(self) -> dict:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import LandingPageSection

            result = await db.execute(
                select(LandingPageSection)
                .where(LandingPageSection.page == "landing")
                .order_by(LandingPageSection.sort_order)
            )
            sections = result.scalars().all()

            return {
                "sections": [
                    {
                        "key": s.section_key,
                        "name": s.section_name,
                        "title": s.title,
                        "subtitle": s.subtitle,
                        "description": s.description,
                        "content": s.content,
                        "media": s.media,
                        "is_visible": s.is_visible,
                        "sort_order": s.sort_order,
                    }
                    for s in sections
                ]
            }

    async def update_landing_section(
        self,
        section_key: str,
        data: dict,
    ) -> bool:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import LandingPageSection

            result = await db.execute(
                select(LandingPageSection).where(
                    and_(
                        LandingPageSection.page == "landing",
                        LandingPageSection.section_key == section_key,
                    )
                )
            )
            section = result.scalar_one_or_none()

            if not section:
                section = LandingPageSection(
                    page="landing",
                    section_key=section_key,
                    section_name=data.get("name", section_key),
                )
                db.add(section)

            if "title" in data:
                section.title = data["title"]
            if "subtitle" in data:
                section.subtitle = data["subtitle"]
            if "description" in data:
                section.description = data["description"]
            if "content" in data:
                section.content = data["content"]
            if "media" in data:
                section.media = data["media"]
            if "is_visible" in data:
                section.is_visible = data["is_visible"]

            await db.commit()
            return True

    async def get_pricing_plans(self) -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import PricingPlan

            result = await db.execute(
                select(PricingPlan)
                .where(PricingPlan.is_active == True)
                .order_by(PricingPlan.sort_order)
            )
            plans = result.scalars().all()

            return [
                {
                    "key": p.plan_key,
                    "name": p.name,
                    "description": p.description,
                    "monthly_price": p.monthly_price,
                    "yearly_price": p.yearly_price,
                    "features": p.features,
                    "limitations": p.limitations,
                    "is_highlighted": p.is_highlighted,
                    "highlight_label": p.highlight_label,
                    "cta_text": p.cta_text,
                }
                for p in plans
            ]

    async def update_pricing_plan(
        self,
        plan_key: str,
        data: dict,
    ) -> bool:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import PricingPlan

            result = await db.execute(
                select(PricingPlan).where(PricingPlan.plan_key == plan_key)
            )
            plan = result.scalar_one_or_none()

            if not plan:
                plan = PricingPlan(plan_key=plan_key, name=data.get("name", plan_key))
                db.add(plan)

            for field in ["name", "description", "monthly_price", "yearly_price",
                           "features", "limitations", "is_highlighted", "highlight_label",
                           "cta_text", "is_active", "sort_order"]:
                if field in data:
                    setattr(plan, field, data[field])

            await db.commit()
            return True

    async def get_faqs(self, category: str = None) -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import FAQ

            query = select(FAQ).where(FAQ.is_visible == True)
            if category:
                query = query.where(FAQ.category == category)
            query = query.order_by(FAQ.sort_order)

            result = await db.execute(query)
            faqs = result.scalars().all()

            return [
                {
                    "id": f.id,
                    "category": f.category,
                    "question": f.question,
                    "answer": f.answer,
                    "sort_order": f.sort_order,
                }
                for f in faqs
            ]

    async def create_faq(self, data: dict) -> int:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import FAQ

            faq = FAQ(
                category=data["category"],
                question=data["question"],
                answer=data["answer"],
                is_visible=data.get("is_visible", True),
                sort_order=data.get("sort_order", 0),
            )
            db.add(faq)
            await db.commit()
            await db.refresh(faq)
            return faq.id

    async def update_faq(self, faq_id: int, data: dict) -> bool:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import FAQ

            result = await db.execute(
                select(FAQ).where(FAQ.id == faq_id)
            )
            faq = result.scalar_one_or_none()
            if not faq:
                return False

            for field in ["category", "question", "answer", "is_visible", "sort_order"]:
                if field in data:
                    setattr(faq, field, data[field])

            await db.commit()
            return True

    async def delete_faq(self, faq_id: int) -> bool:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import FAQ

            result = await db.execute(
                select(FAQ).where(FAQ.id == faq_id)
            )
            faq = result.scalar_one_or_none()
            if not faq:
                return False

            await db.delete(faq)
            await db.commit()
            return True

    async def get_testimonials(self, featured: bool = False) -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import Testimonial

            query = select(Testimonial).where(Testimonial.is_visible == True)
            if featured:
                query = query.where(Testimonial.is_featured == True)
            query = query.order_by(Testimonial.sort_order)

            result = await db.execute(query)
            testimonials = result.scalars().all()

            return [
                {
                    "id": t.id,
                    "author_name": t.author_name,
                    "author_title": t.author_title,
                    "author_company": t.author_company,
                    "author_avatar": t.author_avatar,
                    "quote": t.quote,
                    "rating": t.rating,
                    "is_featured": t.is_featured,
                }
                for t in testimonials
            ]

    async def create_testimonial(self, data: dict) -> int:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import Testimonial

            testimonial = Testimonial(
                author_name=data["author_name"],
                author_title=data.get("author_title"),
                author_company=data.get("author_company"),
                author_avatar=data.get("author_avatar"),
                quote=data["quote"],
                rating=data.get("rating", 5),
                is_visible=data.get("is_visible", True),
                is_featured=data.get("is_featured", False),
                sort_order=data.get("sort_order", 0),
            )
            db.add(testimonial)
            await db.commit()
            await db.refresh(testimonial)
            return testimonial.id

    async def get_seo_config(self, page: str) -> Optional[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import SEOConfig

            result = await db.execute(
                select(SEOConfig).where(SEOConfig.page == page)
            )
            config = result.scalar_one_or_none()

            if not config:
                return None

            return {
                "page": config.page,
                "title": config.title,
                "description": config.description,
                "keywords": config.keywords,
                "og_title": config.og_title,
                "og_description": config.og_description,
                "og_image": config.og_image,
                "canonical_url": config.canonical_url,
                "robots": config.robots,
            }

    async def update_seo_config(self, page: str, data: dict) -> bool:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import SEOConfig

            result = await db.execute(
                select(SEOConfig).where(SEOConfig.page == page)
            )
            config = result.scalar_one_or_none()

            if not config:
                config = SEOConfig(page=page)
                db.add(config)

            for field in ["title", "description", "keywords", "og_title",
                          "og_description", "og_image", "canonical_url", "robots"]:
                if field in data:
                    setattr(config, field, data[field])

            await db.commit()
            return True

    async def get_navigation(self, location: str = "header") -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import NavigationItem

            result = await db.execute(
                select(NavigationItem)
                .where(
                    and_(
                        NavigationItem.location == location,
                        NavigationItem.is_visible == True,
                    )
                )
                .order_by(NavigationItem.sort_order)
            )
            items = result.scalars().all()

            return [
                {
                    "id": i.id,
                    "label": i.label,
                    "url": i.url,
                    "target": i.target,
                    "icon": i.icon,
                    "badge": i.badge,
                    "sort_order": i.sort_order,
                }
                for i in items
            ]

    async def get_integrations(self, category: str = None) -> list[dict]:
        async with AsyncSessionLocal() as db:
            from app.models.cms_models import Integration

            query = select(Integration).where(Integration.is_active == True)
            if category:
                query = query.where(Integration.category == category)
            query = query.order_by(Integration.is_featured.desc(), Integration.name)

            result = await db.execute(query)
            integrations = result.scalars().all()

            return [
                {
                    "key": i.integration_key,
                    "name": i.name,
                    "description": i.description,
                    "category": i.category,
                    "features": i.features,
                    "is_featured": i.is_featured,
                }
                for i in integrations
            ]


_cms_service: Optional[CMSService] = None


def get_cms_service() -> CMSService:
    global _cms_service
    if _cms_service is None:
        _cms_service = CMSService()
    return _cms_service