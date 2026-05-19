"""
Email Template Service
Manages email templates with dynamic variable injection
"""

import re
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

logger = logging.getLogger(__name__)


class TemplateService:
    COLLECTION = "email_templates"
    LAYOUT_COLLECTION = "email_layouts"
    BRANDING_COLLECTION = "email_branding"
    
    DEFAULT_VARIABLES = [
        "first_name", "last_name", "email", "company_name", 
        "organization_name", "meeting_link", "unsubscribe_link",
        "plan_name", "invoice_id", "amount", "cta", "custom_message",
        "current_date", "current_year", "user_email", "login_url"
    ]

    DEFAULT_LAYOUT = {
        "header_html": """
        <div style="background: #0f172a; padding: 40px 20px; text-align: center;">
            <img src="{{logo_url}}" alt="{{company_name}}" style="max-width: 150px; height: auto;">
        </div>
        """,
        "footer_html": """
        <div style="background: #0f172a; padding: 30px 20px; text-align: center; color: #64748b; font-size: 12px;">
            <p>&copy; {{current_year}} {{company_name}}. All rights reserved.</p>
            <p style="margin-top: 10px;">
                <a href="{{unsubscribe_link}}" style="color: #6366f1;">Unsubscribe</a> | 
                <a href="{{login_url}}" style="color: #6366f1;">Dashboard</a>
            </p>
            <p style="margin-top: 15px; color: #475569;">{{company_address}}</p>
        </div>
        """
    }

    @staticmethod
    async def create_template(template_data: Dict) -> Dict:
        template_data["created_at"] = datetime.utcnow()
        template_data["updated_at"] = datetime.utcnow()
        
        variables = TemplateService._extract_variables(
            template_data.get("html_content", "") + 
            template_data.get("text_content", "") +
            template_data.get("subject", "")
        )
        template_data["variables"] = variables
        
        result = await MongoDB.get_collection(TemplateService.COLLECTION).insert_one(template_data)
        template_data["id"] = str(result.inserted_id)
        return template_data

    @staticmethod
    async def get_template(template_id: str) -> Optional[Dict]:
        try:
            template = await MongoDB.get_collection(TemplateService.COLLECTION).find_one(
                {"_id": ObjectId(template_id)}
            )
            return serialize_doc(template) if template else None
        except:
            return None

    @staticmethod
    async def get_template_by_name(name: str, organization_id: Optional[str] = None) -> Optional[Dict]:
        query = {"name": name}
        if organization_id:
            query["$or"] = [
                {"organization_id": organization_id},
                {"is_system": True}
            ]
        template = await MongoDB.get_collection(TemplateService.COLLECTION).find_one(query)
        return serialize_doc(template) if template else None

    @staticmethod
    async def list_templates(
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        query = {}
        
        if organization_id:
            query["$or"] = [
                {"organization_id": organization_id},
                {"is_system": True}
            ]
        else:
            query["is_system"] = True
            
        if status:
            query["status"] = status
        if category:
            query["category"] = category
            
        templates = await MongoDB.get_collection(TemplateService.COLLECTION)\
            .find(query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
            
        return [serialize_doc(t) for t in templates]

    @staticmethod
    async def update_template(template_id: str, update_data: Dict) -> Optional[Dict]:
        update_data["updated_at"] = datetime.utcnow()
        
        if "html_content" in update_data or "text_content" in update_data or "subject" in update_data:
            template = await MongoDB.get_collection(TemplateService.COLLECTION).find_one(
                {"_id": ObjectId(template_id)}
            )
            if template:
                html = update_data.get("html_content", template.get("html_content", ""))
                text = update_data.get("text_content", template.get("text_content", ""))
                subject = update_data.get("subject", template.get("subject", ""))
                variables = TemplateService._extract_variables(html + text + subject)
                update_data["variables"] = variables
        
        result = await MongoDB.get_collection(TemplateService.COLLECTION).update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await TemplateService.get_template(template_id)
        return None

    @staticmethod
    async def delete_template(template_id: str) -> bool:
        result = await MongoDB.get_collection(TemplateService.COLLECTION).delete_one(
            {"_id": ObjectId(template_id)}
        )
        return result.deleted_count > 0

    @staticmethod
    async def duplicate_template(template_id: str, new_name: str, organization_id: str) -> Dict:
        template = await TemplateService.get_template(template_id)
        if not template:
            raise ValueError("Template not found")
        
        new_template = {
            **template,
            "name": new_name,
            "status": "draft",
            "is_system": False,
            "organization_id": organization_id,
            "_id": None
        }
        
        return await TemplateService.create_template(new_template)

    @staticmethod
    async def render_template(
        template_id: str,
        variables: Dict[str, Any],
        organization_id: Optional[str] = None
    ) -> Dict[str, str]:
        template = await TemplateService.get_template(template_id)
        if not template:
            raise ValueError("Template not found")
        
        branding = None
        if organization_id:
            branding = await TemplateService.get_branding(organization_id)
        
        all_variables = {
            **TemplateService._get_default_variables(),
            **(branding or {}),
            **variables
        }
        
        html_content = TemplateService._render_content(
            template.get("html_content", ""),
            all_variables
        )
        
        text_content = template.get("text_content")
        if text_content:
            text_content = TemplateService._render_content(text_content, all_variables)
        else:
            text_content = TemplateService._strip_html(html_content)
        
        subject = TemplateService._render_content(
            template.get("subject", ""),
            all_variables
        )
        
        return {
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content
        }

    @staticmethod
    def _extract_variables(content: str) -> List[str]:
        pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(pattern, content)
        variables = list(set(matches))
        
        for default_var in TemplateService.DEFAULT_VARIABLES:
            if default_var not in variables:
                variables.append(default_var)
        
        return sorted(variables)

    @staticmethod
    def _render_content(content: str, variables: Dict[str, Any]) -> str:
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            content = content.replace(placeholder, str(value or ""))
        return content

    @staticmethod
    def _get_default_variables() -> Dict[str, str]:
        now = datetime.utcnow()
        return {
            "current_date": now.strftime("%B %d, %Y"),
            "current_year": str(now.year),
            "unsubscribe_link": "{{unsubscribe_link}}",
            "login_url": "{{login_url}}"
        }

    @staticmethod
    def _strip_html(html: str) -> str:
        text = re.sub(r'<[^>]+>', '', html)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @staticmethod
    async def create_layout(layout_data: Dict) -> Dict:
        if layout_data.get("is_default"):
            await MongoDB.get_collection(TemplateService.LAYOUT_COLLECTION).update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )
        
        layout_data["created_at"] = datetime.utcnow()
        result = await MongoDB.get_collection(TemplateService.LAYOUT_COLLECTION).insert_one(layout_data)
        layout_data["id"] = str(result.inserted_id)
        return layout_data

    @staticmethod
    async def get_layout(layout_id: str) -> Optional[Dict]:
        try:
            layout = await MongoDB.get_collection(TemplateService.LAYOUT_COLLECTION).find_one(
                {"_id": ObjectId(layout_id)}
            )
            return serialize_doc(layout) if layout else None
        except:
            return None

    @staticmethod
    async def get_default_layout() -> Dict:
        layout = await MongoDB.get_collection(TemplateService.LAYOUT_COLLECTION).find_one(
            {"is_default": True}
        )
        return serialize_doc(layout) if layout else TemplateService.DEFAULT_LAYOUT

    @staticmethod
    async def list_layouts(limit: int = 20) -> List[Dict]:
        layouts = await MongoDB.get_collection(TemplateService.LAYOUT_COLLECTION)\
            .find()\
            .sort("created_at", -1)\
            .limit(limit)\
            .to_list(length=limit)
        return [serialize_doc(l) for l in layouts]

    @staticmethod
    async def create_branding(branding_data: Dict) -> Dict:
        existing = await MongoDB.get_collection(TemplateService.BRANDING_COLLECTION).find_one(
            {"organization_id": branding_data.get("organization_id")}
        )
        
        if existing:
            await MongoDB.get_collection(TemplateService.BRANDING_COLLECTION).update_one(
                {"_id": existing["_id"]},
                {"$set": {**branding_data, "updated_at": datetime.utcnow()}}
            )
            branding_data["id"] = str(existing["_id"])
        else:
            branding_data["created_at"] = datetime.utcnow()
            result = await MongoDB.get_collection(TemplateService.BRANDING_COLLECTION).insert_one(branding_data)
            branding_data["id"] = str(result.inserted_id)
        
        return branding_data

    @staticmethod
    async def get_branding(organization_id: str) -> Optional[Dict]:
        branding = await MongoDB.get_collection(TemplateService.BRANDING_COLLECTION).find_one(
            {"organization_id": organization_id}
        )
        return serialize_doc(branding) if branding else None

    @staticmethod
    async def seed_default_templates():
        default_templates = [
            {
                "name": "Welcome Email",
                "subject": "Welcome to {{organization_name}}!",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Welcome, {{first_name}}!</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Thank you for joining {{organization_name}}. We're excited to help you automate your outreach!</p>
                        <p>Here's what you can do:</p>
                        <ul>
                            <li>Create targeted campaigns</li>
                            <li>Use AI to personalize messages</li>
                            <li>Track your engagement</li>
                        </ul>
                        <a href="{{login_url}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Get Started</a>
                    </div>
                </div>
                """,
                "text_content": "Welcome {{first_name}}! Thank you for joining {{organization_name}}. Get started at {{login_url}}",
                "category": "auth",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Password Reset",
                "subject": "Reset your {{organization_name}} password",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f172a; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Reset Password</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Hi {{first_name}},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <a href="{{password_reset_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
                        <p style="color: #64748b; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
                    </div>
                </div>
                """,
                "text_content": "Reset your password at {{password_reset_link}}. Link expires in 1 hour.",
                "category": "auth",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Payment Success",
                "subject": "Payment confirmed - {{organization_name}}",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #10b981; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payment Successful!</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Hi {{first_name}},</p>
                        <p>Your payment has been processed successfully.</p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Amount:</strong> {{amount}}</p>
                            <p style="margin: 5px 0;"><strong>Plan:</strong> {{plan_name}}</p>
                            <p style="margin: 5px 0;"><strong>Invoice:</strong> {{invoice_id}}</p>
                        </div>
                        <p>Thank you for your continued support!</p>
                    </div>
                </div>
                """,
                "text_content": "Payment successful! Amount: {{amount}}, Plan: {{plan_name}}, Invoice: {{invoice_id}}",
                "category": "billing",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Payment Failed",
                "subject": "Payment issue - {{organization_name}}",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #ef4444; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Payment Issue</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Hi {{first_name}},</p>
                        <p>We were unable to process your payment. Please update your payment method to continue using {{organization_name}}.</p>
                        <a href="{{billing_url}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Update Payment</a>
                        <p style="color: #64748b; font-size: 12px;">If you have any questions, contact support.</p>
                    </div>
                </div>
                """,
                "text_content": "Payment failed. Please update your payment method at {{billing_url}}",
                "category": "billing",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Trial Ending",
                "subject": "Your trial ends soon - {{organization_name}}",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #f59e0b; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Trial Ending Soon!</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Hi {{first_name}},</p>
                        <p>Your {{plan_name}} trial ends in {{trial_days_remaining}} days.</p>
                        <p>Don't lose access to your campaigns and leads. Upgrade now to continue:</p>
                        <a href="{{upgrade_url}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Upgrade Now</a>
                    </div>
                </div>
                """,
                "text_content": "Your trial ends in {{trial_days_remaining}} days. Upgrade at {{upgrade_url}}",
                "category": "billing",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Meeting Scheduled",
                "subject": "Meeting Confirmed - {{meeting_topic}}",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #6366f1; padding: 40px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Meeting Confirmed!</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <p>Hi {{first_name}},</p>
                        <p>Your meeting has been scheduled:</p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Topic:</strong> {{meeting_topic}}</p>
                            <p style="margin: 5px 0;"><strong>Date:</strong> {{meeting_date}}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> {{meeting_time}}</p>
                            <p style="margin: 5px 0;"><strong>Link:</strong> <a href="{{meeting_link}}">{{meeting_link}}</a></p>
                        </div>
                    </div>
                </div>
                """,
                "text_content": "Meeting confirmed: {{meeting_topic}} on {{meeting_date}} at {{meeting_time}}. Join: {{meeting_link}}",
                "category": "meetings",
                "status": "active",
                "is_system": True,
                "plan_access": ["starter", "growth", "agency"]
            },
            {
                "name": "Lead Follow-up",
                "subject": "Following up - {{company_name}}",
                "html_content": """
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="padding: 30px;">
                        <p>Hi {{first_name}},</p>
                        <p>{{custom_message}}</p>
                        <p>Would you be open to a quick call to discuss how we can help {{company_name}}?</p>
                        <a href="{{meeting_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Schedule a Call</a>
                        <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
                            <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a> from these emails.
                        </p>
                    </div>
                </div>
                """,
                "text_content": "Hi {{first_name}}, {{custom_message}}. Schedule a call: {{meeting_link}}",
                "category": "outreach",
                "status": "active",
                "is_system": True,
                "plan_access": ["growth", "agency"]
            }
        ]
        
        for template_data in default_templates:
            existing = await MongoDB.get_collection(TemplateService.COLLECTION).find_one(
                {"name": template_data["name"]}
            )
            if not existing:
                await TemplateService.create_template(template_data)
                logger.info(f"Created default template: {template_data['name']}")