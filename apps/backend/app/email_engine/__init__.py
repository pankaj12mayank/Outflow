"""
Email Automation Engine
Event-driven email automation system for Outflo SaaS platform
"""

__version__ = "1.0.0"

from app.email_engine.services.email_delivery import EmailDeliveryService
from app.email_engine.services.queue import EmailQueueService
from app.email_engine.services.template import TemplateService
from app.email_engine.services.trigger import TriggerService

__all__ = [
    "EmailDeliveryService",
    "EmailQueueService",
    "TemplateService",
    "TriggerService",
]