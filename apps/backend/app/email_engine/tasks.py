"""
Email Engine Background Tasks
Process queue, events, and scheduled emails
"""

import logging
from fastapi import BackgroundTasks

from app.email_engine.services.queue import EmailQueueService
from app.email_engine.services.trigger import TriggerService

logger = logging.getLogger(__name__)


async def process_email_queue(limit: int = 20):
    """Process pending emails in the queue"""
    try:
        results = await EmailQueueService.process_queue(limit)
        logger.info(f"Processed {len(results)} emails from queue")
        return results
    except Exception as e:
        logger.error(f"Error processing email queue: {str(e)}")
        return []


async def process_scheduled_emails():
    """Process emails that are scheduled for future delivery"""
    try:
        count = await EmailQueueService.process_scheduled_emails()
        logger.info(f"Processed {count} scheduled emails")
        return count
    except Exception as e:
        logger.error(f"Error processing scheduled emails: {str(e)}")
        return 0


async def retry_failed_emails(limit: int = 20):
    """Retry failed emails"""
    try:
        results = await EmailQueueService.retry_failed_emails(limit)
        logger.info(f"Retried {len(results)} failed emails")
        return results
    except Exception as e:
        logger.error(f"Error retrying failed emails: {str(e)}")
        return []


async def process_pending_events():
    """Process pending email events"""
    try:
        await TriggerService.process_pending_events()
        logger.info("Processed pending email events")
    except Exception as e:
        logger.error(f"Error processing pending events: {str(e)}")


def add_email_background_tasks(background_tasks: BackgroundTasks):
    """Add email processing tasks to background"""
    background_tasks.add_task(process_email_queue)
    background_tasks.add_task(process_scheduled_emails)
    background_tasks.add_task(retry_failed_emails)


async def send_scheduled_email_task(queue_id: str):
    """Send a specific scheduled email"""
    try:
        await EmailQueueService.process_queue_item(queue_id)
        logger.info(f"Sent scheduled email: {queue_id}")
    except Exception as e:
        logger.error(f"Error sending scheduled email {queue_id}: {str(e)}")