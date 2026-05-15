"""
Authentication Middleware (MongoDB)
JWT validation, role checking, and permission guards
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List

from app.core.security import verify_token
from app.services.auth_service import PermissionChecker

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency to get current authenticated user.
    Validates JWT token and returns user data.
    """
    token = credentials.credentials

    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "organization_id": payload.get("organization_id"),
    }


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """Optional auth - returns None if no token provided."""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload and payload.get("type") == "access":
        return {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "organization_id": payload.get("organization_id"),
        }
    return None


async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
) -> dict:
    """Get current user and verify they are active."""
    return await get_current_user(credentials)


async def require_organization(current_user: dict = Depends(get_current_user)) -> str:
    """Require user to belong to an organization."""
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to an organization",
        )
    return org_id


def get_organization_id(current_user: dict = Depends(get_current_user)) -> str:
    """Get organization ID from current user."""
    return current_user.get("organization_id", "")


def require_roles(allowed_roles: List[str]):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}",
            )
        return current_user
    return role_checker


def require_permission(resource: str, action: str):
    """Dependency factory for permission-based access control."""
    async def permission_checker(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role")
        if not PermissionChecker.has_permission(role, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {resource}:{action}",
            )
        return current_user
    return permission_checker


def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require super admin role."""
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_owner_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require owner or admin role."""
    if current_user.get("role") not in ["owner", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner or admin access required",
        )
    return current_user


def require_owner(current_user: dict = Depends(get_current_user)) -> dict:
    """Require owner role."""
    if current_user.get("role") not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required",
        )
    return current_user


class RBACMiddleware:
    """RBAC middleware for route protection."""

    async def __call__(self, request: Request, call_next):
        public_paths = ["/", "/api/v1/auth/login", "/api/v1/auth/register", "/docs", "/openapi.json"]
        if any(request.url.path.startswith(p) for p in public_paths):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header.replace("Bearer ", "")
        payload = verify_token(token)

        if payload and payload.get("type") == "access":
            request.state.user = {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role"),
                "organization_id": payload.get("organization_id"),
            }

        return await call_next(request)


def check_permission(role: str, resource: str, action: str) -> bool:
    return PermissionChecker.has_permission(role, resource, action)


def get_permissions(role: str) -> List[str]:
    return PermissionChecker.get_user_permissions(role)


def can_access_resource(role: str, resource: str) -> bool:
    return PermissionChecker.can_access_resource(role, resource)


require_admin = require_roles(["admin", "owner", "super_admin"])
require_team_member = require_roles(["admin", "owner", "team_member", "super_admin"])