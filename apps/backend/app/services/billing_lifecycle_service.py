"""
Plan-based billing lifecycle: history, invoices linkage, and transactional emails.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.services.notification_service import EmailNotificationService, EmailTemplateService
from app.services.smtp_service import SmtpService


BILLING_TEMPLATE_TYPES = [
    "billing_onboarding",
    "billing_plan_purchased",
    "billing_payment_failed",
    "billing_plan_expired",
    "billing_plan_renewed",
]

DEFAULT_BILLING_TEMPLATES = [
    {
        "name": "Onboarding Welcome",
        "type": "billing_onboarding",
        "subject": "Welcome to {{platform_name}}, {{user_name}}!",
        "body_text": "Hi {{user_name}},\n\nYour organization {{org_name}} is ready on {{platform_name}}.\n\nSign in: {{login_url}}\n\n— {{platform_name}} Team",
        "body_html": "<p>Hi <strong>{{user_name}}</strong>,</p><p>Your organization <strong>{{org_name}}</strong> is ready on {{platform_name}}.</p><p><a href=\"{{login_url}}\">Sign in to your dashboard</a></p><p>— {{platform_name}} Team</p>",
        "variables": ["user_name", "org_name", "platform_name", "login_url"],
    },
    {
        "name": "Plan Purchased",
        "type": "billing_plan_purchased",
        "subject": "{{plan_name}} plan activated — {{org_name}}",
        "body_text": "Hi {{user_name}},\n\nYour {{plan_name}} plan is now active for {{org_name}}.\nAmount: {{currency}} {{amount}}\nValid until: {{period_end}}\n\n— {{platform_name}}",
        "body_html": "<p>Hi {{user_name}},</p><p><strong>{{plan_name}}</strong> is now active for <strong>{{org_name}}</strong>.</p><p>Amount: {{currency}} {{amount}}<br/>Valid until: {{period_end}}</p>",
        "variables": ["user_name", "org_name", "plan_name", "amount", "currency", "period_end", "platform_name"],
    },
    {
        "name": "Payment Failed",
        "type": "billing_payment_failed",
        "subject": "Payment failed for {{org_name}}",
        "body_text": "Hi {{user_name}},\n\nWe could not process your payment for {{plan_name}}.\nReason: {{failure_reason}}\n\nUpdate billing: {{billing_url}}\n\n— {{platform_name}}",
        "body_html": "<p>Hi {{user_name}},</p><p>Payment for <strong>{{plan_name}}</strong> failed.</p><p>Reason: {{failure_reason}}</p><p><a href=\"{{billing_url}}\">Update billing</a></p>",
        "variables": ["user_name", "org_name", "plan_name", "failure_reason", "billing_url", "platform_name"],
    },
    {
        "name": "Plan Expired",
        "type": "billing_plan_expired",
        "subject": "Your {{plan_name}} plan has expired — {{org_name}}",
        "body_text": "Hi {{user_name}},\n\nYour {{plan_name}} subscription for {{org_name}} expired on {{period_end}}.\n\nRenew: {{billing_url}}\n\n— {{platform_name}}",
        "body_html": "<p>Hi {{user_name}},</p><p>Your <strong>{{plan_name}}</strong> plan expired on {{period_end}}.</p><p><a href=\"{{billing_url}}\">Renew subscription</a></p>",
        "variables": ["user_name", "org_name", "plan_name", "period_end", "billing_url", "platform_name"],
    },
    {
        "name": "Plan Renewed",
        "type": "billing_plan_renewed",
        "subject": "{{plan_name}} renewed — {{org_name}}",
        "body_text": "Hi {{user_name}},\n\nYour {{plan_name}} plan for {{org_name}} has been renewed.\nNext billing date: {{period_end}}\nAmount: {{currency}} {{amount}}\n\n— {{platform_name}}",
        "body_html": "<p>Hi {{user_name}},</p><p><strong>{{plan_name}}</strong> renewed for <strong>{{org_name}}</strong>.</p><p>Next period ends: {{period_end}}<br/>Amount: {{currency}} {{amount}}</p>",
        "variables": ["user_name", "org_name", "plan_name", "amount", "currency", "period_end", "platform_name"],
    },
]


class BillingLifecycleService:
    HISTORY = "billing_history"
    TEMPLATE_CATEGORY = "billing"

    @staticmethod
    async def seed_billing_templates() -> List[Dict]:
        created = []
        for tpl in DEFAULT_BILLING_TEMPLATES:
            existing = await MongoDB.get_collection("email_templates").find_one(
                {"type": tpl["type"], "category": BillingLifecycleService.TEMPLATE_CATEGORY}
            )
            if existing:
                created.append(serialize_doc(existing))
                continue
            doc = {
                **tpl,
                "category": BillingLifecycleService.TEMPLATE_CATEGORY,
                "is_active": True,
                "is_default": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            res = await MongoDB.get_collection("email_templates").insert_one(doc)
            doc["id"] = str(res.inserted_id)
            created.append(doc)
        return created

    @staticmethod
    async def list_billing_templates() -> List[Dict]:
        rows = await MongoDB.get_collection("email_templates").find(
            {"category": BillingLifecycleService.TEMPLATE_CATEGORY}
        ).sort("type", 1).to_list(length=20)
        return [serialize_doc(r) for r in rows]

    @staticmethod
    async def update_billing_template(template_id: str, data: Dict) -> Optional[Dict]:
        data["updated_at"] = datetime.utcnow()
        result = await MongoDB.get_collection("email_templates").update_one(
            {"_id": ObjectId(template_id), "category": BillingLifecycleService.TEMPLATE_CATEGORY},
            {"$set": data},
        )
        if result.matched_count:
            t = await MongoDB.get_collection("email_templates").find_one({"_id": ObjectId(template_id)})
            return serialize_doc(t) if t else None
        return None

    @staticmethod
    async def get_org_admin_contact(organization_id: str) -> Optional[Dict]:
        user = await MongoDB.get_collection("users").find_one(
            {
                "organization_id": organization_id,
                "role": {"$in": ["admin", "organization_admin"]},
                "is_active": {"$ne": False},
            },
            {"password_hash": 0},
        )
        if not user:
            user = await MongoDB.get_collection("users").find_one(
                {"organization_id": organization_id},
                {"password_hash": 0},
            )
        org = await MongoDB.get_collection("organizations").find_one(
            {"_id": ObjectId(organization_id)}
        )
        if not user:
            return None
        u = serialize_doc(user)
        o = serialize_doc(org) if org else {}
        return {
            "user_id": u.get("id"),
            "email": u.get("email"),
            "full_name": u.get("full_name") or u.get("email", "").split("@")[0],
            "org_name": o.get("name", "Your organization"),
            "organization_id": organization_id,
        }

    @staticmethod
    def _render(text: str, variables: Dict[str, Any]) -> str:
        if not text:
            return ""
        result = text
        for key, value in variables.items():
            pattern = re.compile(r"\{\{\s*" + re.escape(key) + r"\s*\}\}")
            result = pattern.sub(str(value or ""), result)
        return result

    @staticmethod
    async def send_billing_email(
        template_type: str,
        recipient_email: str,
        variables: Dict[str, Any],
        organization_id: str = "system",
        recipient_name: str = None,
    ) -> Dict[str, Any]:
        template = await MongoDB.get_collection("email_templates").find_one(
            {
                "type": template_type,
                "category": BillingLifecycleService.TEMPLATE_CATEGORY,
                "is_active": True,
            }
        )
        if not template:
            return {"success": False, "error": f"No template for {template_type}"}

        defaults = {
            "platform_name": "Outflo",
            "login_url": "https://app.outflo.com/login",
            "billing_url": "https://app.outflo.com/settings/billing",
        }
        vars_merged = {**defaults, **variables}

        subject = BillingLifecycleService._render(template.get("subject", ""), vars_merged)
        body_text = BillingLifecycleService._render(template.get("body_text", ""), vars_merged)
        body_html = BillingLifecycleService._render(template.get("body_html", ""), vars_merged)

        smtp = await SmtpService.get_default_config()
        smtp_id = None
        if smtp:
            smtp_id = smtp.get("id") or str(smtp.get("_id", ""))

        result = await EmailNotificationService.send_email(
            {
                "recipient_email": recipient_email,
                "recipient_name": recipient_name,
                "subject": subject,
                "body_text": body_text,
                "body_html": body_html,
                "smtp_config_id": smtp_id,
                "organization_id": organization_id,
                "template_id": str(template.get("_id", template.get("id", ""))),
            }
        )
        return result

    @staticmethod
    async def record_history(entry: Dict[str, Any]) -> Dict:
        entry["created_at"] = datetime.utcnow()
        entry["updated_at"] = datetime.utcnow()
        res = await MongoDB.get_collection(BillingLifecycleService.HISTORY).insert_one(entry)
        entry["id"] = str(res.inserted_id)
        return serialize_doc(entry)

    @staticmethod
    async def list_history(
        organization_id: str = None,
        event_type: str = None,
        limit: int = 100,
        skip: int = 0,
    ) -> Dict:
        query: Dict[str, Any] = {}
        if organization_id:
            query["organization_id"] = organization_id
        if event_type:
            query["event_type"] = event_type

        coll = MongoDB.get_collection(BillingLifecycleService.HISTORY)
        total = await coll.count_documents(query)
        rows = await coll.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return {
            "history": [serialize_doc(r) for r in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    @staticmethod
    async def emit_event(
        event_type: str,
        organization_id: str,
        *,
        plan_id: str = None,
        plan_name: str = None,
        amount: float = None,
        currency: str = "USD",
        provider: str = None,
        transaction_id: str = None,
        subscription_id: str = None,
        status: str = "succeeded",
        failure_reason: str = None,
        period_end: datetime = None,
        send_email: bool = True,
        user_email: str = None,
        user_name: str = None,
        org_name: str = None,
        metadata: Dict = None,
    ) -> Dict:
        """Record billing history and optionally send the matching email."""
        contact = await BillingLifecycleService.get_org_admin_contact(organization_id)
        email = user_email or (contact.get("email") if contact else None)
        name = user_name or (contact.get("full_name") if contact else "Customer")
        org = org_name or (contact.get("org_name") if contact else "Organization")

        period_str = period_end.strftime("%Y-%m-%d %H UTC") if period_end else ""

        history = await BillingLifecycleService.record_history(
            {
                "event_type": event_type,
                "organization_id": organization_id,
                "organization_name": org,
                "user_email": email,
                "user_name": name,
                "plan_id": plan_id,
                "plan_name": plan_name,
                "amount": amount,
                "currency": currency,
                "provider": provider,
                "transaction_id": transaction_id,
                "subscription_id": subscription_id,
                "status": status,
                "failure_reason": failure_reason,
                "period_end": period_end,
                "metadata": metadata or {},
                "email_sent": False,
            }
        )

        email_result = None
        template_map = {
            "onboarding": "billing_onboarding",
            "plan_purchased": "billing_plan_purchased",
            "payment_failed": "billing_payment_failed",
            "plan_expired": "billing_plan_expired",
            "plan_renewed": "billing_plan_renewed",
        }
        tpl_type = template_map.get(event_type)
        if send_email and email and tpl_type:
            vars_ = {
                "user_name": name,
                "org_name": org,
                "plan_name": plan_name or "your plan",
                "amount": f"{amount:.2f}" if amount is not None else "0.00",
                "currency": (currency or "USD").upper(),
                "period_end": period_str,
                "failure_reason": failure_reason or "Payment declined",
            }
            email_result = await BillingLifecycleService.send_billing_email(
                tpl_type, email, vars_, organization_id, name
            )
            await MongoDB.get_collection(BillingLifecycleService.HISTORY).update_one(
                {"_id": ObjectId(history["id"])},
                {
                    "$set": {
                        "email_sent": bool(email_result.get("success")),
                        "email_error": email_result.get("error"),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )

        return {"history": history, "email": email_result}
