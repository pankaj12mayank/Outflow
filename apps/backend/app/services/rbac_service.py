from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import MongoDB, serialize_doc
from app.models.rbac_models import (
    Role, Permission, PermissionCategory, 
    ROLE_PERMISSIONS, UserRole, Plan, OrganizationPlan, FeatureToggle
)


class RBACService:
    @staticmethod
    def get_permissions_for_role(role: Role) -> List[str]:
        return ROLE_PERMISSIONS.get(role, [])

    @staticmethod
    def has_permission(user_permissions: List[str], required_permission: str) -> bool:
        if "*" in user_permissions:
            return True
        return required_permission in user_permissions

    @staticmethod
    def has_any_permission(user_permissions: List[str], required_permissions: List[str]) -> bool:
        if "*" in user_permissions:
            return True
        return any(perm in user_permissions for perm in required_permissions)

    @staticmethod
    def has_all_permissions(user_permissions: List[str], required_permissions: List[str]) -> bool:
        if "*" in user_permissions:
            return True
        return all(perm in user_permissions for perm in required_permissions)


class RoleService:
    @staticmethod
    async def assign_role(user_id: str, role: Role, organization_id: Optional[str] = None) -> dict:
        coll = MongoDB.get_collection("user_roles")
        permissions = RBACService.get_permissions_for_role(role)
        
        role_doc = {
            "user_id": user_id,
            "organization_id": organization_id,
            "role": role.value,
            "permissions": permissions,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await coll.insert_one(role_doc)
        role_doc["_id"] = str(result.inserted_id)
        return role_doc

    @staticmethod
    async def get_user_role(user_id: str, organization_id: Optional[str] = None) -> Optional[dict]:
        coll = MongoDB.get_collection("user_roles")
        query = {"user_id": user_id}
        if organization_id:
            query["organization_id"] = organization_id
        
        doc = await coll.find_one(query)
        return serialize_doc(doc) if doc else None

    @staticmethod
    async def get_user_roles(user_id: str) -> List[dict]:
        coll = MongoDB.get_collection("user_roles")
        cursor = coll.find({"user_id": user_id})
        docs = await cursor.to_list(length=100)
        return [serialize_doc(doc) for doc in docs]

    @staticmethod
    async def update_role(role_id: str, role: Role, organization_id: Optional[str] = None) -> Optional[dict]:
        coll = MongoDB.get_collection("user_roles")
        permissions = RBACService.get_permissions_for_role(role)
        
        result = await coll.update_one(
            {"_id": ObjectId(role_id)},
            {"$set": {"role": role.value, "permissions": permissions, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": ObjectId(role_id)})
            return serialize_doc(doc)
        return None

    @staticmethod
    async def delete_role(role_id: str) -> bool:
        coll = MongoDB.get_collection("user_roles")
        result = await coll.delete_one({"_id": ObjectId(role_id)})
        return result.deleted_count > 0

    @staticmethod
    async def get_system_owner() -> Optional[dict]:
        coll = MongoDB.get_collection("user_roles")
        doc = await coll.find_one({"role": Role.SYSTEM_OWNER.value})
        return serialize_doc(doc) if doc else None


class PlanService:
    @staticmethod
    async def create_plan(plan_data: dict) -> dict:
        coll = MongoDB.get_collection("plans")
        plan_doc = {
            "name": plan_data.get("name"),
            "description": plan_data.get("description"),
            "price": plan_data.get("price"),
            "billing_cycle": plan_data.get("billing_cycle", "monthly"),
            "features": plan_data.get("features", []),
            "is_active": True,
            "is_default": plan_data.get("is_default", False),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        if plan_doc.get("is_default"):
            await coll.update_many({}, {"$set": {"is_default": False}})
        
        result = await coll.insert_one(plan_doc)
        plan_doc["_id"] = str(result.inserted_id)
        return plan_doc

    @staticmethod
    async def get_plans() -> List[dict]:
        coll = MongoDB.get_collection("plans")
        cursor = coll.find({"is_active": True}).sort("price", 1)
        docs = await cursor.to_list(length=100)
        return [serialize_doc(doc) for doc in docs]

    @staticmethod
    async def get_plan(plan_id: str) -> Optional[dict]:
        coll = MongoDB.get_collection("plans")
        try:
            doc = await coll.find_one({"_id": ObjectId(plan_id)})
            return serialize_doc(doc) if doc else None
        except:
            return None

    @staticmethod
    async def update_plan(plan_id: str, plan_data: dict) -> Optional[dict]:
        coll = MongoDB.get_collection("plans")
        
        if plan_data.get("is_default"):
            await coll.update_many({}, {"$set": {"is_default": False}})
        
        update_data = {k: v for k, v in plan_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await coll.update_one({"_id": ObjectId(plan_id)}, {"$set": update_data})
        
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": ObjectId(plan_id)})
            return serialize_doc(doc)
        return None

    @staticmethod
    async def delete_plan(plan_id: str) -> bool:
        coll = MongoDB.get_collection("plans")
        result = await coll.update_one({"_id": ObjectId(plan_id)}, {"$set": {"is_active": False, "updated_at": datetime.utcnow()}})
        return result.modified_count > 0


class OrganizationPlanService:
    @staticmethod
    async def assign_plan(organization_id: str, plan_id: str, billing_cycle: str = "monthly") -> dict:
        from datetime import timedelta
        
        coll = MongoDB.get_collection("organization_plans")
        
        end_date = datetime.utcnow() + timedelta(days=30 if billing_cycle == "monthly" else 365)
        
        plan_doc = {
            "organization_id": organization_id,
            "plan_id": plan_id,
            "status": "active",
            "start_date": datetime.utcnow(),
            "end_date": end_date,
            "created_at": datetime.utcnow(),
        }
        
        await coll.update_many({"organization_id": organization_id}, {"$set": {"status": "expired"}})
        
        result = await coll.insert_one(plan_doc)
        plan_doc["_id"] = str(result.inserted_id)
        return plan_doc

    @staticmethod
    async def get_organization_plan(organization_id: str) -> Optional[dict]:
        coll = MongoDB.get_collection("organization_plans")
        doc = await coll.find_one({"organization_id": organization_id, "status": "active"})
        return serialize_doc(doc) if doc else None


class FeatureToggleService:
    @staticmethod
    async def create_feature(feature_data: dict) -> dict:
        coll = MongoDB.get_collection("feature_toggles")
        
        feature_doc = {
            "key": feature_data.get("key"),
            "name": feature_data.get("name"),
            "description": feature_data.get("description", ""),
            "is_enabled": feature_data.get("is_enabled", True),
            "rollout_percentage": feature_data.get("rollout_percentage", 100),
            "roles": feature_data.get("roles", []),
            "organizations": feature_data.get("organizations", []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await coll.insert_one(feature_doc)
        feature_doc["_id"] = str(result.inserted_id)
        return feature_doc

    @staticmethod
    async def get_features() -> List[dict]:
        coll = MongoDB.get_collection("feature_toggles")
        cursor = coll.find()
        docs = await cursor.to_list(length=100)
        return [serialize_doc(doc) for doc in docs]

    @staticmethod
    async def get_feature(key: str) -> Optional[dict]:
        coll = MongoDB.get_collection("feature_toggles")
        doc = await coll.find_one({"key": key})
        return serialize_doc(doc) if doc else None

    @staticmethod
    async def update_feature(key: str, feature_data: dict) -> Optional[dict]:
        coll = MongoDB.get_collection("feature_toggles")
        update_data = {k: v for k, v in feature_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await coll.update_one({"key": key}, {"$set": update_data})
        
        if result.modified_count > 0:
            doc = await coll.find_one({"key": key})
            return serialize_doc(doc)
        return None

    @staticmethod
    async def is_feature_enabled(key: str, role: Role = None, organization_id: str = None) -> bool:
        feature = await FeatureToggleService.get_feature(key)
        
        if not feature:
            return True
        
        if not feature.get("is_enabled"):
            return False
        
        rollout = feature.get("rollout_percentage", 100)
        if rollout < 100:
            import random
            if random.randint(1, 100) > rollout:
                return False
        
        if role and feature.get("roles"):
            if role.value not in feature.get("roles"):
                return False
        
        if organization_id and feature.get("organizations"):
            if organization_id not in feature.get("organizations"):
                return False
        
        return True

    @staticmethod
    async def delete_feature(key: str) -> bool:
        coll = MongoDB.get_collection("feature_toggles")
        result = await coll.delete_one({"key": key})
        return result.deleted_count > 0


class SystemOwnerService:
    @staticmethod
    async def get_all_organizations(skip: int = 0, limit: int = 100) -> List[dict]:
        coll = MongoDB.get_collection("organizations")
        cursor = coll.find().skip(skip).limit(limit).sort("created_at", -1)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    @staticmethod
    async def get_organization(organization_id: str) -> Optional[dict]:
        coll = MongoDB.get_collection("organization")
        try:
            doc = await coll.find_one({"_id": ObjectId(organization_id)})
            return serialize_doc(doc) if doc else None
        except:
            return None

    @staticmethod
    async def update_organization(organization_id: str, org_data: dict) -> Optional[dict]:
        coll = MongoDB.get_collection("organizations")
        update_data = {k: v for k, v in org_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await coll.update_one({"_id": ObjectId(organization_id)}, {"$set": update_data})
        
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": ObjectId(organization_id)})
            return serialize_doc(doc)
        return None

    @staticmethod
    async def get_all_users(organization_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[dict]:
        coll = MongoDB.get_collection("users")
        query = {}
        if organization_id:
            query["organization_id"] = organization_id
        
        cursor = coll.find(query).skip(skip).limit(limit).sort("created_at", -1)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    @staticmethod
    async def get_billing_overview() -> dict:
        org_plans = MongoDB.get_collection("organization_plans")
        
        total_orgs = await org_plans.distinct("organization_id")
        active_plans = await org_plans.count_documents({"status": "active"})
        
        plans = await PlanService.get_plans()
        
        return {
            "total_organizations": len(total_orgs),
            "active_subscriptions": active_plans,
            "available_plans": len(plans),
        }

    @staticmethod
    async def get_analytics_overview() -> dict:
        from app.services.analytics.engine import AnalyticsEngine
        
        users_coll = MongoDB.get_collection("users")
        leads_coll = MongoDB.get_collection("leads")
        campaigns_coll = MongoDB.get_collection("campaigns")
        
        total_users = await users_coll.count_documents({})
        total_leads = await leads_coll.count_documents({})
        total_campaigns = await campaigns_coll.count_documents({})
        
        return {
            "total_users": total_users,
            "total_leads": total_leads,
            "total_campaigns": total_campaigns,
        }