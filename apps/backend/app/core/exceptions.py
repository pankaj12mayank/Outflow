from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from typing import Optional, Any, Generic, TypeVar
from datetime import datetime
import traceback
import sys

from app.core.logging import app_logger, api_logger

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional["ErrorDetail"] = None
    meta: Optional["ResponseMeta"] = None

    class Config:
        json_schema_extra = {"example": {"success": True, "data": {}, "error": None}}


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: Optional[str] = None
    field: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    request_id: Optional[str] = None


class ResponseMeta(BaseModel):
    page: Optional[int] = None
    limit: Optional[int] = None
    total: Optional[int] = None
    version: Optional[str] = None


def success_response(data: Any = None, meta: Optional[dict] = None) -> dict:
    return {
        "success": True,
        "data": data,
        "error": None,
        "meta": meta,
    }


def error_response(
    code: str,
    message: str,
    detail: Optional[str] = None,
    field: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "detail": detail,
            "field": field,
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id,
        },
        "meta": None,
    }


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        detail: Optional[str] = None,
        field: Optional[str] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.detail = detail
        self.field = field
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, resource: str, identifier: Any = None):
        msg = f"{resource} not found"
        if identifier:
            msg += f" (id: {identifier})"
        super().__init__(
            code="NOT_FOUND",
            message=msg,
            status_code=404,
        )


class ValidationException(AppException):
    def __init__(self, message: str, field: Optional[str] = None, detail: Optional[str] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
            field=field,
            detail=detail,
        )


class AuthenticationException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            code="AUTHENTICATION_ERROR",
            message=message,
            status_code=401,
        )


class AuthorizationException(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            code="AUTHORIZATION_ERROR",
            message=message,
            status_code=403,
        )


class RateLimitException(AppException):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message=message,
            status_code=429,
        )
        self.retry_after = retry_after


class ExternalServiceException(AppException):
    def __init__(
        self,
        service: str,
        message: str,
        status_code: int = 502,
        detail: Optional[str] = None,
    ):
        super().__init__(
            code=f"{service.upper()}_ERROR",
            message=f"{service} service error: {message}",
            status_code=status_code,
            detail=detail,
        )


class ScrapingException(AppException):
    def __init__(self, url: str, message: str, status_code: int = 422):
        super().__init__(
            code="SCRAPING_ERROR",
            message=f"Scraping failed for {url}: {message}",
            status_code=status_code,
            detail=url,
        )


class EmailException(AppException):
    def __init__(self, to_email: str, message: str, status_code: int = 500):
        super().__init__(
            code="EMAIL_ERROR",
            message=f"Email failed to {to_email}: {message}",
            status_code=status_code,
            detail=to_email,
        )


class AIException(AppException):
    def __init__(self, model: str, message: str, status_code: int = 503):
        super().__init__(
            code="AI_ERROR",
            message=f"AI error ({model}): {message}",
            status_code=status_code,
            detail=model,
        )


class DatabaseException(AppException):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(
            code="DATABASE_ERROR",
            message=f"Database error: {message}",
            status_code=status_code,
        )


class ConflictException(AppException):
    def __init__(self, message: str, resource: Optional[str] = None):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=409,
            detail=resource,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", "unknown")
    app_logger.error(
        f"AppException: {exc.code}",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail,
        field=exc.field,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            code=exc.code,
            message=exc.message,
            detail=exc.detail,
            field=exc.field,
            request_id=request_id,
        ),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", "unknown")
    api_logger.error(
        f"HTTPException: {exc.status_code}",
        path=request.url.path,
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail) if isinstance(exc.detail, str) else "HTTP error",
            request_id=request_id,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", "unknown")
    errors = exc.errors()
    api_logger.warning(
        f"ValidationError: {len(errors)} field(s)",
        path=request.url.path,
        method=request.method,
        errors=errors,
    )

    first_error = errors[0] if errors else {}
    first_loc = first_error.get("loc", [])
    field = first_loc[-1] if first_loc and isinstance(first_loc[-1], str) else None

    return JSONResponse(
        status_code=422,
        content=error_response(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            detail=first_error.get("msg", ""),
            field=field,
            request_id=request_id,
        ),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", "unknown")
    app_logger.critical(
        f"Unhandled exception: {type(exc).__name__}",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        exception=traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content=error_response(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
            detail=sys.exc_info()[0].__name__ if request.app.debug else None,
            request_id=request_id,
        ),
    )