"""
Email Trigger Service
Event-driven trigger system for automated emails
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.email_engine.services.template import TemplateService
from app.email_engine.services.queue import EmailQueueService

logger = logging.getLogger(__name__)


class TriggerService:
    COLLECTION = "email_triggers"
    EVENTS_COLLECTION = "email_events"
    
    TRIGGER_MAP = {
        # Auth Events
        "welcome": {"template": "Welcome Email", "delay": 0},
        "email_verification": {"template": "Email Verification", "delay": 0},
        "password_reset": {"template": "Password Reset", "delay": 0},
        "password_changed": {"template": "Password Changed", "delay": 0},
        "suspicious_login": {"template": "Suspicious Login Alert", "delay": 0},
        "magic_login": {"template": "Magic Login Link", "delay": 0},
        "account_locked": {"template": "Account Locked", "delay": 0},
        "team_invitation": {"template": "Team Invitation", "delay": 0},
        
        # Billing Events
        "payment_success": {"template": "Payment Success", "delay": 0},
        "payment_failed": {"template": "Payment Failed", "delay": 0},
        "invoice_generated": {"template": "Invoice Generated", "delay": 0},
        "plan_upgraded": {"template": "Plan Upgraded", "delay": 0},
        "plan_downgraded": {"template": "Plan Downgraded", "delay": 0},
        "trial_started": {"template": "Trial Started", "delay": 0},
        "trial_ending": {"template": "Trial Ending", "delay": 86400},
        "subscription_cancelled": {"template": "Subscription Cancelled", "delay": 0},
        "usage_limit_reached": {"template": "Usage Limit Reached", "delay": 0},
        
        # Meeting Events
        "meeting_scheduled": {"template": "Meeting Scheduled", "delay": 0},
        "meeting_reminder": {"template": "Meeting Reminder", "delay": 3600},
        "meeting_cancelled": {"template": "Meeting Cancelled", "delay": 0},
        "meeting_rescheduled": {"template": "Meeting Rescheduled", "delay": 0},
        "post_meeting_followup": {"template": "Post Meeting Follow-up", "delay": 7200},
        
        # Outreach Events (handled by campaign sequences)
        "cold_outreach": {"template": "Cold Outreach", "delay": 0},
        "follow_up_1": {"template": "Follow-up 1", "delay": 172800},
        "follow_up_2": {"template": "Follow-up 2", "delay": 345600},
        "final_bump": {"template": "Final Bump", "delay": 518400},
    }

    @staticmethod
    async def create_trigger(trigger_data: Dict) -> Dict:
        trigger_data["created_at"] = datetime.utcnow()
        trigger_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection(TriggerService.COLLECTION).insert_one(trigger_data)
        trigger_data["id"] = str(result.inserted_id)
        return trigger_data

    @staticmethod
    async def get_trigger(trigger_id: str) -> Optional[Dict]:
        try:
            trigger = await MongoDB.get_collection(TriggerService.COLLECTION).find_one(
                {"_id": ObjectId(trigger_id)}
            )
            return serialize_doc(trigger) if trigger else None
        except:
            return None

    @staticmethod
    async def get_trigger_by_event(event_type: str, organization_id: str) -> Optional[Dict]:
        trigger = await MongoDB.get_collection(TriggerService.COLLECTION).find_one({
            "event_type": event_type,
            "organization_id": organization_id,
            "status": "active"
        })
        return serialize_doc(trigger) if trigger else None

    @staticmethod
    async def list_triggers(
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        query = {}
        
        if organization_id:
            query["organization_id"] = organization_id
        if status:
            query["status"] = status
        if event_type:
            query["event_type"] = event_type
            
        triggers = await MongoDB.get_collection(TriggerService.COLLECTION)\
            .find(query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
            
        return [serialize_doc(t) for t in triggers]

    @staticmethod
    async def update_trigger(trigger_id: str, update_data: Dict) -> Optional[Dict]:
        update_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection(TriggerService.COLLECTION).update_one(
            {"_id": ObjectId(trigger_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await TriggerService.get_trigger(trigger_id)
        return None

    @staticmethod
    async def delete_trigger(trigger_id: str) -> bool:
        result = await MongoDB.get_collection(TriggerService.COLLECTION).delete_one(
            {"_id": ObjectId(trigger_id)}
        )
        return result.deleted_count > 0

    @staticmethod
    async def trigger_event(
        event_type: str,
        organization_id: str,
        user_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
        scheduled_delay: Optional[int] = None
    ) -> Optional[str]:
        try:
            email_event = {
                "event_type": event_type,
                "organization_id": organization_id,
                "user_id": user_id,
                "lead_id": lead_id,
                "campaign_id": campaign_id,
                "data": variables or {},
                "processed": False,
                "created_at": datetime.utcnow()
            }
            
            event_result = await MongoDB.get_collection(TriggerService.EVENTS_COLLECTION).insert_one(email_event)
            event_id = str(event_result.inserted_id)
            
            trigger = await TriggerService.get_trigger_by_event(event_type, organization_id)
            
            if not trigger:
                logger.warning(f"No active trigger found for event: {event_type}")
                await TriggerService._mark_event_processed(event_id)
                return None
            
            template = await TemplateService.get_template(trigger.get("template_id"))
            if not template:
                logger.error(f"Template not found for trigger: {trigger.get('template_id')}")
                await TriggerService._mark_event_processed(event_id)
                return None
            
            delay = scheduled_delay if scheduled_delay is not None else trigger.get("delay_seconds", 0)
            delay = delay or trigger.get("delay", 0)
            
            queue_item = {
                "template_id": template["_id"],
                "trigger_id": trigger["_id"],
                "to_email": variables.get("to_email", ""),
                "to_name": variables.get("to_name"),
                "from_email": variables.get("from_email", "noreply@outflo.com"),
                "from_name": variables.get("from_name", "Outflo"),
                "subject": template.get("subject", ""),
                "html_content": template.get("html_content", ""),
                "text_content": template.get("text_content"),
                "variables": variables or {},
                "organization_id": organization_id,
                "status": "pending",
                "priority": trigger.get("priority", 5),
                "retry_count": 0,
                "max_retries": trigger.get("retry_limit", 3),
                "created_at": datetime.utcnow()
            }
            
            if delay > 0:
                queue_item["scheduled_at"] = datetime.utcnow()
                queue_item["status"] = "scheduled"
            
            queue_result = await MongoDB.get_collection("email_queue").insert_one(queue_item)
            queue_id = str(queue_result.inserted_id)
            
            await TriggerService._mark_event_processed(event_id)
            
            if delay == 0:
                await EmailQueueService.process_queue_item(queue_id)
            
            logger.info(f"Event {event_type} triggered for org {organization_id}, queue_id: {queue_id}")
            return queue_id
            
        except Exception as e:
            logger.error(f"Error triggering event {event_type}: {str(e)}")
            return None

    @staticmethod
    async def _mark_event_processed(event_id: str):
        try:
            await MongoDB.get_collection(TriggerService.EVENTS_COLLECTION).update_one(
                {"_id": ObjectId(event_id)},
                {"$set": {"processed": True, "processed_at": datetime.utcnow()}}
            )
        except:
            pass

    @staticmethod
    async def process_pending_events():
        events = await MongoDB.get_collection(TriggerService.EVENTS_COLLECTION).find({
            "processed": False
        }).limit(100).to_list(length=100)
        
        for event in events:
            try:
                await TriggerService.trigger_event(
                    event_type=event.get("event_type"),
                    organization_id=event.get("organization_id"),
                    user_id=event.get("user_id"),
                    lead_id=event.get("lead_id"),
                    campaign_id=event.get("campaign_id"),
                    variables=event.get("data")
                )
            except Exception as e:
                logger.error(f"Error processing event {event.get('_id')}: {str(e)}")

    @staticmethod
    async def create_default_triggers(organization_id: str):
        default_triggers = [
            {"name": "Welcome", "event_type": "welcome", "delay_seconds": 0, "retry_enabled": True, "retry_limit": 3},
            {"name": "Payment Success", "event_type": "payment_success", "delay_seconds": 0, "retry_enabled": True, "retry_limit": 3},
            {"name": "Payment Failed", "event_type": "payment_failed", "delay_seconds": 0, "retry_enabled": True, "retry_limit": 3},
            {"name": "Trial Ending", "event_type": "trial_ending", "delay_seconds": 86400, "retry_enabled": True, "retry_limit": 3},
            {"name": "Meeting Scheduled", "event_type": "meeting_scheduled", "delay_seconds": 0, "retry_enabled": True, "retry_limit": 3},
            {"name": "Meeting Reminder", "event_type": "meeting_reminder", "delay_seconds": 3600, "retry_enabled": True, "retry_limit": 2},
        ]
        
        templates = await TemplateService.list_templates(organization_id=None, status="active")
        template_map = {t.get("name").lower().replace(" ", "_"): t.get("_id") for t in templates}
        
        for trigger_def in default_triggers:
            template_key = trigger_def["event_type"]
            if template_key in template_map:
                trigger_data = {
                    "name": trigger_def["name"],
                    "event_type": trigger_def["event_type"],
                    "template_id": template_map[template_key],
                    "status": "active",
                    "delay_seconds": trigger_def["delay_seconds"],
                    "retry_enabled": trigger_def["retry_enabled"],
                    "retry_limit": trigger_def["retry_limit"],
                    "organization_id": organization_id,
                    "priority": 5,
                    "plan_access": ["starter", "growth", "agency"]
                }
                
                existing = await MongoDB.get_collection(TriggerService.COLLECTION).find_one({
                    "event_type": trigger_def["event_type"],
                    "organization_id": organization_id
                })
                
                if not existing:
                    await TriggerService.create_trigger(trigger_data)
                    logger.info(f"Created default trigger: {trigger_def['name']}")