from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
import secrets

from app.db.mongodb import MongoDB, serialize_doc
from app.models.organization_models import (
    OrganizationStatus, MembershipRole, OrganizationSearchQuery
)
from app.services.plan_service import PlanService, SubscriptionService


class OrganizationService:
    @staticmethod
    async def get_organizations(
        query: str = None,
        status: str = None,
        plan_id: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 20
    ) -> Dict:
        filter_dict = {}
        
        if query:
            filter_dict["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"slug": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        
        if status:
            filter_dict["status"] = status
        
        if plan_id:
            filter_dict["plan_id"] = plan_id
        
        if date_from or date_to:
            filter_dict["created_at"] = {}
            if date_from:
                filter_dict["created_at"]["$gte"] = date_from
            if date_to:
                filter_dict["created_at"]["$lte"] = date_to

        sort_dir = -1 if sort_order == "desc" else 1
        sort_dict = {sort_by: sort_dir}

        total = await MongoDB.get_collection("organizations").count_documents(filter_dict)
        
        organizations = await MongoDB.get_collection("organizations").find(
            filter_dict
        ).sort(sort_dict).skip(skip).limit(limit).to_list(length=limit)

        org_list = []
        for org in organizations:
            org_dict = serialize_doc(org)
            
            member_count = await MongoDB.get_collection("memberships").count_documents({
                "organization_id": org.get("_id"),
                "is_active": True
            })
            org_dict["member_count"] = member_count
            
            subscription = await SubscriptionService.get_subscription(str(org.get("_id")))
            if subscription:
                plan = await PlanService.get_plan(subscription.get("plan_id"))
                org_dict["subscription"] = {
                    "status": subscription.get("status"),
                    "plan": plan.get("name") if plan else "Unknown",
                    "billing_cycle": subscription.get("billing_cycle")
                }
            
            org_list.append(org_dict)

        return {
            "organizations": org_list,
            "total": total,
            "page": (skip // limit) + 1,
            "page_size": limit
        }

    @staticmethod
    async def get_organization(organization_id: str) -> Optional[Dict]:
        try:
            org = await MongoDB.get_collection("organizations").find_one({"_id": ObjectId(organization_id)})
            return serialize_doc(org) if org else None
        except:
            return None

    @staticmethod
    async def update_organization(organization_id: str, update_data: Dict) -> Optional[Dict]:
        update_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection("organizations").update_one(
            {"_id": ObjectId(organization_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            org = await MongoDB.get_collection("organizations").find_one({"_id": ObjectId(organization_id)})
            return serialize_doc(org)
        return None

    @staticmethod
    async def suspend_organization(organization_id: str) -> bool:
        result = await MongoDB.get_collection("organizations").update_one(
            {"_id": ObjectId(organization_id)},
            {"$set": {
                "status": OrganizationStatus.SUSPENDED.value,
                "is_active": False,
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0

    @staticmethod
    async def activate_organization(organization_id: str) -> bool:
        result = await MongoDB.get_collection("organizations").update_one(
            {"_id": ObjectId(organization_id)},
            {"$set": {
                "status": OrganizationStatus.ACTIVE.value,
                "is_active": True,
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0

    @staticmethod
    async def change_plan(organization_id: str, plan_id: str, billing_cycle: str = "monthly") -> bool:
        subscription = await SubscriptionService.get_subscription(organization_id)
        
        if subscription:
            await SubscriptionService.create_subscription(organization_id, plan_id, billing_cycle)
        else:
            await SubscriptionService.create_subscription(organization_id, plan_id, billing_cycle)
        
        await MongoDB.get_collection("organizations").update_one(
            {"_id": ObjectId(organization_id)},
            {"$set": {"plan_id": plan_id, "updated_at": datetime.utcnow()}}
        )
        
        return True


class OrganizationAnalyticsService:
    @staticmethod
    async def get_organization_analytics(organization_id: str) -> Dict:
        org = await OrganizationService.get_organization(organization_id)
        if not org:
            return {}

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        users_pipeline = [
            {"$match": {"organization_id": organization_id}},
            {"$count": "total"}
        ]
        users_result = await MongoDB.get_collection("users").aggregate(users_pipeline).to_list(length=1)
        total_users = users_result[0].get("total", 0) if users_result else 0

        active_users_pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "last_login": {"$gte": thirty_days_ago}
            }},
            {"$count": "active"}
        ]
        active_result = await MongoDB.get_collection("users").aggregate(active_users_pipeline).to_list(length=1)
        active_users = active_result[0].get("active", 0) if active_result else 0

        leads_pipeline = [
            {"$match": {"organization_id": organization_id}},
            {"$count": "total"}
        ]
        leads_result = await MongoDB.get_collection("leads").aggregate(leads_pipeline).to_list(length=1)
        total_leads = leads_result[0].get("total", 0) if leads_result else 0

        campaigns_pipeline = [
            {"$match": {"organization_id": organization_id}},
            {"$count": "total"}
        ]
        campaigns_result = await MongoDB.get_collection("campaigns").aggregate(campaigns_pipeline).to_list(length=1)
        total_campaigns = campaigns_result[0].get("total", 0) if campaigns_result else 0

        active_campaigns_pipeline = [
            {"$match": {"organization_id": organization_id, "status": "running"}},
            {"$count": "active"}
        ]
        active_camps = await MongoDB.get_collection("campaigns").aggregate(active_campaigns_pipeline).to_list(length=1)
        active_campaigns = active_camps[0].get("active", 0) if active_camps else 0

        emails_pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "created_at": {"$gte": thirty_days_ago}
            }},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        email_results = await MongoDB.get_collection("email_messages").aggregate(emails_pipeline).to_list(length=10)
        
        emails_sent = 0
        emails_failed = 0
        for er in email_results:
            if er.get("_id") == "sent":
                emails_sent = er.get("count", 0)
            elif er.get("_id") == "failed":
                emails_failed = er.get("count", 0)

        ai_pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "created_at": {"$gte": thirty_days_ago}
            }},
            {"$count": "generations"}
        ]
        ai_result = await MongoDB.get_collection("ai_usage_logs").aggregate(ai_pipeline).to_list(length=1)
        ai_generations = ai_result[0].get("generations", 0) if ai_result else 0

        scraping_pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "created_at": {"$gte": thirty_days_ago}
            }},
            {"$count": "credits"}
        ]
        scraping_result = await MongoDB.get_collection("scraping_jobs").aggregate(scraping_pipeline).to_list(length=1)
        scraping_credits = scraping_result[0].get("credits", 0) if scraping_result else 0

        subscription = await SubscriptionService.get_subscription(organization_id)
        plan = None
        if subscription:
            plan = await PlanService.get_plan(subscription.get("plan_id"))

        return {
            "organization": {
                "id": org.get("_id"),
                "name": org.get("name"),
                "slug": org.get("slug"),
                "status": org.get("status"),
                "created_at": org.get("created_at")
            },
            "users": {
                "total": total_users,
                "active_30d": active_users
            },
            "leads": {
                "total": total_leads
            },
            "campaigns": {
                "total": total_campaigns,
                "active": active_campaigns
            },
            "emails": {
                "sent_30d": emails_sent,
                "failed_30d": emails_failed,
                "delivery_rate": round((emails_sent / max(emails_sent + emails_failed, 1)) * 100, 2)
            },
            "ai": {
                "generations_30d": ai_generations
            },
            "scraping": {
                "credits_30d": scraping_credits
            },
            "subscription": {
                "plan": plan.get("name") if plan else "Free",
                "status": subscription.get("status") if subscription else "none",
                "billing_cycle": subscription.get("billing_cycle") if subscription else None
            }
        }

    @staticmethod
    async def get_organization_billing(organization_id: str) -> Dict:
        subscription = await SubscriptionService.get_subscription(organization_id)
        
        if not subscription:
            return {
                "subscription": None,
                "invoices": [],
                "payment_method": None
            }
        
        plan = await PlanService.get_plan(subscription.get("plan_id"))
        
        invoices_pipeline = [
            {"$match": {"organization_id": organization_id}},
            {"$sort": {"created_at": -1}},
            {"$limit": 10}
        ]
        invoices = await MongoDB.get_collection("invoices").aggregate(invoices_pipeline).to_list(length=10)

        return {
            "subscription": {
                "plan": plan.get("name") if plan else "Unknown",
                "price_monthly": plan.get("price_monthly", 0) if plan else 0,
                "price_yearly": plan.get("price_yearly", 0) if plan else 0,
                "status": subscription.get("status"),
                "billing_cycle": subscription.get("billing_cycle"),
                "current_period_start": subscription.get("current_period_start"),
                "current_period_end": subscription.get("current_period_end"),
            },
            "invoices": [serialize_doc(inv) for inv in invoices],
            "payment_method": None
        }

    @staticmethod
    async def get_organization_activity(organization_id: str, limit: int = 50) -> List[Dict]:
        activity_pipeline = [
            {"$match": {"organization_id": organization_id}},
            {"$sort": {"created_at": -1}},
            {"$limit": limit}
        ]
        
        activities = await MongoDB.get_collection("activity_logs").aggregate(activity_pipeline).to_list(length=limit)
        return [serialize_doc(a) for a in activities]


class ImpersonationService:
    @staticmethod
    async def start_impersonation(organization_id: str, target_user_id: str = None) -> Dict:
        org = await OrganizationService.get_organization(organization_id)
        if not org:
            raise ValueError("Organization not found")

        if target_user_id:
            member = await MongoDB.get_collection("memberships").find_one({
                "organization_id": organization_id,
                "user_id": target_user_id,
                "is_active": True
            })
            if not member:
                raise ValueError("User not member of organization")
            user_id = target_user_id
        else:
            owner_member = await MongoDB.get_collection("memberships").find_one({
                "organization_id": organization_id,
                "role": MembershipRole.OWNER.value,
                "is_active": True
            })
            if not owner_member:
                raise ValueError("No owner found")
            user_id = owner_member.get("user_id")

        user = await MongoDB.get_collection("users").find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")

        import jwt
        from datetime import timedelta
        
        jwt_secret = "system-owner-impersonation-secret"
        access_token = jwt.encode({
            "sub": user_id,
            "email": user.get("email"),
            "organization_id": organization_id,
            "impersonated": True,
            "exp": datetime.utcnow() + timedelta(minutes=30)
        }, jwt_secret, algorithm="HS256")

        refresh_token = secrets.token_urlsafe(32)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "organization_id": organization_id,
            "user_id": user_id,
            "expires_in": 1800
        }


class OrganizationMembersService:
    @staticmethod
    async def get_members(organization_id: str) -> List[Dict]:
        pipeline = [
            {"$match": {"organization_id": organization_id, "is_active": True}},
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }},
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "user.password_hash": 0
            }},
            {"$sort": {"joined_at": -1}}
        ]
        
        members = await MongoDB.get_collection("memberships").aggregate(pipeline).to_list(length=100)
        return [serialize_doc(m) for m in members]

    @staticmethod
    async def remove_member(organization_id: str, user_id: str) -> bool:
        result = await MongoDB.get_collection("memberships").update_one(
            {"organization_id": organization_id, "user_id": user_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0