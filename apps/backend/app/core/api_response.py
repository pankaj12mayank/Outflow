"""
Centralized API Response Standards
Production-grade response format with error handling
"""

from typing import Any, Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum
import traceback


class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    PENDING = "pending"


class ErrorCode(str, Enum):
    # Authentication
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_USER_INACTIVE = "AUTH_USER_INACTIVE"
    AUTH_ORGANIZATION_INACTIVE = "AUTH_ORGANIZATION_INACTIVE"
    AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED"
    AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_MISSING_FIELD = "VALIDATION_MISSING_FIELD"
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"
    
    # Database
    DB_CONNECTION_ERROR = "DB_CONNECTION_ERROR"
    DB_QUERY_ERROR = "DB_QUERY_ERROR"
    DB_NOT_FOUND = "DB_NOT_FOUND"
    
    # AI
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
    AI_MODEL_NOT_FOUND = "AI_MODEL_NOT_FOUND"
    AI_TIMEOUT = "AI_TIMEOUT"
    AI_QUOTA_EXCEEDED = "AI_QUOTA_EXCEEDED"
    
    # Scraping
    SCRAPING_BLOCKED = "SCRAPING_BLOCKED"
    SCRAPING_TIMEOUT = "SCRAPING_TIMEOUT"
    SCRAPING_INVALID_URL = "SCRAPING_INVALID_URL"
    SCRAPING_RATE_LIMITED = "SCRAPING_RATE_LIMITED"
    
    # Email/SMTP
    SMTP_CONNECTION_ERROR = "SMTP_CONNECTION_ERROR"
    SMTP_SEND_FAILED = "SMTP_SEND_FAILED"
    SMTP_INVALID_RECIPIENT = "SMTP_INVALID_RECIPIENT"
    SMTP_QUOTA_EXCEEDED = "SMTP_QUOTA_EXCEEDED"
    
    # Upload
    UPLOAD_FILE_TOO_LARGE = "UPLOAD_FILE_TOO_LARGE"
    UPLOAD_INVALID_TYPE = "UPLOAD_INVALID_TYPE"
    UPLOAD_STORAGE_ERROR = "UPLOAD_STORAGE_ERROR"
    
    # Polling
    POLLING_SERVICE_ERROR = "POLLING_SERVICE_ERROR"
    POLLING_TIMEOUT = "POLLING_TIMEOUT"
    
    # General
    INTERNAL_ERROR = "INTERNAL_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    RATE_LIMITED = "RATE_LIMITED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class ValidationErrorDetail(BaseModel):
    field: str
    message: str
    code: str


class APIError(BaseModel):
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    field_errors: Optional[List[ValidationErrorDetail]] = None
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class APIResponse(BaseModel):
    success: bool
    status: ResponseStatus
    message: Optional[str] = None
    data: Any = None
    error: Optional[APIError] = None
    meta: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        use_enum_values = True


class PaginatedMeta(BaseModel):
    page: int = 1
    per_page: int = 20
    total: int = 0
    total_pages: int = 0
    has_next: bool = False
    has_prev: bool = False


def success_response(
    data: Any = None,
    message: str = "Operation successful",
    meta: Dict[str, Any] = None,
    request_id: str = None
) -> Dict[str, Any]:
    """Create a successful API response"""
    return {
        "success": True,
        "status": ResponseStatus.SUCCESS,
        "message": message,
        "data": data,
        "error": None,
        "meta": meta,
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat()
    }


def error_response(
    code: ErrorCode,
    message: str,
    details: Dict[str, Any] = None,
    field_errors: List[Dict[str, str]] = None,
    request_id: str = None
) -> Dict[str, Any]:
    """Create an error API response"""
    error_obj = {
        "code": code.value,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if details:
        error_obj["details"] = details
    
    if field_errors:
        error_obj["field_errors"] = field_errors
    
    if request_id:
        error_obj["request_id"] = request_id

    return {
        "success": False,
        "status": ResponseStatus.ERROR,
        "message": message,
        "data": None,
        "error": error_obj,
        "meta": None,
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat()
    }


def paginated_response(
    data: List[Any],
    page: int = 1,
    per_page: int = 20,
    total: int = 0,
    request_id: str = None
) -> Dict[str, Any]:
    """Create a paginated API response"""
    total_pages = (total + per_page - 1) // per_page
    
    meta = {
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }
    
    return success_response(
        data=data,
        message=f"Retrieved {len(data)} items",
        meta=meta,
        request_id=request_id
    )


def handle_exception(exc: Exception, request_id: str = None) -> Dict[str, Any]:
    """Centralized exception handler"""
    # Get the source of the exception
    exc_type = type(exc).__name__
    exc_trace = traceback.format_exc()
    
    # Log the error
    from app.core.logging import app_logger
    app_logger.error(
        f"Unhandled exception: {exc_type}",
        exc=exc,
        request_id=request_id
    )
    
    # Return appropriate error response based on exception type
    if hasattr(exc, 'code') and hasattr(exc, 'message'):
        # It's already an API exception
        return error_response(
            code=exc.code,
            message=exc.message,
            details=getattr(exc, 'details', None),
            request_id=request_id
        )
    
    # Generic internal error
    return error_response(
        code=ErrorCode.INTERNAL_ERROR,
        message="An unexpected error occurred. Please try again later.",
        details={"type": exc_type} if request_id else None,
        request_id=request_id
    )