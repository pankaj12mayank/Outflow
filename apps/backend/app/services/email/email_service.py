"""
Outflo - Email Service Architecture
Production-grade email sending with safety features
"""

import asyncio
import logging
import smtplib
import email as email_lib
import re
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum

import aiosmtplib
from aiosmtplib import SMTP, SMTPException
import httpx

from app.core.config import settings
from app.core.logging import email_logger
from app.schemas.email import (
    SMTPProvider, SMTPEncryption, EmailAccountStatus,
    WarmupPhase, AccountWarmupState,
    WarmupConfig, ThrottleConfig, RetryConfig, BounceProtection,
    SendEmailRequest, SendEmailResponse, BatchSendResponse,
    BounceRecord, SMTPHealthCheck, DailySendingStats,
)
from app.db.mongodb import MongoDB

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    from_email: str
    from_name: str
    to_email: str
    to_name: Optional[str]
    subject: str
    body_text: Optional[str]
    body_html: Optional[str]
    reply_to: Optional[str]
    message_id: str
    thread_id: Optional[str]
    track_opens: bool
    track_clicks: bool
    headers: dict
    campaign_id: Optional[int]
    lead_id: Optional[int]
    sequence_id: Optional[int]
    sequence_step: Optional[int]


@dataclass
class SendResult:
    success: bool
    message_id: Optional[str]
    error: Optional[str]
    retryable: bool


class SMTPConnectionPool:
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self._pool: asyncio.Queue = asyncio.Queue(maxsize=max_connections)
        self._configs: dict = {}
        self._lock = asyncio.Lock()

    async def register(self, account_id: int, config: dict):
        async with self._lock:
            self._configs[account_id] = config

    async def acquire(self, account_id: int) -> SMTP:
        config = self._configs.get(account_id)
        if not config:
            raise ValueError(f"Account {account_id} not registered")

        smtp = SMTP(
            hostname=config["host"],
            port=config["port"],
            start_tls=config["encryption"] == SMTPEncryption.STARTTLS,
            tls=config["encryption"] == SMTPEncryption.SSL,
            timeout=30,
        )

        await smtp.connect()
        await smtp.login(config["username"], config["password"])

        return smtp

    async def release(self, smtp: SMTP):
        try:
            await smtp.quit()
        except Exception:
            pass


class EmailSafetyManager:
    def __init__(
        self,
        warmup_config: WarmupConfig = None,
        throttle_config: ThrottleConfig = None,
        bounce_protection: BounceProtection = None,
        retry_config: RetryConfig = None,
    ):
        self.warmup = warmup_config or WarmupConfig()
        self.throttle = throttle_config or ThrottleConfig()
        self.bounce = bounce_protection or BounceProtection()
        self.retry = retry_config or RetryConfig()
        self._rate_limiter = RateLimiter()
        self._account_warmup_states: dict[int, AccountWarmupState] = {}

    async def can_send(self, account_id: int, usage_today: int) -> tuple[bool, str]:
        state = self._account_warmup_states.get(account_id)

        if state and not state.is_complete:
            if usage_today >= state.current_daily_limit:
                return False, f"Warmup limit reached: {usage_today}/{state.current_daily_limit}"

        if usage_today >= self.throttle.emails_per_day:
            return False, f"Daily limit reached: {usage_today}/{self.throttle.emails_per_day}"

        if not await self._rate_limiter.can_proceed(account_id):
            return False, "Rate limit exceeded"

        return True, ""

    async def record_send(
        self, account_id: int, success: bool, bounced: bool, opened: bool = False
    ):
        state = self._account_warmup_states.get(account_id)
        if state:
            state.total_sent += 1
            if success and not bounced:
                state.total_opened += 1
            if bounced:
                state.total_bounced += 1

            if state.total_sent > 0:
                state.engagement_rate = state.total_opened / state.total_sent

            if state.is_complete:
                return

            if state.engagement_rate < self.warmup.min_engagement_rate:
                if self.warmup.auto_pause_on_low_engagement:
                    logger.warning(f"Account {account_id} paused: low engagement {state.engagement_rate:.2%}")
                    return

            bounce_rate = state.total_bounced / state.total_sent if state.total_sent > 0 else 0
            if bounce_rate > self.warmup.max_bounce_rate:
                logger.warning(f"Account {account_id} paused: high bounce rate {bounce_rate:.2%}")

    async def get_warmup_daily_limit(self, account_id: int) -> int:
        state = self._account_warmup_states.get(account_id)
        if state:
            return state.current_daily_limit
        return self.warmup.start_daily_limit

    def start_warmup(self, account_id: int, target_limit: int):
        schedule = WarmupPhase.PHASE_1_WARMUP + WarmupPhase.PHASE_2_GROWTH
        if len(schedule) > self.warmup.ramp_up_days:
            schedule = schedule[: self.warmup.ramp_up_days]

        self._account_warmup_states[account_id] = AccountWarmupState(
            account_id=account_id,
            current_daily_limit=self.warmup.start_daily_limit,
            target_daily_limit=target_limit,
            started_at=datetime.utcnow(),
        )

    async def advance_warmup(self, account_id: int):
        state = self._account_warmup_states.get(account_id)
        if not state or state.is_complete:
            return

        if state.day_index >= len(WarmupPhase.PHASE_1_WARMUP):
            state.phase = 2
            schedule = WarmupPhase.PHASE_2_GROWTH
            base_index = state.day_index - len(WarmupPhase.PHASE_1_WARMUP)
        else:
            schedule = WarmupPhase.PHASE_1_WARMUP
            base_index = state.day_index

        if base_index < len(schedule):
            state.current_daily_limit = schedule[base_index]
        else:
            state.current_daily_limit = min(
                state.current_daily_limit + 20,
                state.target_daily_limit,
            )

        state.day_index += 1

        if state.current_daily_limit >= state.target_daily_limit:
            state.is_complete = True
            logger.info(f"Account {account_id} warmup complete")

    async def check_bounce(self, email: str, account_id: int) -> tuple[bool, str]:
        coll = MongoDB.get_collection("bounced_emails")
        bounce = await coll.find_one({
            "email": email,
            "account_id": str(account_id),
        })
        if bounce:
            if bounce.get("bounce_type") == "hard":
                return True, "Hard bounce - email permanently rejected"
            if bounce.get("bounce_count", 0) >= self.bounce.hard_bounce_threshold:
                return True, f"Hard bounce threshold reached ({bounce.get('bounce_count')})"
        return False, ""


class RateLimiter:
    def __init__(self):
        self._buckets: dict[int, dict] = {}
        self._lock = asyncio.Lock()

    async def can_proceed(self, account_id: int) -> bool:
        async with self._lock:
            now = datetime.utcnow()
            minute_key = now.replace(second=0, microsecond=0)
            hour_key = now.replace(minute=0, second=0, microsecond=0)

            if account_id not in self._buckets:
                self._buckets[account_id] = {
                    "minute_count": 0,
                    "minute_key": minute_key,
                    "hour_count": 0,
                    "hour_key": hour_key,
                    "minute_reset": minute_key + timedelta(minutes=1),
                    "hour_reset": hour_key + timedelta(hours=1),
                }

            bucket = self._buckets[account_id]

            if bucket["minute_key"] != minute_key:
                bucket["minute_count"] = 0
                bucket["minute_key"] = minute_key
                bucket["minute_reset"] = minute_key + timedelta(minutes=1)

            if bucket["hour_key"] != hour_key:
                bucket["hour_count"] = 0
                bucket["hour_key"] = hour_key
                bucket["hour_reset"] = hour_key + timedelta(hours=1)

            if now >= bucket["minute_reset"] or now >= bucket["hour_reset"]:
                return True

            return bucket["minute_count"] < 20 and bucket["hour_count"] < 300

    async def record(self, account_id: int):
        async with self._lock:
            now = datetime.utcnow()
            minute_key = now.replace(second=0, microsecond=0)
            hour_key = now.replace(minute=0, second=0, microsecond=0)

            if account_id in self._buckets:
                bucket = self._buckets[account_id]
                if bucket["minute_key"] == minute_key:
                    bucket["minute_count"] += 1
                if bucket["hour_key"] == hour_key:
                    bucket["hour_count"] += 1


class EmailSender:
    def __init__(self, safety_manager: EmailSafetyManager = None):
        self.safety = safety_manager or EmailSafetyManager()
        self._connection_pool = SMTPConnectionPool()
        self._queue: asyncio.Queue = asyncio.Queue()
        self._sending = False

    def build_message(self, request: SendEmailRequest, from_email: str, from_name: str) -> EmailMessage:
        message_id = f"<{uuid.uuid4()}@{from_email.split('@')[1]}>"
        thread_id = request.headers.get("Thread-ID") if request.headers else None

        return EmailMessage(
            from_email=from_email,
            from_name=from_name,
            to_email=request.to_email,
            to_name=request.to_name,
            subject=request.subject,
            body_text=request.body_text,
            body_html=request.body_html,
            reply_to=request.reply_to,
            message_id=message_id,
            thread_id=thread_id,
            track_opens=request.track_opens,
            track_clicks=request.track_clicks,
            headers=request.headers or {},
            campaign_id=request.campaign_id,
            lead_id=request.lead_id,
            sequence_id=request.sequence_id,
            sequence_step=request.sequence_step,
        )

    def _create_smtp_message(self, msg: EmailMessage, tracking_pixel_url: str = None) -> MIMEMultipart:
        message = MIMEMultipart("alternative")
        message["From"] = f"{msg.from_name} <{msg.from_email}>" if msg.from_name else msg.from_email
        message["To"] = f"{msg.to_name} <{msg.to_email}>" if msg.to_name else msg.to_email
        message["Subject"] = msg.subject
        message["Message-ID"] = msg.message_id
        message["Date"] = email_lib.formatdate(localtime=True)

        if msg.reply_to:
            message["Reply-To"] = msg.reply_to
        if msg.thread_id:
            message["Thread-ID"] = msg.thread_id

        for key, value in msg.headers.items():
            if key not in ["Message-ID", "Thread-ID", "From", "To", "Subject"]:
                message[key] = value

        if msg.body_text:
            message.attach(MIMEText(msg.body_text, "plain"))

        if msg.body_html:
            html_content = msg.body_html
            if msg.track_opens and tracking_pixel_url:
                tracking_img = f'<img src="{tracking_pixel_url}/{msg.message_id}" width="1" height="1" style="display:none" />'
                if "</body>" in html_content:
                    html_content = html_content.replace("</body>", f"{tracking_img}</body>")
                else:
                    html_content += tracking_img
            message.attach(MIMEText(html_content, "html"))

        return message

    async def send_email(
        self,
        request: SendEmailRequest,
        account_config: dict,
        tracking_pixel_url: str = None,
    ) -> SendEmailResponse:
        msg = self.build_message(
            request,
            account_config.get("from_email", request.from_email or "noreply@example.com"),
            account_config.get("from_name", ""),
        )

        smtp_message = self._create_smtp_message(msg, tracking_pixel_url)

        try:
            smtp = SMTP(
                hostname=account_config["smtp_host"],
                port=account_config["smtp_port"],
                start_tls=account_config["smtp_encryption"] == SMTPEncryption.STARTTLS,
                timeout=30,
            )

            await smtp.connect()
            await smtp.login(account_config["smtp_username"], account_config["smtp_password"])

            await smtp.send_message(
                sender=msg.from_email,
                recipients=[msg.to_email],
                message=smtp_message,
            )

            await smtp.quit()

            return SendEmailResponse(
                success=True,
                message_id=msg.message_id,
                account_used=account_config["email"],
            )

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return SendEmailResponse(
                success=False,
                error=str(e),
                account_used=account_config["email"],
            )

    async def send_with_retry(
        self,
        request: SendEmailRequest,
        account_config: dict,
        max_retries: int = 3,
    ) -> SendEmailResponse:
        delays = [300, 900, 3600]
        last_error = None

        for attempt in range(max_retries):
            result = await self.send_email(request, account_config)
            if result.success:
                email_logger.log_email(to_email=request.to_email, success=True, attempt=attempt + 1)
                return result

            last_error = result.error
            email_logger.log_email(to_email=request.to_email, success=False, error=result.error, attempt=attempt + 1)

            if attempt < max_retries - 1:
                import asyncio
                wait_time = delays[attempt] if attempt < len(delays) else delays[-1]
                logger.warning(f"Email send retry {attempt + 1}/{max_retries} for {request.to_email}, waiting {wait_time}s: {last_error}")
                await asyncio.sleep(wait_time)

        return SendEmailResponse(
            success=False,
            error=f"Failed after {max_retries} attempts: {last_error}",
            account_used=account_config.get("email", "unknown"),
        )

    async def batch_send(
        self,
        emails: list[SendEmailRequest],
        account_configs: list[dict],
        throttle_rate: int = 3,
    ) -> BatchSendResponse:
        batch_id = str(uuid.uuid4())
        results = {"queued": 0, "sent": 0, "failed": 0}

        async def process_email(request: SendEmailRequest, config: dict):
            result = await self.send_with_retry(request, config)
            if result.success:
                results["sent"] += 1
            else:
                results["failed"] += 1

        tasks = []
        for i, request in enumerate(emails):
            config = account_configs[i % len(account_configs)]
            tasks.append(process_email(request, config))

            if len(tasks) >= 50:
                await asyncio.gather(*tasks)
                tasks = []
                await asyncio.sleep(1)

            if throttle_rate > 0:
                await asyncio.sleep(throttle_rate / len(account_configs))

        if tasks:
            await asyncio.gather(*tasks)

        return BatchSendResponse(
            total=len(emails),
            queued=results["queued"],
            sent=results["sent"],
            failed=results["failed"],
            batch_id=batch_id,
            estimated_completion=datetime.utcnow(),
        )

    async def validate_smtp_connection(self, config: dict) -> SMTPHealthCheck:
        issues = []
        can_connect = False
        can_send = False

        try:
            smtp = SMTP(
                hostname=config["smtp_host"],
                port=config["smtp_port"],
                start_tls=config["smtp_encryption"] == SMTPEncryption.STARTTLS,
                timeout=15,
            )
            await smtp.connect()
            await smtp.login(config["smtp_username"], config["smtp_password"])
            can_connect = True
            can_send = True
            await smtp.quit()
        except Exception as e:
            issues.append(f"Connection failed: {str(e)}")

        return SMTPHealthCheck(
            account_id=config.get("id", 0),
            connected=can_connect,
            can_send=can_send,
            daily_limit_reached=False,
            current_usage=0,
            daily_limit=config.get("daily_limit", 500),
            last_check=datetime.utcnow(),
            issues=issues,
        )


class IMAPChecker:
    def __init__(self):
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def connect(self, host: str, port: int, username: str, password: str, use_ssl: bool = True) -> AsyncIterator:
        import imaplib
        client = imaplib.IMAP4_SSL if use_ssl else imaplib.IMAP4
        connection = client(host, port)
        connection.login(username, password)
        try:
            yield connection
        finally:
            connection.logout()

    async def check_inbox(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        folder: str = "INBOX",
        limit: int = 50,
    ) -> list[dict]:
        async with self._lock:
            try:
                async with self.connect(host, port, username, password) as conn:
                    conn.select(folder)
                    status, messages = conn.search(None, "ALL")
                    email_ids = messages[0].split()[-limit:]

                    results = []
                    for eid in email_ids:
                        status, msg_data = conn.fetch(eid, "(RFC822)")
                        raw_email = msg_data[0][1]
                        email_message = email_lib.message_from_bytes(raw_email)

                        results.append({
                            "message_id": email_message.get("Message-ID"),
                            "from": email_message.get("From"),
                            "to": email_message.get("To"),
                            "subject": email_message.get("Subject"),
                            "date": email_message.get("Date"),
                            "thread_id": email_message.get("Thread-ID"),
                            "body_text": self._get_body_text(email_message),
                            "body_html": self._get_body_html(email_message),
                        })

                    return results
            except Exception as e:
                logger.error(f"Failed to check inbox: {e}")
                return []

    def _get_body_text(self, message) -> str:
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/plain":
                    return part.get_payload(decode=True).decode()
        return message.get_payload(decode=True).decode() if message.get_payload() else ""

    def _get_body_html(self, message) -> str:
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/html":
                    return part.get_payload(decode=True).decode()
        return ""

    async def mark_as_read(self, host: str, port: int, username: str, password: str, message_id: str):
        async with self._lock:
            try:
                async with self.connect(host, port, username, password) as conn:
                    conn.select("INBOX")
                    conn.store(message_id, "+FLAGS", "\\Seen")
            except Exception as e:
                logger.error(f"Failed to mark as read: {e}")


_email_sender: Optional[EmailSender] = None


def get_email_sender() -> EmailSender:
    global _email_sender
    if _email_sender is None:
        _email_sender = EmailSender()
    return _email_sender


def get_imap_checker() -> IMAPChecker:
    return IMAPChecker()


def get_safety_manager() -> EmailSafetyManager:
    return EmailSafetyManager()