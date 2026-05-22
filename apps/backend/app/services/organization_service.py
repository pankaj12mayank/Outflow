from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
import secrets

from app.db.mongodb import MongoDB, serialize_doc
from app.models.models import OrganizationSearchQuery
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
        # Only organizations with at least one registered user (exclude seed/demo orphans)
        user_org_ids = await MongoDB.get_collection("users").distinct("organization_id")
        valid_ids = []
        for oid in user_org_ids:
            if not oid:
                continue
            try:
                valid_ids.append(ObjectId(oid) if isinstance(oid, str) else oid)
            except Exception:
                pass
        if valid_ids:
            filter_dict["_id"] = {"$in": valid_ids}
        else:
            return {"organizations": [], "total": 0, "page": 1, "page_size": limit}
        
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
            
            org_id = org_dict.get("id") or str(org.get("_id"))
            member_count = await MongoDB.get_collection("memberships").count_documents({
                "organization_id": org_id,
                "$or": [{"status": "active"}, {"is_active": True}],
            })
            org_dict["member_count"] = member_count

            admin_user = await MongoDB.get_collection("users").find_one(
                {"organization_id": org_id, "role": {"$in": ["admin", "organization_admin"]}},
                {"password_hash": 0},
            )
            if admin_user:
                org_dict["admin"] = serialize_doc(admin_user)
            
            subscription = await SubscriptionService.get_subscription(org_id)
            if subscription:
                plan = await PlanService.get_plan(subscription.get("plan_id"))
                org_dict["subscription"] = {
                    "status": subscription.get("status"),
                    "plan": plan.get("name") if plan else "Unknown",
                    "plan_id": subscription.get("plan_id"),
                    "billing_cycle": subscription.get("billing_cycle"),
                    "current_period_end": subscription.get("current_period_end"),
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
        memberships = await MongoDB.get_collection("memberships").find(
            {"organization_id": organization_id}
        ).sort("created_at", -1).to_list(length=100)

        users_coll = MongoDB.get_collection("users")
        result = []
        for m in memberships:
            m = serialize_doc(m)
            uid = m.get("user_id")
            user = None
            if uid:
                try:
                    user = await users_coll.find_one(
                        {"_id": ObjectId(uid)},
                        {"password_hash": 0},
                    )
                except Exception:
                    user = await users_coll.find_one(
                        {"_id": uid},
                        {"password_hash": 0},
                    )
            if user:
                u = serialize_doc(user)
                result.append({
                    "id": m.get("id"),
                    "user_id": u.get("id"),
                    "email": u.get("email"),
                    "full_name": u.get("full_name"),
                    "role": m.get("role") or u.get("role"),
                    "is_active": u.get("is_active", True),
                    "status": m.get("status", "active"),
                    "created_at": m.get("created_at") or u.get("created_at"),
                })
        return result

    @staticmethod
    async def set_member_active(organization_id: str, user_id: str, is_active: bool) -> bool:
        await MongoDB.get_collection("users").update_one(
            {"_id": ObjectId(user_id), "organization_id": organization_id},
            {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}},
        )
        await MongoDB.get_collection("memberships").update_one(
            {"organization_id": organization_id, "user_id": user_id},
            {"$set": {
                "status": "active" if is_active else "inactive",
                "is_active": is_active,
                "updated_at": datetime.utcnow(),
            }},
        )
        return True

    @staticmethod
    async def remove_member(organization_id: str, user_id: str) -> bool:
        return await OrganizationMembersService.set_member_active(organization_id, user_id, False)