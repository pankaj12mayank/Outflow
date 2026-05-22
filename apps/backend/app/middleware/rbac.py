"""
RBAC helpers for system-owner and DB-backed role lookups.

Prefer app.middleware.auth.require_permission() / require_roles() for org app routes.
Use require_permissions() here when loading permissions from RoleService collections.
"""

from typing import List, Optional, Callable
from functools import wraps
from fastapi import HTTPException, status, Request, Depends
from app.services.rbac_service import RoleService, RBACService, FeatureToggleService
from app.services.auth_service import PermissionChecker, normalize_role
from app.models.rbac_models import Role


class RBACMiddleware:
    @staticmethod
    async def get_user_permissions(user_id: str, organization_id: Optional[str] = None) -> List[str]:
        user_role = await RoleService.get_user_role(user_id, organization_id)
        if user_role:
            return user_role.get("permissions", [])
        
        user_roles = await RoleService.get_user_roles(user_id)
        all_permissions = set()
        for ur in user_roles:
            all_permissions.update(ur.get("permissions", []))
        
        return list(all_permissions)


async def get_current_user_with_role(request: Request):
    from app.middleware import get_current_user
    
    try:
        user = await get_current_user(request)
        user_roles = await RoleService.get_user_roles(user.get("sub"))
        
        if user_roles:
            primary_role = user_roles[0]
            user["role"] = normalize_role(primary_role.get("role"))
            user["permissions"] = primary_role.get("permissions") or PermissionChecker.get_user_permissions(
                user["role"]
            )
            user["organization_id"] = primary_role.get("organization_id")
        else:
            role = normalize_role(user.get("role"))
            user["role"] = role
            user["permissions"] = PermissionChecker.get_user_permissions(role)
        
        user["all_roles"] = user_roles
        
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


async def _check_permissions(current_user: dict, required_permissions: List[str]):
    user_permissions = current_user.get("permissions", [])
    if "*" in user_permissions:
        return current_user
    if not RBACService.has_any_permission(user_permissions, required_permissions):
        raise HTTPException(403, detail=f"Missing required permissions: {', '.join(required_permissions)}")
    return current_user


async def _check_role(current_user: dict, required_role: Role):
    user_role = current_user.get("role")
    role_hierarchy = {
        Role.SYSTEM_OWNER: 3,
        Role.ORGANIZATION_ADMIN: 2,
        Role.TEAM_MEMBER: 1,
    }
    user_level = role_hierarchy.get(Role(user_role), 0)
    required_level = role_hierarchy.get(required_role, 0)
    if user_level < required_level:
        raise HTTPException(403, detail=f"Role '{required_role.value}' required. Current role: '{user_role}'")
    return current_user


async def _check_feature(current_user: dict, feature_key: str):
    user_role = Role(current_user.get("role", Role.TEAM_MEMBER.value))
    is_enabled = await FeatureToggleService.is_feature_enabled(feature_key, user_role, current_user.get("organization_id"))
    if not is_enabled:
        raise HTTPException(403, detail=f"Feature '{feature_key}' is not enabled")
    return current_user


def require_permissions(required_permissions: List[str]):
    async def dependency(current_user: dict = Depends(get_current_user_with_role)):
        return await _check_permissions(current_user, required_permissions)
    return dependency


def require_role(required_role: Role):
    async def dependency(current_user: dict = Depends(get_current_user_with_role)):
        return await _check_role(current_user, required_role)
    return dependency


def require_feature(feature_key: str):
    async def dependency(current_user: dict = Depends(get_current_user_with_role)):
        return await _check_feature(current_user, feature_key)
    return dependency


async def check_permission(user_permissions: List[str], permission: str) -> bool:
    return RBACService.has_permission(user_permissions, permission)


async def check_any_permission(user_permissions: List[str], permissions: List[str]) -> bool:
    return RBACService.has_any_permission(user_permissions, permissions)


async def check_all_permissions(user_permissions: List[str], permissions: List[str]) -> bool:
    return RBACService.has_all_permissions(user_permissions, permissions)