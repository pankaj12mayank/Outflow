"""
System Owner Authentication API Endpoints
Enterprise-grade auth with JWT, refresh tokens, sessions, and security features.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.middleware.system_owner_auth import (
    get_current_system_owner, 
    require_system_owner,
    get_request_info,
    check_brute_force
)
from app.services.system_owner_auth_service import (
    SystemOwnerAuthService, RateLimitService
)
from app.models.system_owner_models import (
    LoginRequest, RefreshTokenRequest, LogoutRequest,
    ChangePasswordRequest, TokenResponse, SessionResponse,
    AuthLogResponse, ActivityLogResponse
)


router = APIRouter(prefix="/system-owner-auth", tags=["System Owner Auth"])


class LoginResponse(BaseModel):
    user: dict
    tokens: TokenResponse


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int


class DeviceResponse(BaseModel):
    id: str
    device_id: str
    device_type: str
    browser: str
    os: str
    ip_address: str
    location: Optional[str]
    last_seen: datetime
    is_trusted: bool
    is_current: bool


class AuthLogsResponse(BaseModel):
    logs: List[AuthLogResponse]
    total: int


class ActivityLogsResponse(BaseModel):
    logs: List[ActivityLogResponse]
    total: int


class MessageResponse(BaseModel):
    message: str
    success: bool = True


@router.post("/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest):
    """System Owner login with JWT authentication"""
    
    request_info = await get_request_info(request)
    
    allowed = await check_brute_force(login_data.email, request_info["ip_address"])
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later."
        )
    
    allowed = await RateLimitService.check_rate_limit(
        f"login:{login_data.email}", max_requests=5, window_seconds=300
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )
    
    try:
        result = await SystemOwnerAuthService.login(
            email=login_data.email,
            password=login_data.password,
            ip_address=request_info["ip_address"],
            user_agent=request_info["user_agent"],
            device_info=login_data.device_info or request_info["device_info"]
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    
    try:
        tokens = await SystemOwnerAuthService.refresh(refresh_data.refresh_token)
        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout")
async def logout(
    request: Request,
    logout_data: LogoutRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Logout and revoke sessions"""
    
    session_id = request.headers.get("x-session-id")
    
    await SystemOwnerAuthService.logout(
        user_id=current_user["user_id"],
        session_id=session_id,
        all_devices=logout_data.all_devices
    )
    
    return MessageResponse(message="Logged out successfully")


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_system_owner)):
    """Get current System Owner profile"""
    
    user = SystemOwnerAuthService.get_system_owner()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user["_id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "is_active": user["is_active"],
        "last_login_at": user.get("last_login_at"),
        "last_login_ip": user.get("last_login_ip"),
        "mfa_enabled": user.get("mfa_enabled", False)
    }


@router.get("/sessions", response_model=SessionListResponse)
async def get_sessions(current_user: dict = Depends(get_current_system_owner)):
    """Get all active sessions"""
    
    sessions = await SystemOwnerAuthService.get_sessions(current_user["user_id"])
    
    session_responses = [
        SessionResponse(
            id=session["_id"],
            device_info=session.get("device_info", {}),
            ip_address=session.get("ip_address", ""),
            issued_at=session.get("issued_at"),
            expires_at=session.get("expires_at"),
            last_activity=session.get("last_activity"),
            status=session.get("status", "active"),
            is_current=False
        )
        for session in sessions
    ]
    
    return SessionListResponse(
        sessions=session_responses,
        total=len(session_responses)
    )


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Revoke a specific session"""
    
    result = await SystemOwnerAuthService.revoke_session(
        user_id=current_user["user_id"],
        session_id=session_id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return MessageResponse(message="Session revoked successfully")


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(current_user: dict = Depends(get_current_system_owner)):
    """Revoke all sessions except current"""
    
    await SystemOwnerAuthService.logout(
        user_id=current_user["user_id"],
        all_devices=True
    )
    
    return MessageResponse(message="All sessions revoked successfully")


@router.get("/devices", response_model=List[DeviceResponse])
async def get_devices(current_user: dict = Depends(get_current_system_owner)):
    """Get all tracked devices"""
    
    devices = await SystemOwnerAuthService.get_devices(current_user["user_id"])
    
    return [
        DeviceResponse(
            id=device["_id"],
            device_id=device.get("device_id", ""),
            device_type=device.get("device_type", "desktop"),
            browser=device.get("browser", "unknown"),
            os=device.get("os", "unknown"),
            ip_address=device.get("ip_address", ""),
            location=device.get("location"),
            last_seen=device.get("last_seen"),
            is_trusted=device.get("is_trusted", False),
            is_current=device.get("is_current", False)
        )
        for device in devices
    ]


@router.post("/devices/{device_id}/trust")
async def trust_device(
    device_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Mark a device as trusted"""
    
    result = await SystemOwnerAuthService.trust_device(
        user_id=current_user["user_id"],
        device_id=device_id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return MessageResponse(message="Device marked as trusted")


@router.delete("/devices/{device_id}")
async def remove_device(
    device_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Remove a device from tracking"""
    
    from bson import ObjectId
    from app.db.mongodb import MongoDB
    
    result = MongoDB.get_collection("devices").delete_one({
        "_id": ObjectId(device_id),
        "user_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return MessageResponse(message="Device removed successfully")


@router.get("/auth-logs", response_model=AuthLogsResponse)
async def get_auth_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get authentication logs"""
    
    logs = await SystemOwnerAuthService.get_auth_logs(limit)
    
    log_responses = [
        AuthLogResponse(
            id=log["_id"],
            user_id=log.get("user_id"),
            email=log.get("email", ""),
            action=log.get("action", ""),
            status=log.get("status", ""),
            ip_address=log.get("ip_address", ""),
            timestamp=log.get("timestamp")
        )
        for log in logs
    ]
    
    return AuthLogsResponse(logs=log_responses, total=len(log_responses))


@router.get("/activity-logs", response_model=ActivityLogsResponse)
async def get_activity_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get activity logs"""
    
    logs = await SystemOwnerAuthService.get_activity_logs(
        current_user["user_id"], limit
    )
    
    log_responses = [
        ActivityLogResponse(
            id=log["_id"],
            user_id=log.get("user_id", ""),
            action=log.get("action", ""),
            resource_type=log.get("resource_type"),
            resource_id=log.get("resource_id"),
            ip_address=log.get("ip_address", ""),
            timestamp=log.get("timestamp")
        )
        for log in logs
    ]
    
    return ActivityLogsResponse(logs=log_responses, total=len(log_responses))


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Change System Owner password"""
    
    try:
        result = await SystemOwnerAuthService.change_password(
            user_id=current_user["user_id"],
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        
        if result:
            return MessageResponse(message="Password changed successfully")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/security-status")
async def get_security_status(current_user: dict = Depends(get_current_system_owner)):
    """Get security status overview"""
    
    user = SystemOwnerAuthService.get_system_owner()
    sessions = await SystemOwnerAuthService.get_sessions(current_user["user_id"])
    devices = await SystemOwnerAuthService.get_devices(current_user["user_id"])
    auth_logs = await SystemOwnerAuthService.get_auth_logs(10)
    
    failed_logins = sum(1 for log in auth_logs if log.get("status") == "failed")
    
    return {
        "account": {
            "is_active": user.get("is_active", True) if user else False,
            "mfa_enabled": user.get("mfa_enabled", False) if user else False,
            "failed_login_attempts": user.get("failed_login_attempts", 0) if user else 0,
            "last_login_at": user.get("last_login_at") if user else None,
            "last_login_ip": user.get("last_login_ip") if user else None
        },
        "sessions": {
            "active": len(sessions),
            "total": len(sessions)
        },
        "devices": {
            "total": len(devices),
            "trusted": sum(1 for d in devices if d.get("is_trusted"))
        },
        "recent_failed_logins": failed_logins
    }


@router.post("/init")
async def init_system_owner():
    """Initialize System Owner (run once during setup)"""
    
    try:
        user = SystemOwnerAuthService.initialize_system_owner()
        return {
            "message": "System Owner initialized successfully",
            "email": user["email"]
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )