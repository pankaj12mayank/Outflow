from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.notification_models import EmailTemplateCreate, EmailSendRequest
from app.services.notification_service import EmailTemplateService

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])


@router.get("", response_model=List[dict])
async def list_email_templates(current_user: dict = Depends(get_current_user)):
    return await EmailTemplateService.get_all_templates()


@router.post("", response_model=dict)
async def create_email_template(template: EmailTemplateCreate, current_user: dict = Depends(get_current_user)):
    template_dict = template.model_dump()
    return await EmailTemplateService.create_template(template_dict)


@router.get("/{template_id}", response_model=dict)
async def get_email_template(template_id: str, current_user: dict = Depends(get_current_user)):
    template = await EmailTemplateService.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.api_route("/{template_id}", methods=["PATCH", "PUT"], response_model=dict)
async def update_email_template(template_id: str, template: EmailTemplateCreate, current_user: dict = Depends(get_current_user)):
    template_dict = {k: v for k, v in template.model_dump().items() if v is not None}
    result = await EmailTemplateService.update_template(template_id, template_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.delete("/{template_id}")
async def delete_email_template(template_id: str, current_user: dict = Depends(get_current_user)):
    deleted = await EmailTemplateService.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}
