import asyncio
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc
from app.models.billing_models import (
    InvoiceStatus, PaymentStatus, SubscriptionStatus, BillingInterval
)


class BillingService:
    @staticmethod
    async def get_all_invoices(org_id: str = None, status: str = None, skip: int = 0, limit: int = 20) -> List[Dict]:
        query = {}
        if org_id:
            query["organization_id"] = org_id
        if status:
            query["status"] = status

        invoices = await MongoDB.get_collection("invoices").find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(inv) for inv in invoices]

    @staticmethod
    async def get_invoice(invoice_id: str) -> Optional[Dict]:
        try:
            invoice = await MongoDB.get_collection("invoices").find_one({"_id": ObjectId(invoice_id)})
            return serialize_doc(invoice) if invoice else None
        except:
            return None

    @staticmethod
    async def create_invoice(invoice_data: Dict) -> Dict:
        invoice_count = await MongoDB.get_collection("invoices").count_documents({})
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m')}-{str(invoice_count + 1).zfill(5)}"

        subtotal = sum(item.get("amount", 0) * item.get("quantity", 1) for item in invoice_data.get("line_items", []))
        tax_amount = subtotal * (invoice_data.get("tax_rate", 0) / 100)
        discount = invoice_data.get("discount_amount", 0)
        total = subtotal + tax_amount - discount

        invoice_doc = {
            "invoice_number": invoice_number,
            "organization_id": invoice_data.get("organization_id"),
            "subscription_id": invoice_data.get("subscription_id"),
            "status": InvoiceStatus.DRAFT,
            "issue_date": invoice_data.get("issue_date", datetime.utcnow()),
            "due_date": invoice_data.get("due_date"),
            "line_items": invoice_data.get("line_items", []),
            "subtotal": subtotal,
            "tax_rate": invoice_data.get("tax_rate", 0),
            "tax_amount": tax_amount,
            "discount_amount": discount,
            "total": total,
            "currency": invoice_data.get("currency", "USD"),
            "customer_name": invoice_data.get("customer_name"),
            "customer_email": invoice_data.get("customer_email"),
            "customer_address": invoice_data.get("customer_address", {}),
            "billing_address": invoice_data.get("billing_address", {}),
            "shipping_address": invoice_data.get("shipping_address", {}),
            "notes": invoice_data.get("notes"),
            "terms": invoice_data.get("terms"),
            "branding_config": invoice_data.get("branding_config", {}),
            "template_id": invoice_data.get("template_id"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await MongoDB.get_collection("invoices").insert_one(invoice_doc)
        invoice_doc["_id"] = str(result.inserted_id)
        return invoice_doc

    @staticmethod
    async def update_invoice(invoice_id: str, invoice_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in invoice_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        result = await MongoDB.get_collection("invoices").update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await BillingService.get_invoice(invoice_id)
        return None

    @staticmethod
    async def delete_invoice(invoice_id: str) -> bool:
        result = await MongoDB.get_collection("invoices").delete_one({"_id": ObjectId(invoice_id)})
        return result.deleted_count > 0

    @staticmethod
    async def send_invoice(invoice_id: str) -> Optional[Dict]:
        return await BillingService.update_invoice(invoice_id, {"status": InvoiceStatus.SENT})

    @staticmethod
    async def mark_invoice_paid(invoice_id: str) -> Optional[Dict]:
        return await BillingService.update_invoice(invoice_id, {
            "status": InvoiceStatus.PAID,
            "paid_at": datetime.utcnow()
        })

    @staticmethod
    async def cancel_invoice(invoice_id: str) -> Optional[Dict]:
        return await BillingService.update_invoice(invoice_id, {"status": InvoiceStatus.CANCELLED})

    @staticmethod
    async def refund_invoice(invoice_id: str) -> Optional[Dict]:
        return await BillingService.update_invoice(invoice_id, {"status": InvoiceStatus.REFUNDED})


class SubscriptionService:
    @staticmethod
    async def get_all_subscriptions(org_id: str = None, status: str = None) -> List[Dict]:
        query = {}
        if org_id:
            query["organization_id"] = org_id
        if status:
            query["status"] = status

        subs = await MongoDB.get_collection("subscriptions").find(query).sort("created_at", -1).to_list(length=100)
        return [serialize_doc(s) for s in subs]

    @staticmethod
    async def get_subscription(subscription_id: str) -> Optional[Dict]:
        try:
            sub = await MongoDB.get_collection("subscriptions").find_one({"_id": ObjectId(subscription_id)})
            return serialize_doc(sub) if sub else None
        except:
            return None

    @staticmethod
    async def get_organization_subscription(org_id: str) -> Optional[Dict]:
        sub = await MongoDB.get_collection("subscriptions").find_one({
            "organization_id": org_id,
            "status": {"$in": [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]}
        })
        return serialize_doc(sub) if sub else None

    @staticmethod
    async def create_subscription(sub_data: Dict) -> Dict:
        now = datetime.utcnow()
        
        if sub_data.get("billing_interval") == BillingInterval.MONTHLY:
            period_end = now + timedelta(days=30)
        elif sub_data.get("billing_interval") == BillingInterval.YEARLY:
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)

        trial_end = None
        if sub_data.get("trial_days", 0) > 0:
            trial_end = now + timedelta(days=sub_data["trial_days"])

        sub_doc = {
            "organization_id": sub_data.get("organization_id"),
            "plan_id": sub_data.get("plan_id"),
            "plan_name": sub_data.get("plan_name"),
            "status": SubscriptionStatus.TRIALING if trial_end else SubscriptionStatus.ACTIVE,
            "billing_interval": sub_data.get("billing_interval", BillingInterval.MONTHLY),
            "price_amount": sub_data.get("price_amount"),
            "currency": sub_data.get("currency", "USD"),
            "current_period_start": now,
            "current_period_end": period_end,
            "trial_end": trial_end,
            "cancel_at_period_end": False,
            "created_at": now,
            "updated_at": now
        }

        result = await MongoDB.get_collection("subscriptions").insert_one(sub_doc)
        sub_doc["_id"] = str(result.inserted_id)
        return sub_doc

    @staticmethod
    async def update_subscription(subscription_id: str, sub_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in sub_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        result = await MongoDB.get_collection("subscriptions").update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await SubscriptionService.get_subscription(subscription_id)
        return None

    @staticmethod
    async def cancel_subscription(subscription_id: str, immediate: bool = False) -> Optional[Dict]:
        if immediate:
            return await SubscriptionService.update_subscription(subscription_id, {
                "status": SubscriptionStatus.CANCELLED,
                "cancelled_at": datetime.utcnow()
            })
        return await SubscriptionService.update_subscription(subscription_id, {
            "cancel_at_period_end": True
        })

    @staticmethod
    async def reactivate_subscription(subscription_id: str) -> Optional[Dict]:
        return await SubscriptionService.update_subscription(subscription_id, {
            "status": SubscriptionStatus.ACTIVE,
            "cancel_at_period_end": False
        })


class PaymentService:
    @staticmethod
    async def get_all_payments(org_id: str = None, status: str = None) -> List[Dict]:
        query = {}
        if org_id:
            query["organization_id"] = org_id
        if status:
            query["status"] = status

        payments = await MongoDB.get_collection("payments").find(query).sort("created_at", -1).to_list(length=100)
        return [serialize_doc(p) for p in payments]

    @staticmethod
    async def get_payment(payment_id: str) -> Optional[Dict]:
        try:
            payment = await MongoDB.get_collection("payments").find_one({"_id": ObjectId(payment_id)})
            return serialize_doc(payment) if payment else None
        except:
            return None

    @staticmethod
    async def create_payment(payment_data: Dict) -> Dict:
        payment_doc = {
            "invoice_id": payment_data.get("invoice_id"),
            "organization_id": payment_data.get("organization_id"),
            "subscription_id": payment_data.get("subscription_id"),
            "amount": payment_data.get("amount"),
            "currency": payment_data.get("currency", "USD"),
            "status": payment_data.get("status", PaymentStatus.PENDING),
            "payment_method": payment_data.get("payment_method"),
            "transaction_id": payment_data.get("transaction_id"),
            "gateway_response": payment_data.get("gateway_response", {}),
            "created_at": datetime.utcnow()
        }

        result = await MongoDB.get_collection("payments").insert_one(payment_doc)
        payment_doc["_id"] = str(result.inserted_id)
        return payment_doc

    @staticmethod
    async def update_payment_status(payment_id: str, status: str, reason: str = None) -> Optional[Dict]:
        update_data = {"status": status}
        
        if status == PaymentStatus.SUCCESS:
            update_data["processed_at"] = datetime.utcnow()
        elif status == PaymentStatus.FAILED:
            update_data["failure_reason"] = reason

        result = await MongoDB.get_collection("payments").update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await PaymentService.get_payment(payment_id)
        return None

    @staticmethod
    async def process_payment(payment_id: str, success: bool = True, failure_reason: str = None) -> Dict:
        payment = await PaymentService.get_payment(payment_id)
        if not payment:
            return {"success": False, "error": "Payment not found"}

        if success:
            await PaymentService.update_payment_status(payment_id, PaymentStatus.SUCCESS)
            await BillingService.mark_invoice_paid(payment["invoice_id"])
            return {"success": True, "payment_id": payment_id}
        else:
            await PaymentService.update_payment_status(payment_id, PaymentStatus.FAILED, failure_reason)
            return {"success": False, "error": failure_reason}

    @staticmethod
    async def refund_payment(payment_id: str, amount: float, reason: str) -> Optional[Dict]:
        payment = await PaymentService.get_payment(payment_id)
        if not payment:
            return None

        refund_amount = min(amount, payment["amount"] - payment.get("refunded_amount", 0))

        update_data = {
            "status": PaymentStatus.REFUNDED if refund_amount == payment["amount"] else PaymentStatus.PARTIALLY_REFUNDED,
            "refunded_amount": payment.get("refunded_amount", 0) + refund_amount,
            "refund_reason": reason
        }

        result = await MongoDB.get_collection("payments").update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            if refund_amount == payment["amount"]:
                await BillingService.refund_invoice(payment["invoice_id"])
            return await PaymentService.get_payment(payment_id)
        return None

    @staticmethod
    async def get_failed_payments(hours: int = 24) -> List[Dict]:
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        payments = await MongoDB.get_collection("payments").find({
            "status": PaymentStatus.FAILED,
            "created_at": {"$gte": start_date}
        }).sort("created_at", -1).to_list(length=100)
        
        return [serialize_doc(p) for p in payments]


class RevenueService:
    @staticmethod
    async def generate_revenue_report(start_date: datetime, end_date: datetime, period_type: str = "monthly") -> Dict:
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total": {"$sum": "$total"}
            }}
        ]
        invoice_stats = await MongoDB.get_collection("invoices").aggregate(pipeline).to_list(length=10)

        payments_pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}, "status": "success"}},
            {"$group": {
                "_id": None,
                "total_collected": {"$sum": "$amount"},
                "total_refunded": {"$sum": "$refunded_amount"}
            }}
        ]
        payment_stats = await MongoDB.get_collection("payments").aggregate(payments_pipeline).to_list(length=1)

        subs_pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        sub_stats = await MongoDB.get_collection("subscriptions").aggregate(subs_pipeline).to_list(length=10)

        total_invoices = sum(s.get("count", 0) for s in invoice_stats)
        paid_invoices = sum(s.get("count", 0) for s in invoice_stats if s.get("_id") == "paid")
        
        report_doc = {
            "period_start": start_date,
            "period_end": end_date,
            "period_type": period_type,
            "total_revenue": payment_stats[0].get("total_collected", 0) if payment_stats else 0,
            "refunded_amount": payment_stats[0].get("total_refunded", 0) if payment_stats else 0,
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "created_at": datetime.utcnow()
        }

        result = await MongoDB.get_collection("revenue_reports").insert_one(report_doc)
        report_doc["_id"] = str(result.inserted_id)
        return report_doc

    @staticmethod
    async def get_revenue_analytics(days: int = 30) -> Dict:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}, "status": "success"}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "revenue": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily_revenue = await MongoDB.get_collection("payments").aggregate(pipeline).to_list(length=days)

        total = sum(d.get("revenue", 0) for d in daily_revenue)
        avg_daily = total / max(len(daily_revenue), 1)

        return {
            "period_days": days,
            "total_revenue": total,
            "avg_daily_revenue": round(avg_daily, 2),
            "daily_breakdown": daily_revenue
        }

    @staticmethod
    async def get_mrr_arr() -> Dict:
        subs = await MongoDB.get_collection("subscriptions").find({
            "status": SubscriptionStatus.ACTIVE
        }).to_list(length=1000)

        monthly_revenue = sum(s.get("price_amount", 0) for s in subs if s.get("billing_interval") == "monthly")
        yearly_revenue = sum(s.get("price_amount", 0) for s in subs if s.get("billing_interval") == "yearly")

        mrr = monthly_revenue + (yearly_revenue / 12)
        arr = mrr * 12

        return {
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "active_subscriptions": len(subs)
        }


class InvoiceTemplateService:
    @staticmethod
    async def get_all_templates() -> List[Dict]:
        templates = await MongoDB.get_collection("invoice_templates").find({"is_active": True}).sort("created_at", -1).to_list(length=50)
        return [serialize_doc(t) for t in templates]

    @staticmethod
    async def get_template(template_id: str) -> Optional[Dict]:
        try:
            template = await MongoDB.get_collection("invoice_templates").find_one({"_id": ObjectId(template_id)})
            return serialize_doc(template) if template else None
        except:
            return None

    @staticmethod
    async def get_default_template() -> Optional[Dict]:
        template = await MongoDB.get_collection("invoice_templates").find_one({"is_default": True, "is_active": True})
        return serialize_doc(template) if template else None

    @staticmethod
    async def create_template(template_data: Dict) -> Dict:
        if template_data.get("is_default"):
            await MongoDB.get_collection("invoice_templates").update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )

        template_doc = {
            "name": template_data.get("name"),
            "is_default": template_data.get("is_default", False),
            "is_active": True,
            "header_config": template_data.get("header_config", {}),
            "footer_config": template_data.get("footer_config", {}),
            "colors": template_data.get("colors", {"primary": "#6366f1", "text": "#1f2937", "background": "#ffffff"}),
            "fonts": template_data.get("fonts", {}),
            "logo_url": template_data.get("logo_url"),
            "company_name": template_data.get("company_name"),
            "company_address": template_data.get("company_address", {}),
            "company_email": template_data.get("company_email"),
            "company_phone": template_data.get("company_phone"),
            "tax_number": template_data.get("tax_number"),
            "tax_label": template_data.get("tax_label", "Tax"),
            "notes_template": template_data.get("notes_template"),
            "terms_template": template_data.get("terms_template"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await MongoDB.get_collection("invoice_templates").insert_one(template_doc)
        template_doc["_id"] = str(result.inserted_id)
        return template_doc

    @staticmethod
    async def update_template(template_id: str, template_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in template_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        if update_data.get("is_default"):
            await MongoDB.get_collection("invoice_templates").update_many(
                {"_id": {"$ne": ObjectId(template_id)}, "is_default": True},
                {"$set": {"is_default": False}}
            )

        result = await MongoDB.get_collection("invoice_templates").update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            return await InvoiceTemplateService.get_template(template_id)
        return None

    @staticmethod
    async def delete_template(template_id: str) -> bool:
        result = await MongoDB.get_collection("invoice_templates").delete_one({"_id": ObjectId(template_id)})
        return result.deleted_count > 0