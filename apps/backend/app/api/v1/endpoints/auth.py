"""
Authentication API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from app.services.auth_service import AuthService, AUTH_CONFIG
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)
    organization_name: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
    organization: Optional[dict]
    created_at: Optional[str]


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class SessionResponse(BaseModel):
    id: str
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    ip_address: Optional[str]
    created_at: str
    expires_at: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, request: Request):
    """Register new user with organization."""
    try:
        auth_service = AuthService()
        result = await auth_service.register(data.model_dump(), request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, request: Request):
    """Login with email and password."""
    try:
        auth_service = AuthService()
        result = await auth_service.login(data.model_dump(), request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Logout and invalidate session."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    auth_service = AuthService()
    await auth_service.logout(current_user["sub"], token, request)
    return None


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token."""
    try:
        auth_service = AuthService()
        tokens = await auth_service.refresh_tokens(refresh_token)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=UserResponse)
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


@router.get("/health")
async def auth_health():
    """Auth service health check."""
    return {
        "status": "healthy",
        "rate_limit": AUTH_CONFIG["RATE_LIMIT_MAX_REQUESTS"],
        "lockout_duration": AUTH_CONFIG["LOCKOUT_DURATION_MINUTES"],
    }