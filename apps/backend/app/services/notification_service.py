import asyncio
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId
import re

from app.db.mongodb import MongoDB, serialize_doc
from app.models.notification_models import (
    NotificationType, NotificationPriority, NotificationStatus,
    NotificationChannel, EmailStatus
)
from app.services.smtp_service import SmtpService, EmailSendingService


class NotificationService:
    @staticmethod
    async def create_notification(notif_data: Dict) -> Dict:
        notif_doc = {
            "user_id": notif_data.get("user_id"),
            "organization_id": notif_data.get("organization_id"),
            "type": notif_data.get("type"),
            "title": notif_data.get("title"),
            "message": notif_data.get("message"),
            "priority": notif_data.get("priority", NotificationPriority.NORMAL),
            "is_read": False,
            "channels": notif_data.get("channels", [NotificationChannel.IN_APP]),
            "action_url": notif_data.get("action_url"),
            "action_label": notif_data.get("action_label"),
            "metadata": notif_data.get("metadata", {}),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("notifications").insert_one(notif_doc)
        notif_doc["_id"] = str(result.inserted_id)
        
        if NotificationChannel.EMAIL in notif_data.get("channels", []):
            await NotificationService.send_email_notification(notif_doc)
        
        return notif_doc

    @staticmethod
    async def create_bulk_notifications(notif_data: Dict) -> List[Dict]:
        created_notifications = []
        
        for user_id in notif_data.get("user_ids", []):
            notif_doc = {
                "user_id": user_id,
                "organization_id": notif_data.get("organization_id"),
                "type": notif_data.get("type"),
                "title": notif_data.get("title"),
                "message": notif_data.get("message"),
                "priority": notif_data.get("priority", NotificationPriority.NORMAL),
                "is_read": False,
                "channels": notif_data.get("channels", [NotificationChannel.IN_APP]),
                "metadata": notif_data.get("metadata", {}),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await MongoDB.get_collection("notifications").insert_one(notif_doc)
            notif_doc["_id"] = str(result.inserted_id)
            created_notifications.append(notif_doc)
        
        return created_notifications

    @staticmethod
    async def get_notifications(
        user_id: str = None,
        organization_id: str = None,
        is_read: bool = None,
        notification_type: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        if organization_id:
            query["organization_id"] = organization_id
        if is_read is not None:
            query["is_read"] = is_read
        if notification_type:
            query["type"] = notification_type
        
        notifications = await MongoDB.get_collection("notifications").find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(n) for n in notifications]

    @staticmethod
    async def get_unread_count(user_id: str = None, organization_id: str = None) -> int:
        query = {"is_read": False}
        
        if user_id:
            query["user_id"] = user_id
        if organization_id:
            query["organization_id"] = organization_id
        
        return await MongoDB.get_collection("notifications").count_documents(query)

    @staticmethod
    async def mark_as_read(notification_id: str) -> Optional[Dict]:
        result = await MongoDB.get_collection("notifications").update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"is_read": True, "read_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            notification = await MongoDB.get_collection("notifications").find_one({"_id": ObjectId(notification_id)})
            return serialize_doc(notification)
        return None

    @staticmethod
    async def mark_all_as_read(user_id: str = None, organization_id: str = None) -> int:
        query = {"is_read": False}
        
        if user_id:
            query["user_id"] = user_id
        if organization_id:
            query["organization_id"] = organization_id
        
        result = await MongoDB.get_collection("notifications").update_many(
            query,
            {"$set": {"is_read": True, "read_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        
        return result.modified_count

    @staticmethod
    async def delete_notification(notification_id: str) -> bool:
        result = await MongoDB.get_collection("notifications").delete_one({"_id": ObjectId(notification_id)})
        return result.deleted_count > 0

    @staticmethod
    async def archive_notification(notification_id: str) -> Optional[Dict]:
        result = await MongoDB.get_collection("notifications").update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"status": NotificationStatus.ARCHIVED, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            notification = await MongoDB.get_collection("notifications").find_one({"_id": ObjectId(notification_id)})
            return serialize_doc(notification)
        return None

    @staticmethod
    async def create_notification_log(
        notification_id: str,
        channel: NotificationChannel,
        status: NotificationStatus,
        recipient: str = None,
        error: str = None,
    ) -> Dict:
        log_doc = {
            "notification_id": notification_id,
            "channel": channel,
            "status": status,
            "recipient": recipient,
            "error_message": error,
            "retry_count": 0,
            "sent_at": datetime.utcnow() if status == NotificationStatus.SENT else None,
            "created_at": datetime.utcnow(),
        }
        result = await MongoDB.get_collection("notification_logs").insert_one(log_doc)
        log_doc["_id"] = str(result.inserted_id)
        return log_doc


class EmailNotificationService:
    @staticmethod
    async def send_email_notification(notification: Dict) -> Dict:
        if not notification.get("user_id"):
            return {"success": False, "error": "No user_id for email notification"}

        from app.models.user import User
        user = await MongoDB.get_collection("users").find_one({"_id": ObjectId(notification["user_id"])})
        
        if not user or not user.get("email"):
            return {"success": False, "error": "User email not found"}

        smtp_config = await SmtpService.get_default_config()
        
        if not smtp_config:
            await NotificationService.create_notification_log(
                notification["_id"], NotificationChannel.EMAIL, NotificationStatus.FAILED,
                user["email"], "No SMTP config available"
            )
            return {"success": False, "error": "No SMTP config"}

        template = await EmailTemplateService.get_template_by_type(notification["type"])
        
        subject = notification["title"]
        body_html = notification["message"]
        
        if template:
            subject = await EmailTemplateService.render_template(template["subject"], notification.get("metadata", {}))
            body_html = await EmailTemplateService.render_template(
                template.get("body_html", notification["message"]),
                {**notification.get("metadata", {}), "message": notification["message"]}
            )

        result = await EmailSendingService.send_email(
            smtp_config_id=smtp_config["_id"],
            organization_id=notification.get("organization_id", "system"),
            recipient=user["email"],
            subject=subject,
            body=notification["message"],
            html=body_html
        )

        if result.get("success"):
            await NotificationService.create_notification_log(
                notification["_id"], NotificationChannel.EMAIL, NotificationStatus.SENT,
                user["email"]
            )
            return {"success": True}
        else:
            await NotificationService.create_notification_log(
                notification["_id"], NotificationChannel.EMAIL, NotificationStatus.FAILED,
                user["email"], result.get("error")
            )
            return {"success": False, "error": result.get("error")}

    @staticmethod
    async def send_email(send_data: Dict) -> Dict:
        recipient = send_data.get("recipient_email")
        subject = send_data.get("subject")
        body_text = send_data.get("body_text")
        body_html = send_data.get("body_html")
        
        smtp_config_id = send_data.get("smtp_config_id")
        
        if not smtp_config_id:
            smtp_config = await SmtpService.get_default_config()
            if smtp_config:
                smtp_config_id = smtp_config["_id"]
        
        if not smtp_config_id:
            await EmailLogService.create_log({
                "recipient_email": recipient,
                "subject": subject,
                "status": EmailStatus.FAILED,
                "error_message": "No SMTP config available"
            })
            return {"success": False, "error": "No SMTP config"}
        
        result = await EmailSendingService.send_email(
            smtp_config_id=smtp_config_id,
            organization_id=send_data.get("organization_id", "system"),
            recipient=recipient,
            subject=subject,
            body=body_text or subject,
            html=body_html
        )

        email_log = {
            "template_id": send_data.get("template_id"),
            "recipient_email": recipient,
            "recipient_name": send_data.get("recipient_name"),
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "smtp_config_id": smtp_config_id,
            "status": EmailStatus.SENT if result.get("success") else EmailStatus.FAILED,
            "error_message": result.get("error") if not result.get("success") else None,
            "sent_at": datetime.utcnow() if result.get("success") else None
        }
        
        log_result = await EmailLogService.create_log(email_log)
        
        if result.get("success"):
            return {"success": True, "log_id": str(log_result["_id"])}
        return {"success": False, "error": result.get("error")}


class EmailLogService:
    @staticmethod
    async def create_log(log_data: Dict) -> Dict:
        log_doc = {
            "template_id": log_data.get("template_id"),
            "notification_id": log_data.get("notification_id"),
            "recipient_email": log_data.get("recipient_email"),
            "recipient_name": log_data.get("recipient_name"),
            "subject": log_data.get("subject"),
            "body_text": log_data.get("body_text"),
            "body_html": log_data.get("body_html"),
            "status": log_data.get("status", EmailStatus.PENDING),
            "smtp_config_id": log_data.get("smtp_config_id"),
            "error_message": log_data.get("error_message"),
            "retry_count": log_data.get("retry_count", 0),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("email_logs").insert_one(log_doc)
        log_doc["_id"] = str(result.inserted_id)
        return log_doc

    @staticmethod
    async def get_logs(
        status: str = None,
        recipient_email: str = None,
        template_id: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        
        query = {}
        
        if status:
            query["status"] = status
        if recipient_email:
            query["recipient_email"] = {"$regex": recipient_email, "$options": "i"}
        if template_id:
            query["template_id"] = template_id
        
        logs = await MongoDB.get_collection("email_logs").find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(l) for l in logs]

    @staticmethod
    async def retry_failed_email(log_id: str) -> Dict:
        log_entry = await MongoDB.get_collection("email_logs").find_one({"_id": ObjectId(log_id)})
        
        if not log_entry:
            return {"success": False, "error": "Log not found"}
        
        if log_entry.get("retry_count", 0) >= 3:
            return {"success": False, "error": "Max retries exceeded"}

        result = await EmailNotificationService.send_email({
            "recipient_email": log_entry["recipient_email"],
            "recipient_name": log_entry.get("recipient_name"),
            "subject": log_entry["subject"],
            "body_text": log_entry.get("body_text"),
            "body_html": log_entry.get("body_html"),
            "template_id": log_entry.get("template_id"),
            "smtp_config_id": log_entry.get("smtp_config_id")
        })

        await MongoDB.get_collection("email_logs").update_one(
            {"_id": ObjectId(log_id)},
            {"$inc": {"retry_count": 1}, "$set": {"updated_at": datetime.utcnow()}}
        )

        return result


class EmailTemplateService:
    @staticmethod
    async def get_all_templates() -> List[Dict]:
        templates = await MongoDB.get_collection("email_templates").find({"is_active": True}).sort("created_at", -1).to_list(length=50)
        return [serialize_doc(t) for t in templates]

    @staticmethod
    async def get_template(template_id: str) -> Optional[Dict]:
        try:
            template = await MongoDB.get_collection("email_templates").find_one({"_id": ObjectId(template_id)})
            return serialize_doc(template) if template else None
        except:
            return None

    @staticmethod
    async def get_template_by_type(notification_type: str) -> Optional[Dict]:
        template = await MongoDB.get_collection("email_templates").find_one({
            "type": notification_type,
            "is_active": True
        })
        return serialize_doc(template) if template else None

    @staticmethod
    async def create_template(template_data: Dict) -> Dict:
        if template_data.get("is_default"):
            await MongoDB.get_collection("email_templates").update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )

        template_doc = {
            "name": template_data.get("name"),
            "subject": template_data.get("subject"),
            "type": template_data.get("type"),
            "is_active": template_data.get("is_active", True),
            "is_default": template_data.get("is_default", False),
            "body_text": template_data.get("body_text"),
            "body_html": template_data.get("body_html"),
            "variables": template_data.get("variables", []),
            "from_name": template_data.get("from_name"),
            "from_email": template_data.get("from_email"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await MongoDB.get_collection("email_templates").insert_one(template_doc)
        template_doc["_id"] = str(result.inserted_id)
        return template_doc

    @staticmethod
    async def update_template(template_id: str, template_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in template_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        if update_data.get("is_default"):
            await MongoDB.get_collection("email_templates").update_many(
                {"_id": {"$ne": ObjectId(template_id)}, "is_default": True},
                {"$set": {"is_default": False}}
            )

        result = await MongoDB.get_collection("email_templates").update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await EmailTemplateService.get_template(template_id)
        return None

    @staticmethod
    async def delete_template(template_id: str) -> bool:
        result = await MongoDB.get_collection("email_templates").delete_one({"_id": ObjectId(template_id)})
        return result.deleted_count > 0

    @staticmethod
    async def render_template(template_str: str, variables: Dict) -> str:
        result = template_str
        for key, value in variables.items():
            pattern = re.compile(r'\{\{\s*' + key + r'\s*\}\}')
            result = pattern.sub(str(value), result)
        return result


class NotificationPreferencesService:
    @staticmethod
    async def get_preferences(user_id: str) -> Dict:
        prefs = await MongoDB.get_collection("notification_preferences").find_one({"user_id": user_id})
        
        if not prefs:
            default_prefs = {
                "user_id": user_id,
                "email_enabled": True,
                "in_app_enabled": True,
                "billing_alerts": True,
                "smtp_failures": True,
                "subscription_expiry": True,
                "ai_usage_alerts": True,
                "scraping_failures": True,
                "created_at": datetime.utcnow()
            }
            result = await MongoDB.get_collection("notification_preferences").insert_one(default_prefs)
            default_prefs["_id"] = str(result.inserted_id)
            return default_prefs
        
        return serialize_doc(prefs)

    @staticmethod
    async def update_preferences(user_id: str, prefs_data: Dict) -> Dict:
        update_data = {k: v for k, v in prefs_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        result = await MongoDB.get_collection("notification_preferences").update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )

        return await NotificationPreferencesService.get_preferences(user_id)


class NotificationAlertService:
    @staticmethod
    async def check_and_send_alerts():
        await NotificationAlertService.check_subscription_expiry()
        await NotificationAlertService.check_failed_payments()

    @staticmethod
    async def check_subscription_expiry():
        from app.services.billing_service import SubscriptionService
        
        subscriptions = await SubscriptionService.get_all_subscriptions(status="active")
        
        for sub in subscriptions:
            days_until_expiry = (sub["current_period_end"] - datetime.utcnow()).days
            
            if days_until_expiry <= 7 and days_until_expiry > 0:
                existing = await MongoDB.get_collection("notifications").find_one({
                    "organization_id": sub["organization_id"],
                    "type": NotificationType.SUBSCRIPTION_EXPIRY,
                    "created_at": {"$gte": datetime.utcnow() - timedelta(days=1)}
                })
                
                if not existing:
                    await NotificationService.create_notification({
                        "organization_id": sub["organization_id"],
                        "type": NotificationType.SUBSCRIPTION_EXPIRY,
                        "title": "Subscription Expiring Soon",
                        "message": f"Your subscription will expire in {days_until_expiry} days. Please renew to avoid interruption.",
                        "priority": NotificationPriority.HIGH,
                        "metadata": {
                            "subscription_id": sub["_id"],
                            "plan_name": sub["plan_name"],
                            "days_until_expiry": days_until_expiry
                        }
                    })

    @staticmethod
    async def check_failed_payments():
        from app.services.billing_service import PaymentService
        
        failed_payments = await PaymentService.get_failed_payments(hours=24)
        
        for payment in failed_payments:
            existing = await MongoDB.get_collection("notifications").find_one({
                "organization_id": payment["organization_id"],
                "type": NotificationType.BILLING_ALERT,
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=1)}
            })
            
            if not existing:
                await NotificationService.create_notification({
                    "organization_id": payment["organization_id"],
                    "type": NotificationType.BILLING_ALERT,
                    "title": "Payment Failed",
                    "message": f"A payment of ${payment['amount']} has failed. Please update your payment method.",
                    "priority": NotificationPriority.URGENT,
                    "channels": [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                    "metadata": {
                        "payment_id": payment["_id"],
                        "amount": payment["amount"]
                    }
                })