from fastapi import APIRouter
from .endpoints import auth_router, users_router, leads_router, campaigns_router, tasks_router, health_router, scraping_router, team_router

from app.api.admin import router as admin_router
from app.api.cms import router as cms_router

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