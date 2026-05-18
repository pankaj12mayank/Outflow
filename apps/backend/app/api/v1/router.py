from fastapi import APIRouter
from .endpoints import auth_router, users_router, leads_router, campaigns_router, tasks_router, health_router, scraping_router, team_router

from app.api.admin import router as admin_router
from app.api.cms import router as cms_router
from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router
from app.api.v1.endpoints.system_owner import router as system_owner_router
from app.api.v1.endpoints.system_owner_auth import router as system_owner_auth_router
from app.api.v1.endpoints.system_owner_dashboard import router as system_owner_dashboard_router
from app.api.v1.endpoints.plans import router as plans_router, router2 as features_router, router3 as subscriptions_router, router4 as usage_router
from app.api.v1.endpoints.organizations import router as organizations_router, router2 as impersonate_router
from app.api.v1.endpoints.cms_landing import router as cms_landing_router, router2 as cms_blocks_router, router3 as cms_content_router
from app.api.v1.endpoints.smtp import router as smtp_router
from app.api.v1.endpoints.billing import router as billing_router
from app.api.v1.endpoints.monitoring import router as monitoring_router
from app.api.v1.endpoints.notifications import router as notifications_router

# Import new endpoints
try:
    from app.api.meetings import router as meetings_router
except:
    meetings_router = None

try:
    from app.api.email_smtp import router as email_router
except:
    email_router = None

try:
    from app.api.webhooks import router as webhooks_router
except:
    webhooks_router = None

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(leads_router)
api_router.include_router(campaigns_router)
api_router.include_router(tasks_router)
api_router.include_router(users_router)
api_router.include_router(team_router)
api_router.include_router(health_router)
api_router.include_router(scraping_router)
api_router.include_router(admin_router)
api_router.include_router(cms_router)
api_router.include_router(ai_router)
api_router.include_router(analytics_router)
api_router.include_router(system_owner_router)
api_router.include_router(system_owner_auth_router)
api_router.include_router(system_owner_dashboard_router)
api_router.include_router(plans_router)
api_router.include_router(features_router)
api_router.include_router(subscriptions_router)
api_router.include_router(usage_router)
api_router.include_router(organizations_router)
api_router.include_router(impersonate_router)
api_router.include_router(cms_landing_router)
api_router.include_router(cms_blocks_router)
api_router.include_router(cms_content_router)
api_router.include_router(smtp_router)
api_router.include_router(billing_router)
api_router.include_router(monitoring_router)
api_router.include_router(notifications_router)

if meetings_router:
    api_router.include_router(meetings_router)
if email_router:
    api_router.include_router(email_router)
if webhooks_router:
    api_router.include_router(webhooks_router)