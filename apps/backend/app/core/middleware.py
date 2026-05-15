import time
import uuid
import json
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging import api_logger, app_logger
from app.core.exceptions import RateLimitException


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            api_logger.log_api(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
                user_id=getattr(request.state, "user_id", None),
                request_id=request_id,
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{round(duration_ms, 2)}ms"

            return response

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            api_logger.error(
                f"Request failed: {request.method} {request.url.path}",
                exc=exc,
                duration_ms=round(duration_ms, 2),
                request_id=request_id,
            )
            raise


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")
            app_logger.critical(
                f"Middleware exception: {type(exc).__name__}",
                exc=exc,
                path=request.url.path,
                method=request.method,
                request_id=request_id,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "data": None,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "An unexpected error occurred",
                        "request_id": request_id,
                    },
                },
            )


class RateLimitMiddleware(BaseHTTPMiddleware):
    _request_counts: dict[str, list[float]] = {}
    _lock_enabled: bool = False

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        exempt_paths = ["/api/v1/health", "/api/v1/auth/health", "/docs", "/openapi.json", "/redoc"]
        if any(path.startswith(p) for p in exempt_paths):
            return await call_next(request)

        if path.startswith("/api/v1/auth/"):
            key = f"auth:{client_ip}"
        elif path.startswith("/api/v1/"):
            user_id = getattr(request.state, "user_id", client_ip)
            key = f"api:{user_id}"
        else:
            key = f"public:{client_ip}"

        now = time.time()
        window = 60

        if key not in RateLimitMiddleware._request_counts:
            RateLimitMiddleware._request_counts[key] = []

        RateLimitMiddleware._request_counts[key] = [
            t for t in RateLimitMiddleware._request_counts[key] if t > now - window
        ]

        limits = {"auth:": 20, "api:": 200, "public:": 100}
        limit = next((v for k, v in limits.items() if key.startswith(k)), 100)

        if len(RateLimitMiddleware._request_counts[key]) >= limit:
            app_logger.warning(f"Rate limit exceeded for {key}", count=len(RateLimitMiddleware._request_counts[key]))
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "data": None,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please slow down.",
                        "retry_after": 60,
                    },
                },
                headers={"Retry-After": "60"},
            )

        RateLimitMiddleware._request_counts[key].append(now)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(limit - len(RateLimitMiddleware._request_counts[key]))

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


def register_middlewares(app: ASGIApp):
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)