from datetime import datetime, timedelta
from typing import List, Optional, Dict
from bson import ObjectId
from app.db.mongodb import MongoDB, serialize_doc
from app.models.plan_models import (
    Plan, PlanFeature, PlanLimit, PlanStatus, BillingCycle,
    Feature, FeatureFlag, OrganizationLimit, UsageRecord,
)


DEFAULT_FEATURES = [
    {"key": "ai_credits", "name": "AI Credits", "description": "Monthly AI generation credits", "type": "limit"},
    {"key": "leads_limit", "name": "Lead Limit", "description": "Maximum number of leads", "type": "limit"},
    {"key": "campaigns", "name": "Campaigns", "description": "Email campaigns", "type": "boolean"},
    {"key": "crm_access", "name": "CRM Access", "description": "CRM functionality", "type": "boolean"},
    {"key": "exports", "name": "Data Exports", "description": "Export data", "type": "boolean"},
    {"key": "analytics", "name": "Analytics", "description": "Analytics dashboard", "type": "boolean"},
    {"key": "linkedin_enrichment", "name": "LinkedIn Enrichment", "description": "LinkedIn data enrichment", "type": "boolean"},
    {"key": "white_label", "name": "White Label", "description": "Custom branding", "type": "boolean"},
    {"key": "smtp_access", "name": "SMTP Access", "description": "Custom SMTP configuration", "type": "boolean"},
    {"key": "api_access", "name": "API Access", "description": "API access", "type": "boolean"},
    {"key": "team_members", "name": "Team Members", "description": "Number of team members", "type": "limit"},
    {"key": "email_templates", "name": "Email Templates", "description": "Custom email templates", "type": "limit"},
    {"key": "sequences", "name": "Sequences", "description": "Email sequences", "type": "limit"},
    {"key": "scraping_credits", "name": "Scraping Credits", "description": "Web scraping credits", "type": "limit"},
]


class PlanService:
    @staticmethod
    async def get_all_plans(include_archived: bool = False) -> List[Dict]:
        query = {}
        if not include_archived:
            query["status"] = {"$in": [PlanStatus.ACTIVE.value, PlanStatus.INACTIVE.value]}
        
        plans = await MongoDB.get_collection("plans").find(query).sort("sort_order", 1).to_list(length=100)
        return [serialize_doc(p) for p in plans]

    @staticmethod
    def get_team_member_limit(plan: Dict) -> int:
        """Max team members allowed for a plan (from features or limits)."""
        for f in plan.get("features", []):
            if f.get("feature_key") == "team_members" and f.get("enabled"):
                lim = f.get("limit")
                if lim is not None and lim > 0:
                    return int(lim)
        for lim in plan.get("limits", []):
            if lim.get("resource") == "team_members":
                return int(lim.get("limit", 1))
        return 1

    @staticmethod
    async def get_plan(plan_id: str) -> Optional[Dict]:
        try:
            plan = await MongoDB.get_collection("plans").find_one({"_id": ObjectId(plan_id)})
            return serialize_doc(plan) if plan else None
        except:
            return None

    @staticmethod
    async def get_plan_by_key(plan_key: str) -> Optional[Dict]:
        plan = await MongoDB.get_collection("plans").find_one({"name": plan_key})
        return serialize_doc(plan) if plan else None

    @staticmethod
    async def get_default_plan() -> Optional[Dict]:
        plan = await MongoDB.get_collection("plans").find_one({"is_default": True, "status": PlanStatus.ACTIVE.value})
        return serialize_doc(plan) if plan else None

    @staticmethod
    async def get_landing_plans() -> List[Dict]:
        """Plans visible on public landing pricing section."""
        plans = await MongoDB.get_collection("plans").find(
            {
                "status": PlanStatus.ACTIVE.value,
                "show_on_landing": True,
            }
        ).sort("sort_order", 1).to_list(length=20)
        result = []
        for p in plans:
            p = serialize_doc(p)
            feature_lines = []
            for f in p.get("features", []):
                if f.get("enabled"):
                    name = f.get("feature_key", "").replace("_", " ").title()
                    lim = f.get("limit")
                    if lim and lim > 0:
                        feature_lines.append(f"{name} ({lim})")
                    elif lim == -1:
                        feature_lines.append(f"Unlimited {name}")
                    else:
                        feature_lines.append(name)
            if not feature_lines and p.get("description"):
                feature_lines = [p["description"]]
            result.append({
                "name": p.get("name"),
                "price": str(int(p.get("price_monthly", 0))),
                "features": feature_lines[:8] or ["Contact us for details"],
                "popular": bool(p.get("is_popular")),
                "active": True,
            })
        return result

    @staticmethod
    async def create_plan(plan_data: Dict) -> Dict:
        name = (plan_data.get("name") or "").strip()
        if name:
            dup = await MongoDB.get_collection("plans").find_one(
                {"name": {"$regex": f"^{name}$", "$options": "i"}, "status": PlanStatus.ACTIVE.value}
            )
            if dup:
                raise ValueError(f"Plan '{name}' already exists")

        if plan_data.get("is_default"):
            await MongoDB.get_collection("plans").update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )
        
        max_order = await MongoDB.get_collection("plans").find_one(sort=[("sort_order", -1)])
        next_order = (max_order.get("sort_order", 0) + 1) if max_order else 1
        
        plan_doc = {
            "name": plan_data.get("name"),
            "description": plan_data.get("description", ""),
            "price_monthly": plan_data.get("price_monthly", 0),
            "price_yearly": plan_data.get("price_yearly", 0),
            "billing_cycle": plan_data.get("billing_cycle", BillingCycle.MONTHLY.value),
            "status": plan_data.get("status", PlanStatus.ACTIVE.value),
            "is_default": plan_data.get("is_default", False),
            "is_popular": plan_data.get("is_popular", False),
            "features": plan_data.get("features", []),
            "limits": plan_data.get("limits", []),
            "trial_days": plan_data.get("trial_days", 0),
            "sort_order": plan_data.get("sort_order", next_order),
            "show_on_landing": plan_data.get("show_on_landing", True),
            "template_key": plan_data.get("template_key"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await MongoDB.get_collection("plans").insert_one(plan_doc)
        plan_doc["_id"] = str(result.inserted_id)
        return plan_doc

    @staticmethod
    async def update_plan(plan_id: str, plan_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in plan_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        if update_data.get("is_default"):
            await MongoDB.get_collection("plans").update_many(
                {"is_default": True, "_id": {"$ne": ObjectId(plan_id)}},
                {"$set": {"is_default": False}}
            )
        
        result = await MongoDB.get_collection("plans").update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            plan = await MongoDB.get_collection("plans").find_one({"_id": ObjectId(plan_id)})
            return serialize_doc(plan)
        return None

    @staticmethod
    async def delete_plan(plan_id: str) -> bool:
        plan = await MongoDB.get_collection("plans").find_one({"_id": ObjectId(plan_id)})
        if plan and plan.get("is_default"):
            return False
        
        result = await MongoDB.get_collection("plans").update_one(
            {"_id": ObjectId(plan_id)},
            {"$set": {"status": PlanStatus.ARCHIVED.value, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_plan_features(plan_id: str) -> Dict[str, any]:
        plan = await PlanService.get_plan(plan_id)
        if not plan:
            return {}
        
        features = {}
        for feature in plan.get("features", []):
            features[feature.get("feature_key")] = {
                "enabled": feature.get("enabled", True),
                "value": feature.get("value"),
                "limit": feature.get("limit")
            }
        
        for limit in plan.get("limits", []):
            if limit.get("resource") not in features:
                features[limit.get("resource")] = {"enabled": True, "limit": limit.get("limit")}
            else:
                features[limit.get("resource")]["limit"] = limit.get("limit")
        
        return features


class FeatureFlagService:
    @staticmethod
    async def get_all_flags() -> List[Dict]:
        flags = await MongoDB.get_collection("feature_flags").find().to_list(length=100)
        return [serialize_doc(f) for f in flags]

    @staticmethod
    async def get_flag(key: str) -> Optional[Dict]:
        flag = await MongoDB.get_collection("feature_flags").find_one({"key": key})
        return serialize_doc(flag) if flag else None

    @staticmethod
    async def create_flag(flag_data: Dict) -> Dict:
        flag_doc = {
            "key": flag_data.get("key"),
            "name": flag_data.get("name"),
            "description": flag_data.get("description", ""),
            "enabled": flag_data.get("enabled", True),
            "rollout_percentage": flag_data.get("rollout_percentage", 100),
            "target_roles": flag_data.get("target_roles", []),
            "target_plans": flag_data.get("target_plans", []),
            "target_organizations": flag_data.get("target_organizations", []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await MongoDB.get_collection("feature_flags").insert_one(flag_doc)
        flag_doc["_id"] = str(result.inserted_id)
        return flag_doc

    @staticmethod
    async def update_flag(key: str, flag_data: Dict) -> Optional[Dict]:
        update_data = {k: v for k, v in flag_data.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await MongoDB.get_collection("feature_flags").update_one(
            {"key": key},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            flag = await MongoDB.get_collection("feature_flags").find_one({"key": key})
            return serialize_doc(flag)
        return None

    @staticmethod
    async def delete_flag(key: str) -> bool:
        result = await MongoDB.get_collection("feature_flags").delete_one({"key": key})
        return result.deleted_count > 0

    @staticmethod
    async def is_enabled(
        key: str,
        role: Optional[str] = None,
        plan_id: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> bool:
        flag = await FeatureFlagService.get_flag(key)
        
        if not flag:
            return True
        
        if not flag.get("enabled", True):
            return False
        
        rollout = flag.get("rollout_percentage", 100)
        if rollout < 100:
            import random
            if random.randint(1, 100) > rollout:
                return False
        
        target_roles = flag.get("target_roles", [])
        if target_roles and role and role not in target_roles:
            return False
        
        target_plans = flag.get("target_plans", [])
        if target_plans and plan_id and plan_id not in target_plans:
            return False
        
        target_orgs = flag.get("target_organizations", [])
        if target_orgs and organization_id and organization_id not in target_orgs:
            return False
        
        return True


class UsageService:
    @staticmethod
    async def record_usage(organization_id: str, resource: str, count: int = 1, metadata: Dict = None) -> Dict:
        now = datetime.utcnow()
        period = f"{now.year}-{now.month:02d}"
        
        record = {
            "organization_id": organization_id,
            "resource": resource,
            "count": count,
            "metadata": metadata or {},
            "period": period,
            "created_at": now
        }
        
        result = await MongoDB.get_collection("usage_records").insert_one(record)
        record["_id"] = str(result.inserted_id)
        
        await UsageService.update_organization_limit(organization_id, resource, count)
        
        return record

    @staticmethod
    async def get_usage(organization_id: str, resource: str, period: str = None) -> int:
        if not period:
            now = datetime.utcnow()
            period = f"{now.year}-{now.month:02d}"
        
        pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "resource": resource,
                "period": period
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$count"}
            }}
        ]
        
        result = await MongoDB.get_collection("usage_records").aggregate(pipeline).to_list(length=1)
        return result[0].get("total", 0) if result else 0

    @staticmethod
    async def get_all_usage(organization_id: str, period: str = None) -> Dict[str, int]:
        if not period:
            now = datetime.utcnow()
            period = f"{now.year}-{now.month:02d}"
        
        pipeline = [
            {"$match": {
                "organization_id": organization_id,
                "period": period
            }},
            {"$group": {
                "_id": "$resource",
                "total": {"$sum": "$count"}
            }}
        ]
        
        results = await MongoDB.get_collection("usage_records").aggregate(pipeline).to_list(length=100)
        return {r.get("_id", ""): r.get("total", 0) for r in results}

    @staticmethod
    async def update_organization_limit(organization_id: str, resource: str, count: int):
        limit_doc = await MongoDB.get_collection("organization_limits").find_one({
            "organization_id": organization_id,
            "resource": resource
        })
        
        now = datetime.utcnow()
        reset_date = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
        
        if limit_doc:
            new_usage = limit_doc.get("current_usage", 0) + count
            MongoDB.get_collection("organization_limits").update_one(
                {"_id": limit_doc["_id"]},
                {"$set": {"current_usage": new_usage, "updated_at": now}}
            )
        else:
            plan = await PlanService.get_default_plan()
            limit_value = 100
            
            if plan:
                for limit in plan.get("limits", []):
                    if limit.get("resource") == resource:
                        limit_value = limit.get("limit", 100)
                        break
            
            MongoDB.get_collection("organization_limits").insert_one({
                "organization_id": organization_id,
                "resource": resource,
                "current_usage": count,
                "limit": limit_value,
                "reset_at": reset_date,
                "created_at": now,
                "updated_at": now
            })

    @staticmethod
    async def check_limit(organization_id: str, resource: str) -> bool:
        limit_doc = await MongoDB.get_collection("organization_limits").find_one({
            "organization_id": organization_id,
            "resource": resource
        })
        
        if not limit_doc:
            return True
        
        current = limit_doc.get("current_usage", 0)
        limit = limit_doc.get("limit", 0)
        
        return current < limit if limit > 0 else True


class SubscriptionService:
    @staticmethod
    async def get_subscription(organization_id: str) -> Optional[Dict]:
        sub = await MongoDB.get_collection("subscriptions").find_one({
            "organization_id": organization_id,
            "status": "active"
        })
        return serialize_doc(sub) if sub else None

    @staticmethod
    async def create_subscription(organization_id: str, plan_id: str, billing_cycle: str = "monthly") -> Dict:
        now = datetime.utcnow()
        
        if billing_cycle == "yearly":
            end_date = now + timedelta(days=365)
        else:
            end_date = now + timedelta(days=30)
        
        plan = await PlanService.get_plan(plan_id)
        trial_days = plan.get("trial_days", 0) if plan else 0
        
        sub_doc = {
            "organization_id": organization_id,
            "plan_id": plan_id,
            "status": "active",
            "billing_cycle": billing_cycle,
            "current_period_start": now,
            "current_period_end": end_date,
            "cancel_at_period_end": False,
            "created_at": now,
            "updated_at": now,
        }
        
        await MongoDB.get_collection("subscriptions").update_many(
            {"organization_id": organization_id},
            {"$set": {"status": "inactive"}}
        )
        
        result = await MongoDB.get_collection("subscriptions").insert_one(sub_doc)
        sub_doc["_id"] = str(result.inserted_id)
        
        return sub_doc

    @staticmethod
    async def cancel_subscription(organization_id: str) -> bool:
        result = await MongoDB.get_collection("subscriptions").update_one(
            {"organization_id": organization_id, "status": "active"},
            {"$set": {
                "cancel_at_period_end": True,
                "canceled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return result.modified_count > 0


class PlanBuilderService:
    @staticmethod
    async def get_default_plan_templates() -> List[Dict]:
        return [
            {
                "name": "Free",
                "description": "For individuals getting started",
                "price_monthly": 0,
                "price_yearly": 0,
                "features": [
                    {"feature_key": "ai_credits", "enabled": True, "limit": 50},
                    {"feature_key": "leads_limit", "enabled": True, "limit": 100},
                    {"feature_key": "campaigns", "enabled": True},
                    {"feature_key": "crm_access", "enabled": False},
                    {"feature_key": "exports", "enabled": False},
                    {"feature_key": "analytics", "enabled": True},
                    {"feature_key": "linkedin_enrichment", "enabled": False},
                    {"feature_key": "white_label", "enabled": False},
                    {"feature_key": "smtp_access", "enabled": False},
                    {"feature_key": "api_access", "enabled": False},
                    {"feature_key": "team_members", "enabled": True, "limit": 1},
                    {"feature_key": "email_templates", "enabled": True, "limit": 5},
                    {"feature_key": "sequences", "enabled": True, "limit": 3},
                    {"feature_key": "scraping_credits", "enabled": True, "limit": 10},
                ],
                "limits": [
                    {"resource": "ai_credits", "limit": 50, "unit": "credits"},
                    {"resource": "leads_limit", "limit": 100, "unit": "leads"},
                    {"resource": "team_members", "limit": 1, "unit": "members"},
                    {"resource": "email_templates", "limit": 5, "unit": "templates"},
                    {"resource": "sequences", "limit": 3, "unit": "sequences"},
                    {"resource": "scraping_credits", "limit": 10, "unit": "credits"},
                ]
            },
            {
                "name": "Starter",
                "description": "For small teams",
                "price_monthly": 29,
                "price_yearly": 290,
                "is_popular": True,
                "features": [
                    {"feature_key": "ai_credits", "enabled": True, "limit": 500},
                    {"feature_key": "leads_limit", "enabled": True, "limit": 1000},
                    {"feature_key": "campaigns", "enabled": True},
                    {"feature_key": "crm_access", "enabled": True},
                    {"feature_key": "exports", "enabled": True},
                    {"feature_key": "analytics", "enabled": True},
                    {"feature_key": "linkedin_enrichment", "enabled": True},
                    {"feature_key": "white_label", "enabled": False},
                    {"feature_key": "smtp_access", "enabled": False},
                    {"feature_key": "api_access", "enabled": False},
                    {"feature_key": "team_members", "enabled": True, "limit": 5},
                    {"feature_key": "email_templates", "enabled": True, "limit": 25},
                    {"feature_key": "sequences", "enabled": True, "limit": 10},
                    {"feature_key": "scraping_credits", "enabled": True, "limit": 100},
                ],
                "limits": [
                    {"resource": "ai_credits", "limit": 500, "unit": "credits"},
                    {"resource": "leads_limit", "limit": 1000, "unit": "leads"},
                    {"resource": "team_members", "limit": 5, "unit": "members"},
                    {"resource": "email_templates", "limit": 25, "unit": "templates"},
                    {"feature_key": "sequences", "limit": 10, "unit": "sequences"},
                    {"resource": "scraping_credits", "limit": 100, "unit": "credits"},
                ]
            },
            {
                "name": "Pro",
                "description": "For growing businesses",
                "price_monthly": 79,
                "price_yearly": 790,
                "features": [
                    {"feature_key": "ai_credits", "enabled": True, "limit": 2000},
                    {"feature_key": "leads_limit", "enabled": True, "limit": 5000},
                    {"feature_key": "campaigns", "enabled": True},
                    {"feature_key": "crm_access", "enabled": True},
                    {"feature_key": "exports", "enabled": True},
                    {"feature_key": "analytics", "enabled": True},
                    {"feature_key": "linkedin_enrichment", "enabled": True},
                    {"feature_key": "white_label", "enabled": True},
                    {"feature_key": "smtp_access", "enabled": True},
                    {"feature_key": "api_access", "enabled": False},
                    {"feature_key": "team_members", "enabled": True, "limit": 15},
                    {"feature_key": "email_templates", "enabled": True, "limit": 100},
                    {"feature_key": "sequences", "enabled": True, "limit": 25},
                    {"feature_key": "scraping_credits", "enabled": True, "limit": 500},
                ],
                "limits": [
                    {"resource": "ai_credits", "limit": 2000, "unit": "credits"},
                    {"resource": "leads_limit", "limit": 5000, "unit": "leads"},
                    {"resource": "team_members", "limit": 15, "unit": "members"},
                    {"resource": "email_templates", "limit": 100, "unit": "templates"},
                    {"resource": "sequences", "limit": 25, "unit": "sequences"},
                    {"resource": "scraping_credits", "limit": 500, "unit": "credits"},
                ]
            },
            {
                "name": "Enterprise",
                "description": "For large organizations",
                "price_monthly": 199,
                "price_yearly": 1990,
                "features": [
                    {"feature_key": "ai_credits", "enabled": True, "limit": 10000},
                    {"feature_key": "leads_limit", "enabled": True, "limit": 50000},
                    {"feature_key": "campaigns", "enabled": True},
                    {"feature_key": "crm_access", "enabled": True},
                    {"feature_key": "exports", "enabled": True},
                    {"feature_key": "analytics", "enabled": True},
                    {"feature_key": "linkedin_enrichment", "enabled": True},
                    {"feature_key": "white_label", "enabled": True},
                    {"feature_key": "smtp_access", "enabled": True},
                    {"feature_key": "api_access", "enabled": True},
                    {"feature_key": "team_members", "enabled": True, "limit": 100},
                    {"feature_key": "email_templates", "enabled": True, "limit": -1},
                    {"feature_key": "sequences", "enabled": True, "limit": -1},
                    {"feature_key": "scraping_credits", "enabled": True, "limit": 5000},
                ],
                "limits": [
                    {"resource": "ai_credits", "limit": 10000, "unit": "credits"},
                    {"resource": "leads_limit", "limit": 50000, "unit": "leads"},
                    {"resource": "team_members", "limit": 100, "unit": "members"},
                    {"resource": "email_templates", "limit": -1, "unit": "templates"},
                    {"resource": "sequences", "limit": -1, "unit": "sequences"},
                    {"resource": "scraping_credits", "limit": 5000, "unit": "credits"},
                ]
            },
        ]