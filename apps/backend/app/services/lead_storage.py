"""
Outflo - Lead Storage Service
Lead deduplication, organization isolation, tagging, enrichment status
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any, Set
from datetime import datetime
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.models import Lead, LeadEnrichment, LeadTag, Organization
from app.services.scraping.base import ScrapeResult, ScrapeSource


@dataclass
class DeduplicationResult:
    """Result of deduplication check"""
    is_duplicate: bool
    existing_lead_id: Optional[int] = None
    match_type: Optional[str] = None  # email, phone, website, company+name


class LeadStorageService:
    """
    Lead Storage Service
    
    Features:
    - Deduplication
    - Organization isolation
    - Tagging
    - Enrichment status tracking
    - Bulk operations
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def check_duplicate(self, lead_data: Dict[str, Any]) -> DeduplicationResult:
        """
        Check if lead is duplicate
        
        Match priority:
        1. Email (exact match)
        2. Phone (exact match, cleaned)
        3. Website URL
        4. Company name + address
        """
        # Check email
        email = lead_data.get("email")
        if email:
            existing = await self.db.query(Lead).filter(
                and_(
                    Lead.organization_id == lead_data.get("organization_id", 0),
                    Lead.email == email.lower().strip()
                )
            ).first()
            if existing:
                return DeduplicationResult(
                    is_duplicate=True,
                    existing_lead_id=existing.id,
                    match_type="email"
                )
        
        # Check phone
        phone = self._clean_phone(lead_data.get("phone"))
        if phone:
            existing = await self.db.query(Lead).filter(
                and_(
                    Lead.organization_id == lead_data.get("organization_id", 0),
                    Lead.phone == phone
                )
            ).first()
            if existing:
                return DeduplicationResult(
                    is_duplicate=True,
                    existing_lead_id=existing.id,
                    match_type="phone"
                )
        
        # Check website
        website = lead_data.get("website")
        if website:
            existing = await self.db.query(Lead).filter(
                and_(
                    Lead.organization_id == lead_data.get("organization_id", 0),
                    Lead.website == website
                )
            ).first()
            if existing:
                return DeduplicationResult(
                    is_duplicate=True,
                    existing_lead_id=existing.id,
                    match_type="website"
                )
        
        return DeduplicationResult(is_duplicate=False)
    
    async def save_from_scrape_result(
        self,
        results: List[ScrapeResult],
        organization_id: int,
        created_by: int,
        tags: Optional[List[str]] = None,
        campaign_id: Optional[int] = None,
        check_duplicates: bool = True
    ) -> Dict[str, Any]:
        """
        Save scrape results to database
        
        Args:
            results: List of ScrapeResult objects
            organization_id: Organization ID
            created_by: User ID who created
            tags: Optional tags to apply
            campaign_id: Optional campaign ID
            check_duplicates: Whether to check for duplicates
            
        Returns:
            Dict with saved count, duplicates, errors
        """
        saved = 0
        duplicates = 0
        errors = []
        
        for result in results:
            try:
                if not result.success:
                    continue
                
                # Check duplicate
                if check_duplicates:
                    lead_dict = result.to_dict()
                    lead_dict["organization_id"] = organization_id
                    dup_check = await self.check_duplicate(lead_dict)
                    
                    if dup_check.is_duplicate:
                        # Update existing lead with new data
                        await self._update_lead(
                            dup_check.existing_lead_id,
                            result,
                            tags
                        )
                        duplicates += 1
                        continue
                
                # Create new lead
                lead_id = await self._create_lead(result, organization_id, created_by, campaign_id)
                
                # Add tags
                if tags:
                    await self._add_tags(lead_id, tags)
                
                # Track enrichment
                await self._track_enrichment(lead_id, result)
                
                saved += 1
                
            except Exception as e:
                self.logger.error(f"Error saving lead: {e}")
                errors.append({"lead": result.business_name, "error": str(e)})
        
        return {
            "saved": saved,
            "duplicates": duplicates,
            "errors": errors,
            "total": len(results)
        }
    
    async def _create_lead(
        self,
        result: ScrapeResult,
        organization_id: int,
        created_by: int,
        campaign_id: Optional[int]
    ) -> int:
        """Create new lead from scrape result"""
        lead = Lead(
            organization_id=organization_id,
            created_by=created_by,
            campaign_id=campaign_id,
            
            # Core data
            business_name=result.business_name,
            email=result.email,
            phone=result.phone,
            website=result.website,
            
            # Location
            address=result.address,
            city=result.city,
            state=result.state,
            country=result.country,
            postal_code=result.postal_code,
            
            # Classification
            category=result.category,
            industry=result.raw_data.get("industry"),
            
            # Social
            linkedin_url=result.linkedin_url,
            facebook_url=result.facebook_url,
            twitter_url=result.twitter_url,
            instagram_url=result.instagram_url,
            
            # Enrichment data
            whatsapp=result.whatsapp,
            calendly=result.calendly,
            has_contact_form=result.has_contact_form,
            has_cta=result.has_cta,
            
            # Quality
            data_quality_score=result.data_quality_score,
            enrichment_status=result.enrichment_status,
            
            # Source tracking
            source_type=result.source.value if hasattr(result.source, 'value') else result.source,
            source_url=result.source_url,
        )
        
        self.db.add(lead)
        await self.db.flush()
        
        return lead.id
    
    async def _update_lead(
        self,
        lead_id: int,
        result: ScrapeResult,
        tags: Optional[List[str]]
    ) -> None:
        """Update existing lead with new data"""
        lead = await self.db.query(Lead).get(lead_id)
        if not lead:
            return
        
        # Update fields that are empty but available in result
        update_fields = {
            "phone": result.phone,
            "website": result.website,
            "address": result.address,
            "city": result.city,
            "state": result.state,
            "country": result.country,
            "whatsapp": result.whatsapp,
            "calendly": result.calendly,
        }
        
        for field, value in update_fields.items():
            if value and not getattr(lead, field):
                setattr(lead, field, value)
        
        # Update enrichment status if improved
        if result.data_quality_score > lead.data_quality_score:
            lead.data_quality_score = result.data_quality_score
        
        lead.enrichment_status = result.enrichment_status
        lead.updated_at = datetime.utcnow()
        
        await self.db.flush()
    
    async def _track_enrichment(self, lead_id: int, result: ScrapeResult) -> None:
        """Track enrichment for lead"""
        enrichment = LeadEnrichment(
            lead_id=lead_id,
            source_type=result.source.value if hasattr(result.source, 'value') else "unknown",
            source_url=result.source_url,
            enrichment_data=result.raw_data,
            quality_score=result.data_quality_score,
            scraped_at=result.scraped_at or datetime.utcnow()
        )
        
        self.db.add(enrichment)
        await self.db.flush()
    
    async def _add_tags(self, lead_id: int, tags: List[str]) -> None:
        """Add tags to lead"""
        for tag_name in tags:
            tag = await self._get_or_create_tag(tag_name)
            
            lead_tag = LeadTag(
                lead_id=lead_id,
                tag_id=tag.id
            )
            self.db.add(lead_tag)
        
        await self.db.flush()
    
    async def _get_or_create_tag(self, tag_name: str) -> Any:
        """Get or create tag"""
        tag = await self.db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            self.db.add(tag)
            await self.db.flush()
        return tag
    
    async def get_enrichment_needed(
        self,
        organization_id: int,
        limit: int = 100
    ) -> List[int]:
        """Get lead IDs that need enrichment"""
        leads = await self.db.query(Lead.id).filter(
            and_(
                Lead.organization_id == organization_id,
                Lead.enrichment_status.in_(["pending", "failed"]),
                Lead.email.isnot(None)
            )
        ).limit(limit).all()
        
        return [lead.id for lead in leads]
    
    async def bulk_update_enrichment_status(
        self,
        lead_ids: List[int],
        status: str,
        error_message: Optional[str] = None
    ) -> int:
        """Bulk update enrichment status"""
        result = await self.db.query(Lead).filter(
            Lead.id.in_(lead_ids)
        ).update({
            "enrichment_status": status,
            "last_enrichment_error": error_message,
            "updated_at": datetime.utcnow()
        }, synchronize_session=False)
        
        await self.db.flush()
        return result
    
    def _clean_phone(self, phone: Optional[str]) -> Optional[str]:
        """Clean phone number for comparison"""
        if not phone:
            return None
        
        # Remove all non-digits
        digits = ''.join(c for c in phone if c.isdigit())
        
        # US numbers: 10 digits
        if len(digits) == 10:
            return digits
        
        # US numbers with country code: 11 digits starting with 1
        if len(digits) == 11 and digits[0] == '1':
            return digits
        
        # Return as-is if international or unknown format
        return phone
    
    async def get_lead_stats(self, organization_id: int) -> Dict[str, Any]:
        """Get lead statistics for organization"""
        total = await self.db.query(func.count(Lead.id)).filter(
            Lead.organization_id == organization_id
        ).scalar()
        
        enriched = await self.db.query(func.count(Lead.id)).filter(
            and_(
                Lead.organization_id == organization_id,
                Lead.enrichment_status == "completed"
            )
        ).scalar()
        
        by_status = {}
        statuses = ["pending", "in_progress", "completed", "failed"]
        for status in statuses:
            count = await self.db.query(func.count(Lead.id)).filter(
                and_(
                    Lead.organization_id == organization_id,
                    Lead.enrichment_status == status
                )
            ).scalar()
            by_status[status] = count
        
        return {
            "total_leads": total,
            "enriched_leads": enriched,
            "needs_enrichment": total - enriched,
            "enrichment_by_status": by_status,
            "enrichment_rate": round(enriched / total * 100, 2) if total > 0 else 0
        }


# Import models
from app.models.models import Lead, LeadEnrichment, LeadTag, Tag