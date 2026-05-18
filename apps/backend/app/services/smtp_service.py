import smtplib
import socket
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.models.smtp_models import (
    SmtpProvider, SmtpStatus, ProviderDefaults
)


class SmtpService:
    @staticmethod
    async def get_all_configs(include_inactive: bool = False) -> List[Dict]:
        query = {}
        if not include_inactive:
            query["is_active"] = True
        
        configs = await MongoDB.get_collection("smtp_configs").find(query).sort("created_at", -1).to_list(length=100)
        return [serialize_doc(c) for c in configs]

    @staticmethod
    async def get_config(config_id: str) -> Optional[Dict]:
        try:
            config = await MongoDB.get_collection("smtp_configs").find_one({"_id": ObjectId(config_id)})
            return serialize_doc(config) if config else None
        except:
            return None

    @staticmethod
    async def get_default_config() -> Optional[Dict]:
        config = await MongoDB.get_collection("smtp_configs").find_one({
            "is_default": True,
            "is_active": True
        })
        return serialize_doc(config) if config else None

    @staticmethod
    async def create_config(config_data: Dict) -> Dict:
        provider = config_data.get("provider")
        
        if provider in ProviderDefaults.PROVIDER_SETTINGS:
            defaults = ProviderDefaults.PROVIDER_SETTINGS[provider]
            if "host" not in config_data:
                config_data["host"] = defaults.get("host")
            if "port" not in config_data:
                config_data["port"] = defaults.get("port", 587)
            if "use_tls" not in config_data:
                config_data["use_tls"] = defaults.get("use_tls", True)

        config_doc = {
            "name": config_data.get("name"),
            "provider": config_data.get("provider"),
            "host": config_data.get("host"),
            "port": config_data.get("port", 587),
            "username": config_data.get("username"),
            "password": config_data.get("password"),
            "from_email": config_data.get("from_email"),
            "from_name": config_data.get("from_name"),
            "use_tls": config_data.get("use_tls", True),
            "use_ssl": config_data.get("use_ssl", False),
            "is_default": config_data.get("is_default", False),
            "is_active": True,
            "assigned_plans": config_data.get("assigned_plans", []),
            "daily_limit": config_data.get("daily_limit", 1000),
            "monthly_limit": config_data.get("monthly_limit", 30000),
            "daily_sent": 0,
            "monthly_sent": 0,
            "health_status": "unknown",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        if config_data.get("is_default"):
            await MongoDB.get_collection("smtp_configs").update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )

        result = await MongoDB.get_collection("smtp_configs").insert_one(config_doc)
        config_doc["_id"] = str(result.inserted_id)
        return config_doc

    @staticmethod
    async def update_config(config_id: str, config_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in config_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        if update_data.get("is_default"):
            await MongoDB.get_collection("smtp_configs").update_many(
                {"_id": {"$ne": ObjectId(config_id)}, "is_default": True},
                {"$set": {"is_default": False}}
            )

        result = await MongoDB.get_collection("smtp_configs").update_one(
            {"_id": ObjectId(config_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await SmtpService.get_config(config_id)
        return None

    @staticmethod
    async def delete_config(config_id: str) -> bool:
        result = await MongoDB.get_collection("smtp_configs").delete_one({"_id": ObjectId(config_id)})
        return result.deleted_count > 0


class SmtpTestingService:
    @staticmethod
    async def test_connection(config_id: str, test_recipient: str = "test@example.com") -> Dict:
        config = await SmtpService.get_config(config_id)
        if not config:
            return {"success": False, "message": "Config not found", "auth_valid": False, "dns_valid": False}

        start_time = time.time()
        
        try:
            if config.get("use_ssl"):
                server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=30)
            else:
                server = smtplib.SMTP(config["host"], config["port"], timeout=30)
                if config.get("use_tls"):
                    server.starttls()

            server.login(config["username"], config["password"])

            msg = MIMEMultipart()
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = test_recipient
            msg["Subject"] = "Outflo SMTP Test"
            msg.attach(MIMEText("SMTP connection test successful!", "plain"))

            server.sendmail(config["from_email"], test_recipient, msg.as_string())
            server.quit()

            latency = int((time.time() - start_time) * 1000)

            await MongoDB.get_collection("smtp_configs").update_one(
                {"_id": ObjectId(config_id)},
                {"$set": {
                    "health_status": "healthy",
                    "health_checked_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )

            return {
                "success": True,
                "message": "Connection successful! Test email sent.",
                "latency_ms": latency,
                "auth_valid": True,
                "dns_valid": True
            }

        except smtplib.SMTPAuthenticationError:
            return {"success": False, "message": "Authentication failed", "auth_valid": False, "dns_valid": True}
        except smtplib.SMTPConnectError as e:
            return {"success": False, "message": f"Connection failed: {str(e)}", "auth_valid": False, "dns_valid": False}
        except socket.timeout:
            return {"success": False, "message": "Connection timeout", "auth_valid": False, "dns_valid": False}
        except Exception as e:
            return {"success": False, "message": f"Error: {str(e)}", "auth_valid": False, "dns_valid": False}


class EmailSendingService:
    @staticmethod
    async def send_email(
        smtp_config_id: str,
        organization_id: str,
        recipient: str,
        subject: str,
        body: str,
        html: str = None,
        reply_to: str = None
    ) -> Dict:
        config = await SmtpService.get_config(smtp_config_id)
        
        if not config:
            return {"success": False, "error": "SMTP config not found"}

        if not config.get("is_active"):
            return {"success": False, "error": "SMTP config is inactive"}

        daily_limit = config.get("daily_limit", 1000)
        monthly_limit = config.get("monthly_limit", 30000)
        daily_sent = config.get("daily_sent", 0)
        monthly_sent = config.get("monthly_sent", 0)

        if daily_sent >= daily_limit:
            return {"success": False, "error": "Daily limit exceeded"}
        if monthly_sent >= monthly_limit:
            return {"success": False, "error": "Monthly limit exceeded"}

        message_id = f"{datetime.utcnow().timestamp()}-{ObjectId()}@outflo"

        try:
            msg = MIMEMultipart("alternative")
            msg["Message-ID"] = f"<{message_id}>"
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = recipient
            msg["Subject"] = subject

            if reply_to:
                msg["Reply-To"] = reply_to

            msg.attach(MIMEText(body, "plain"))
            if html:
                msg.attach(MIMEText(html, "html"))

            if config.get("use_ssl"):
                server = smtplib.SMTP_SSL(config["host"], config["port"])
            else:
                server = smtplib.SMTP(config["host"], config["port"])
                if config.get("use_tls"):
                    server.starttls()

            server.login(config["username"], config["password"])
            server.sendmail(config["from_email"], recipient, msg.as_string())
            server.quit()

            await MongoDB.get_collection("smtp_configs").update_one(
                {"_id": ObjectId(smtp_config_id)},
                {"$inc": {"daily_sent": 1, "monthly_sent": 1}, "$set": {"last_used_at": datetime.utcnow()}}
            )

            log_doc = {
                "smtp_config_id": smtp_config_id,
                "message_id": message_id,
                "organization_id": organization_id,
                "recipient": recipient,
                "subject": subject,
                "status": "sent",
                "sent_at": datetime.utcnow()
            }
            await MongoDB.get_collection("smtp_logs").insert_one(log_doc)

            return {"success": True, "message_id": message_id}

        except Exception as e:
            log_doc = {
                "smtp_config_id": smtp_config_id,
                "message_id": message_id,
                "organization_id": organization_id,
                "recipient": recipient,
                "subject": subject,
                "status": "failed",
                "error": str(e),
                "sent_at": datetime.utcnow()
            }
            await MongoDB.get_collection("smtp_logs").insert_one(log_doc)

            return {"success": False, "error": str(e)}


class SmtpAnalyticsService:
    @staticmethod
    async def get_analytics(smtp_config_id: str = None, days: int = 30) -> Dict:
        start_date = datetime.utcnow() - timedelta(days=days)

        match_query = {"sent_at": {"$gte": start_date}}
        if smtp_config_id:
            match_query["smtp_config_id"] = smtp_config_id

        pipeline = [
            {"$match": match_query},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]

        results = await MongoDB.get_collection("smtp_logs").aggregate(pipeline).to_list(length=10)

        stats = {"sent": 0, "delivered": 0, "bounced": 0, "failed": 0}
        for r in results:
            status = r.get("_id", "sent")
            if status == "sent":
                stats["sent"] = r.get("count", 0)
            elif status == "delivered":
                stats["delivered"] = r.get("count", 0)
            elif status == "bounced":
                stats["bounced"] = r.get("count", 0)
            elif status == "failed":
                stats["failed"] = r.get("count", 0)

        total = stats["sent"]
        delivery_rate = (stats["delivered"] / max(total, 1)) * 100
        bounce_rate = (stats["bounced"] / max(total, 1)) * 100
        failed_rate = (stats["failed"] / max(total, 1)) * 100

        daily_pipeline = [
            {"$match": {"sent_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$sent_at"}},
                "sent": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]

        daily_stats = await MongoDB.get_collection("smtp_logs").aggregate(daily_pipeline).to_list(length=days)

        return {
            "period_days": days,
            "total_sent": stats["sent"],
            "total_delivered": stats["delivered"],
            "total_bounced": stats["bounced"],
            "total_failed": stats["failed"],
            "delivery_rate": round(delivery_rate, 2),
            "bounce_rate": round(bounce_rate, 2),
            "failed_rate": round(failed_rate, 2),
            "daily_breakdown": [{"date": d.get("_id"), "sent": d.get("sent", 0)} for d in daily_stats]
        }

    @staticmethod
    async def get_health_status(smtp_config_id: str) -> Dict:
        config = await SmtpService.get_config(smtp_config_id)
        if not config:
            return {"status": "unknown"}

        recent_logs = await MongoDB.get_collection("smtp_logs").find({
            "smtp_config_id": smtp_config_id,
            "sent_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
        }).to_list(length=50)

        if not recent_logs:
            return {"status": "no_recent_activity", "message": "No emails sent in last hour"}

        sent_count = sum(1 for log in recent_logs if log.get("status") == "sent")
        failed_count = sum(1 for log in recent_logs if log.get("status") == "failed")

        success_rate = (sent_count / max(sent_count + failed_count, 1)) * 100

        if success_rate >= 95:
            status = "healthy"
        elif success_rate >= 80:
            status = "degraded"
        else:
            status = "unhealthy"

        return {
            "status": status,
            "success_rate": round(success_rate, 2),
            "sent_last_hour": sent_count,
            "failed_last_hour": failed_count
        }


class SmtpMonitoringService:
    @staticmethod
    async def check_all_smtp_health() -> List[Dict]:
        configs = await SmtpService.get_all_configs(include_inactive=True)
        
        results = []
        for config in configs:
            health = await SmtpAnalyticsService.get_health_status(config["_id"])
            results.append({
                "config_id": config["_id"],
                "config_name": config["name"],
                "provider": config["provider"],
                **health
            })

        return results

    @staticmethod
    async def get_failed_emails(smtp_config_id: str = None, hours: int = 24) -> List[Dict]:
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        query = {"status": "failed", "sent_at": {"$gte": start_date}}
        if smtp_config_id:
            query["smtp_config_id"] = smtp_config_id

        logs = await MongoDB.get_collection("smtp_logs").find(query).sort("sent_at", -1).to_list(length=100)
        return [serialize_doc(l) for l in logs]