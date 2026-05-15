import re
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator
import json


def validate_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    pattern = r"^https?://[^\s]+$"
    return bool(re.match(pattern, url))


def validate_linkedin_url(url: str) -> bool:
    return "linkedin.com" in url.lower() and ("/in/" in url.lower() or "/company/" in url.lower())


def validate_phone(phone: str) -> bool:
    cleaned = re.sub(r"[\s\-\(\)\+]", "", phone)
    return bool(re.match(r"^\d{7,15}$", cleaned))


def sanitize_string(value: str, max_length: int = 1000) -> str:
    if not value:
        return ""
    sanitized = value.strip()[:max_length]
    return sanitized


def validate_lead_data(data: dict) -> tuple[bool, list[str]]:
    errors = []

    if "email" in data and data["email"]:
        if not validate_email(data["email"]):
            errors.append("Invalid email format")

    if "phone" in data and data["phone"]:
        if not validate_phone(data["phone"]):
            errors.append("Invalid phone format")

    if "website" in data and data["website"]:
        if not validate_url(data["website"]):
            errors.append("Invalid website URL")

    if "linkedin_url" in data and data["linkedin_url"]:
        if not validate_linkedin_url(data["linkedin_url"]):
            errors.append("Invalid LinkedIn URL")

    if "first_name" in data and data["first_name"]:
        if len(data["first_name"]) > 100:
            errors.append("First name too long")

    if "last_name" in data and data["last_name"]:
        if len(data["last_name"]) > 100:
            errors.append("Last name too long")

    return len(errors) == 0, errors


def validate_campaign_data(data: dict) -> tuple[bool, list[str]]:
    errors = []

    if "name" in data:
        name = data["name"]
        if not name or len(name.strip()) < 2:
            errors.append("Campaign name must be at least 2 characters")
        if len(name) > 255:
            errors.append("Campaign name too long")

    if "target_leads" in data and data["target_leads"]:
        try:
            target = int(data["target_leads"])
            if target < 0:
                errors.append("Target leads must be positive")
        except (ValueError, TypeError):
            errors.append("Invalid target leads value")

    if "start_date" in data and "end_date" in data:
        if data["start_date"] and data["end_date"]:
            try:
                from datetime import datetime
                start = data["start_date"] if isinstance(data["start_date"], datetime) else datetime.fromisoformat(data["start_date"])
                end = data["end_date"] if isinstance(data["end_date"], datetime) else datetime.fromisoformat(data["end_date"])
                if end < start:
                    errors.append("End date must be after start date")
            except (ValueError, TypeError):
                errors.append("Invalid date format")

    return len(errors) == 0, errors


def validate_scraping_url(url: str) -> tuple[bool, Optional[str]]:
    blocked_domains = ["facebook.com", "twitter.com", "instagram.com", "tiktok.com", "snapchat.com"]
    blocked_patterns = ["login", "signin", "auth", "password", "reset"]

    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        for blocked in blocked_domains:
            if blocked in domain:
                return False, f"Scraping {blocked} is not allowed"

        for pattern in blocked_patterns:
            if pattern in url.lower():
                return False, f"URL contains restricted path: {pattern}"

        return True, None
    except Exception as e:
        return False, f"Invalid URL: {e}"


def validate_csv_content(content: bytes, max_size_mb: int = 10) -> tuple[bool, Optional[str]]:
    if len(content) > max_size_mb * 1024 * 1024:
        return False, f"File too large (max {max_size_mb}MB)"

    if len(content) == 0:
        return False, "Empty file"

    try:
        text = content.decode("utf-8")
        lines = text.splitlines()
        if len(lines) < 2:
            return False, "CSV must have at least a header row and one data row"
        if len(lines) > 100000:
            return False, "CSV too large (max 100k rows)"

        return True, None
    except UnicodeDecodeError:
        return False, "File must be UTF-8 encoded"


def validate_email_content(subject: str, body: str) -> tuple[bool, list[str]]:
    errors = []

    if not subject or len(subject.strip()) == 0:
        errors.append("Email subject is required")

    if len(subject) > 500:
        errors.append("Subject too long (max 500 chars)")

    if not body or len(body.strip()) == 0:
        errors.append("Email body is required")

    if len(body) > 50000:
        errors.append("Body too long (max 50000 chars)")

    spam_indicators = ["click here now", "act now", "limited time", "free money", "congratulations you've won"]
    body_lower = body.lower()
    for indicator in spam_indicators:
        if indicator in body_lower:
            errors.append(f"Email may be flagged as spam: '{indicator}'")

    return len(errors) == 0, errors


def validate_ai_request(data: dict) -> tuple[bool, Optional[str]]:
    if "context" in data:
        context = data["context"]
        if isinstance(context, dict):
            if "prompt" in context and len(context["prompt"]) > 10000:
                return False, "Prompt too long (max 10000 chars)"
            if "system" in context and len(context.get("system", "")) > 5000:
                return False, "System prompt too long (max 5000 chars)"

    return True, None


def validate_sequence_steps(steps: list) -> tuple[bool, list[str]]:
    errors = []

    if not steps or len(steps) == 0:
        errors.append("Sequence must have at least one step")
        return False, errors

    step_types = {"email", "delay", "condition", "task", "ab_test"}
    delays = []

    for i, step in enumerate(steps):
        if "type" not in step:
            errors.append(f"Step {i + 1}: missing type")
            continue

        if step["type"] not in step_types:
            errors.append(f"Step {i + 1}: invalid type '{step['type']}'")

        if step["type"] == "email":
            if "subject" not in step or not step["subject"]:
                errors.append(f"Step {i + 1}: email subject required")
            if "body" not in step or not step["body"]:
                errors.append(f"Step {i + 1}: email body required")

        if step["type"] == "delay":
            delay_hours = step.get("delay_hours", step.get("delay", 24))
            if delay_hours < 1:
                errors.append(f"Step {i + 1}: delay must be at least 1 hour")
            if delay_hours > 720:
                errors.append(f"Step {i + 1}: delay cannot exceed 30 days")

        if step["type"] == "condition":
            if "condition" not in step:
                errors.append(f"Step {i + 1}: condition missing")

    return len(errors) == 0, errors


def validate_bulk_operation(ids: list, max_items: int = 1000) -> tuple[bool, Optional[str]]:
    if not ids or len(ids) == 0:
        return False, "No items provided"

    if len(ids) > max_items:
        return False, f"Too many items (max {max_items})"

    if len(ids) != len(set(ids)):
        return False, "Duplicate IDs detected"

    for id_val in ids:
        if not isinstance(id_val, int) or id_val <= 0:
            return False, f"Invalid ID: {id_val}"

    return True, None