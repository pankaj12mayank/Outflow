from functools import wraps
from fastapi import HTTPException
from typing import Callable, Any
import re

from app.core.exceptions import ValidationException
from app.core.validation import (
    validate_email, validate_url, validate_linkedin_url,
    validate_phone, validate_lead_data, validate_campaign_data,
    validate_scraping_url, validate_csv_content, validate_email_content,
    validate_sequence_steps, validate_bulk_operation,
)

def validate_schema(schema_class):
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            for arg in args:
                if isinstance(arg, schema_class):
                    arg.model_validate(arg.model_dump())
            return await fn(*args, **kwargs)
        return wrapper
    return decorator


def require_organization(fn: Callable) -> Callable:
    @wraps(fn)
    async def wrapper(*args, **kwargs):
        from fastapi import Request
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        if request:
            user = getattr(request.state, "user", None)
            if not user or not getattr(user, "organization_id", None):
                raise HTTPException(status_code=403, detail="Organization required")
        return await fn(*args, **kwargs)
    return wrapper


def validate_email_field(email: str, field_name: str = "email"):
    if not validate_email(email):
        raise HTTPException(status_code=422, detail=f"Invalid {field_name} format")


def validate_url_field(url: str, field_name: str = "url"):
    if not validate_url(url):
        raise HTTPException(status_code=422, detail=f"Invalid {field_name} format")


def validate_linkedin_url_field(url: str):
    if not validate_linkedin_url(url):
        raise HTTPException(status_code=422, detail="Invalid LinkedIn URL")


def validate_lead(lead_data: dict):
    valid, errors = validate_lead_data(lead_data)
    if not valid:
        raise HTTPException(status_code=422, detail={"errors": errors})


def validate_campaign(campaign_data: dict):
    valid, errors = validate_campaign_data(campaign_data)
    if not valid:
        raise HTTPException(status_code=422, detail={"errors": errors})


def validate_scraping_url_safe(url: str):
    valid, error = validate_scraping_url(url)
    if not valid:
        raise HTTPException(status_code=422, detail=error)


def validate_csv(content: bytes):
    valid, error = validate_csv_content(content)
    if not valid:
        raise HTTPException(status_code=422, detail=error)


def validate_email_composition(subject: str, body: str):
    valid, errors = validate_email_content(subject, body)
    if not valid:
        raise HTTPException(status_code=422, detail={"errors": errors})


def validate_sequence(sequence_data: list):
    valid, errors = validate_sequence_steps(sequence_data)
    if not valid:
        raise HTTPException(status_code=422, detail={"errors": errors})


def validate_bulk(bulk_ids: list, max_items: int = 1000):
    valid, error = validate_bulk_operation(bulk_ids, max_items)
    if not valid:
        raise HTTPException(status_code=422, detail=error)


def rate_limit_resource(resource: str, limit: int, window: int = 60):
    _rate_limits: dict[str, list[float]] = {}

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            from fastapi import Request
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            client_ip = "unknown"
            if request and request.client:
                client_ip = request.client.host

            key = f"{resource}:{client_ip}"
            now = __import__("time").time()

            if key not in _rate_limits:
                _rate_limits[key] = []

            _rate_limits[key] = [t for t in _rate_limits[key] if t > now - window]

            if len(_rate_limits[key]) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded for {resource}. Try again in {window}s.",
                )

            _rate_limits[key].append(now)
            return await fn(*args, **kwargs)
        return wrapper
    return decorator


def sanitize_user_input(value: str, max_length: int = 1000) -> str:
    if not value:
        return ""
    cleaned = value.strip()[:max_length]
    dangerous_patterns = ["<script", "javascript:", "onerror=", "onclick="]
    for pattern in dangerous_patterns:
        if pattern.lower() in cleaned.lower():
            return re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned


def validate_pagination(page: int, limit: int, max_limit: int = 100):
    if page < 1:
        raise HTTPException(status_code=422, detail="Page must be >= 1")
    if limit < 1 or limit > max_limit:
        raise HTTPException(status_code=422, detail=f"Limit must be between 1 and {max_limit}")
    return True


def validate_id(id_value: Any, field_name: str = "id"):
    if id_value is None:
        raise HTTPException(status_code=422, detail=f"{field_name} is required")
    try:
        int_id = int(id_value)
        if int_id <= 0:
            raise HTTPException(status_code=422, detail=f"{field_name} must be positive")
        return int_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail=f"Invalid {field_name} format")