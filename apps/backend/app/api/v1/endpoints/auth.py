"""
Authentication API Endpoints (MongoDB)
Fixed: Import conflicts, consistent error handling, type safety
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime

from app.services.auth_service import AuthService, AUTH_CONFIG
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=100)
    organization_name: str = Field(..., min_length=1, max_length=100)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_email_verified: bool
    is_super_admin: bool
    organization: Optional[dict] = None
    permissions: List[str] = []
    created_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerifyRequest(BaseModel):
    token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=status.HTTP_201_CREATED, 
              summary="Register new user")
async def register(data: RegisterRequest, request: Request):
    """Register new user with organization."""
    try:
        auth_service = AuthService()
        result = await auth_service.register(data.model_dump(), request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/login", response_model=AuthResponse, summary="Login with email and password")
async def login(data: LoginRequest, request: Request):
    """Login with email and password."""
    auth_service = AuthService()
    try:
        result = await auth_service.login({"email": data.email, "password": data.password}, request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout and invalidate session")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Logout and invalidate session."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    auth_service = AuthService()
    await auth_service.logout(current_user["sub"], token, request)
    return None


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh_token(data: RefreshTokenRequest):
    """Refresh access token using refresh token."""
    try:
        auth_service = AuthService()
        tokens = await auth_service.refresh_tokens(data.refresh_token)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token refresh failed")


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
async def get_me(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    try:
        auth_service = AuthService()
        user = await auth_service.get_current_user(token)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/change-password", status_code=status.HTTP_200_OK, summary="Change password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user password."""
    auth_service = AuthService()
    try:
        await auth_service.change_password(current_user["sub"], data.current_password, data.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/forgot-password", status_code=status.HTTP_200_OK, summary="Request password reset")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset email."""
    from app.core.config import settings
    auth_service = AuthService()
    try:
        result = await auth_service.request_password_reset(data.email)
        response = {"message": result.get("message", "Password reset email sent if account exists")}
        if settings.debug and result.get("reset_url"):
            response["reset_url"] = result["reset_url"]
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reset-password", status_code=status.HTTP_200_OK, summary="Reset password with token")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token from email."""
    auth_service = AuthService()
    try:
        await auth_service.reset_password(data.token, data.new_password)
        return {"message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-email", status_code=status.HTTP_200_OK, summary="Verify email address")
async def verify_email(data: VerifyEmailRequest, current_user: dict = Depends(get_current_user)):
    """Verify email address with token."""
    auth_service = AuthService()
    try:
        await auth_service.verify_email(current_user["sub"], data.token)
        return {"message": "Email verified successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/magic-link", status_code=status.HTTP_200_OK, summary="Request magic link")
async def request_magic_link(data: MagicLinkRequest):
    """Request magic link for passwordless login."""
    auth_service = AuthService()
    try:
        await auth_service.request_magic_link(data.email)
        return {"message": "Magic link sent if account exists"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/magic-link/verify", response_model=AuthResponse, summary="Verify magic link")
async def verify_magic_link(data: MagicLinkVerifyRequest, request: Request):
    """Verify magic link and get tokens."""
    auth_service = AuthService()
    try:
        result = await auth_service.verify_magic_link(data.token, request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/health", summary="Auth service health check")
async def auth_health():
    """Auth service health check."""
    return {
        "status": "healthy",
        "rate_limit": AUTH_CONFIG["RATE_LIMIT_MAX_REQUESTS"],
        "lockout_duration": AUTH_CONFIG["LOCKOUT_DURATION_MINUTES"],
    }


@router.get("/sessions", summary="Get active sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Get all active sessions for current user."""
    auth_service = AuthService()
    try:
        sessions = await auth_service.get_user_sessions(current_user["sub"])
        return {"sessions": sessions}
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch sessions")


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke session")
async def revoke_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Revoke a specific session."""
    auth_service = AuthService()
    try:
        await auth_service.revoke_session(current_user["sub"], session_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))