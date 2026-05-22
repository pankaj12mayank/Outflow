"""
Outflo - Campaign Sequence Engine
Multi-step drip campaign management
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum

from app.db.mongodb import MongoDB

logger = logging.getLogger(__name__)


class StepType(str, Enum):
    EMAIL = "email"
    DELAY = "delay"
    CONDITION = "condition"
    TASK = "task"
    SMS = "sms"
    linkedin_MESSAGE = "linkedin_message"


class ConditionType(str, Enum):
    REPLIED = "replied"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    AUTO_REPLY = "auto_reply"
    OUT_OF_OFFICE = "out_of_office"
    TIME_IN_SEQUENCE = "time_in_sequence"
    CUSTOM_VARIABLE = "custom_variable"


class BranchType(str, Enum):
    IF_CONDITION = "if_condition"
    SPLIT_TEST = "split_test"
    RANDOM = "random"


class SequenceStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


@dataclass
class SequenceStep:
    id: str
    type: StepType
    order: int
    delay_minutes: int = 0
    delay_days: int = 0
    condition_type: Optional[ConditionType] = None
    condition_value: Optional[str] = None
    branch_type: Optional[BranchType] = None
    branch_options: list = field(default_factory=list)
    email_template_id: Optional[int] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    track_opens: bool = True
    track_clicks: bool = True
    variant: str = "A"
    weight: int = 100
    settings: dict = field(default_factory=dict)


@dataclass
class SequenceEnrollment:
    lead_id: int
    sequence_id: int
    started_at: datetime
    next_send_at: datetime
    current_step: int = 0
    completed_at: Optional[datetime] = None
    status: str = "active"
    metadata: dict = field(default_factory=dict)


@dataclass
class ABTestVariant:
    name: str
    subject: Optional[str] = None
    body: Optional[str] = None
    opener: Optional[str] = None
    cta: Optional[str] = None
    weight: int = 50
    sent: int = 0
    opened: int = 0
    clicked: int = 0
    replied: int = 0


@dataclass
class ABTestConfig:
    enabled: bool = False
    test_type: str = "subject_line"
    test_variable: str = "subject"
    duration_hours: int = 24
    sample_size: int = 100
    winner_criteria: str = "open_rate"
    auto_select_winner: bool = True
    variants: list[ABTestVariant] = field(default_factory=list)


class SequenceEngine:
    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._processing = False
        self._active_enrollments: dict[str, SequenceEnrollment] = {}

    async def enroll_lead(
        self,
        lead_id: int,
        sequence_id: int,
        steps: list[SequenceStep],
        start_at: datetime = None,
    ) -> SequenceEnrollment:
        start = start_at or datetime.utcnow()
        first_step = steps[0] if steps else None

        next_send = start
        if first_step and first_step.type == StepType.DELAY:
            if first_step.delay_days > 0:
                next_send += timedelta(days=first_step.delay_days)
            elif first_step.delay_minutes > 0:
                next_send += timedelta(minutes=first_step.delay_minutes)

        enrollment = SequenceEnrollment(
            lead_id=lead_id,
            sequence_id=sequence_id,
            current_step=0,
            started_at=start,
            next_send_at=next_send,
        )

        self._active_enrollments[f"{lead_id}:{sequence_id}"] = enrollment
        await self._queue.put(enrollment)

        return enrollment

    async def process_step(
        self,
        enrollment: SequenceEnrollment,
        steps: list[SequenceStep],
    ) -> Optional[SequenceEnrollment]:
        current = steps[enrollment.current_step]

        if current.type == StepType.DELAY:
            delay = timedelta(days=current.delay_days, minutes=current.delay_minutes)
            enrollment.next_send_at = datetime.utcnow() + delay
            enrollment.current_step += 1
            return enrollment

        elif current.type == StepType.CONDITION:
            should_branch, branch_to = await self._evaluate_condition(
                enrollment, current
            )
            if should_branch and branch_to is not None:
                enrollment.current_step = branch_to
            else:
                enrollment.current_step += 1
            return enrollment

        elif current.type == StepType.EMAIL:
            return enrollment

        elif current.type == StepType.SPLIT_TEST:
            chosen = await self._select_ab_variant(enrollment, current)
            enrollment.metadata["selected_variant"] = chosen
            enrollment.current_step += 1
            return enrollment

        return None

    async def _evaluate_condition(
        self,
        enrollment: SequenceEnrollment,
        step: SequenceStep,
    ) -> tuple[bool, Optional[int]]:
        lead_id = enrollment.lead_id
        condition = step.condition_type
        value = step.condition_value

        emails_coll = MongoDB.get_collection("emails")
        logs_coll = MongoDB.get_collection("email_logs")
        lead_q = str(lead_id)
        seq_q = str(enrollment.sequence_id)

        if condition == ConditionType.REPLIED:
            has_reply = await emails_coll.find_one({
                "lead_id": lead_q,
                "sequence_id": seq_q,
                "replied_at": {"$ne": None},
            }) is not None
            if has_reply:
                return True, step.branch_options[0] if step.branch_options else None

        elif condition == ConditionType.OPENED:
            has_open = await emails_coll.find_one({
                "lead_id": lead_q,
                "opened_at": {"$ne": None},
            }) is not None
            if has_open:
                return True, step.branch_options[0] if step.branch_options else None

        elif condition == ConditionType.BOUNCED:
            has_bounce = await logs_coll.find_one({
                "lead_id": lead_q,
                "event_type": "bounce",
            }) is not None
            if has_bounce:
                return True, step.branch_options[1] if len(step.branch_options) > 1 else None

        elif condition == ConditionType.OUT_OF_OFFICE:
            has_oof = await logs_coll.find_one({
                "lead_id": lead_q,
                "event_type": "auto_reply",
            }) is not None
            if has_oof:
                return True, step.branch_options[0] if step.branch_options else None

        return False, None

    async def _select_ab_variant(
        self,
        enrollment: SequenceEnrollment,
        step: SequenceStep,
    ) -> str:
        import random

        if not step.branch_options:
            return "A"

        variants = step.branch_options
        total_weight = sum(v.get("weight", 50) for v in variants)
        rand = random.randint(1, total_weight)

        cumulative = 0
        for variant in variants:
            cumulative += variant.get("weight", 50)
            if rand <= cumulative:
                return variant.get("name", "A")

        return "A"

    async def complete_enrollment(self, enrollment: SequenceEnrollment):
        enrollment.completed_at = datetime.utcnow()
        enrollment.status = "completed"
        key = f"{enrollment.lead_id}:{enrollment.sequence_id}"
        self._active_enrollments.pop(key, None)

    async def pause_enrollment(self, enrollment: SequenceEnrollment):
        enrollment.status = "paused"
        key = f"{enrollment.lead_id}:{enrollment.sequence_id}"
        self._active_enrollments.pop(key, None)

    async def resume_enrollment(
        self,
        lead_id: int,
        sequence_id: int,
        steps: list[SequenceStep],
    ) -> SequenceEnrollment:
        enrollment = SequenceEnrollment(
            lead_id=lead_id,
            sequence_id=sequence_id,
            current_step=0,
            started_at=datetime.utcnow(),
            next_send_at=datetime.utcnow(),
            status="active",
        )
        self._active_enrollments[f"{lead_id}:{sequence_id}"] = enrollment
        return enrollment

    async def process_due_enrollments(self):
        now = datetime.utcnow()
        due = [
            e for e in self._active_enrollments.values()
            if e.status == "active" and e.next_send_at <= now
        ]
        return due

    def get_active_count(self) -> int:
        return len(self._active_enrollments)

    def get_enrollment(self, lead_id: int, sequence_id: int) -> Optional[SequenceEnrollment]:
        return self._active_enrollments.get(f"{lead_id}:{sequence_id}")


_sequence_engine: Optional[SequenceEngine] = None


def get_sequence_engine() -> SequenceEngine:
    global _sequence_engine
    if _sequence_engine is None:
        _sequence_engine = SequenceEngine()
    return _sequence_engine