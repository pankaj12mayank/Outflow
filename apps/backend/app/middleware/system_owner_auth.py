import time
from typing import Callable, Optional
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.services.system_owner_auth_service import (
    SystemOwnerAuthService, RateLimitService
)


security = HTTPBearer(auto_error=False)


class SystemOwnerRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/v1/system-owner-auth"):
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        identifier = f"ip:{client_ip}"
        
        allowed = await RateLimitService.check_rate_limit(
            identifier, max_requests=10, window_seconds=60
        )
        
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded. Please try again later."}
            )
        
        response = await call_next(request)
        return response


async def get_current_system_owner(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    user = await SystemOwnerAuthService.validate_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return user


def require_system_owner(func: Callable):
    async def wrapper(*args, **kwargs):
        current_user = kwargs.get("current_user")
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="System Owner access required"
            )
        
        if current_user.get("role") != "system_owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="System Owner role required"
            )
        
        return await func(*args, **kwargs)
    
    return wrapper


class SystemOwnerAuthMiddleware:
    @staticmethod
    async def verify_request(request: Request) -> Optional[dict]:
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        return await SystemOwnerAuthService.validate_token(token)


async def log_security_event(event_type: str, details: dict):
    from datetime import datetime
    from app.db.mongodb import MongoDB
    
    MongoDB.get_collection("security_events").insert_one({
        "event_type": event_type,
        "details": details,
        "timestamp": datetime.utcnow()
    })


async def check_brute_force(email: str, ip_address: str) -> bool:
    from datetime import datetime, timedelta
    
    coll = MongoDB.get_collection("auth_logs")
    window_start = datetime.utcnow() - timedelta(minutes=15)
    
    failed_count = await coll.count_documents({
        "email": email,
        "action": "login",
        "status": "failed",
        "ip_address": ip_address,
        "timestamp": {"$gte": window_start}
    })
    
    if failed_count >= 10:
        await log_security_event("brute_force_detected", {
            "email": email,
            "ip_address": ip_address,
            "failed_attempts": failed_count
        })
        return False
    
    return True


async def verify_device_trust(user_id: str, device_id: str) -> bool:
    from app.db.mongodb import MongoDB
    
    device = await MongoDB.get_collection("devices").find_one({
        "user_id": user_id,
        "device_id": device_id
    })
    
    if not device:
        return False
    
    return device.get("is_trusted", False)


async def get_request_info(request: Request) -> dict:
    return {
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown"),
        "device_info": {
            "device_id": request.headers.get("x-device-id", "unknown"),
            "device_type": request.headers.get("x-device-type", "desktop"),
            "browser": request.headers.get("x-browser", "unknown"),
            "os": request.headers.get("x-os", "unknown")
        }
    }