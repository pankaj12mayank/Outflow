from typing import List, Optional, Callable
from functools import wraps
from fastapi import HTTPException, status, Request, Depends
from app.services.rbac_service import RoleService, RBACService, FeatureToggleService
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
            user["role"] = primary_role.get("role")
            user["permissions"] = primary_role.get("permissions", [])
            user["organization_id"] = primary_role.get("organization_id")
        else:
            user["role"] = Role.TEAM_MEMBER.value
            user["permissions"] = RBACService.get_permissions_for_role(Role.TEAM_MEMBER)
        
        user["all_roles"] = user_roles
        
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


def require_permissions(required_permissions: List[str]):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("current_user") or kwargs.get("request")
            
            if not request:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            
            user_permissions = request.get("permissions", [])
            
            if "*" in user_permissions:
                return await func(*args, **kwargs)
            
            has_permission = RBACService.has_any_permission(user_permissions, required_permissions)
            
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permissions: {', '.join(required_permissions)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(required_role: Role):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            
            user_role = current_user.get("role")
            
            role_hierarchy = {
                Role.SYSTEM_OWNER: 3,
                Role.ORGANIZATION_ADMIN: 2,
                Role.TEAM_MEMBER: 1,
            }
            
            user_level = role_hierarchy.get(Role(user_role), 0)
            required_level = role_hierarchy.get(required_role, 0)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{required_role.value}' required. Current role: '{user_role}'"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_feature(feature_key: str):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            
            user_role = Role(current_user.get("role", Role.TEAM_MEMBER.value))
            organization_id = current_user.get("organization_id")
            
            is_enabled = await FeatureToggleService.is_feature_enabled(
                feature_key, user_role, organization_id
            )
            
            if not is_enabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Feature '{feature_key}' is not enabled"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def check_permission(user_permissions: List[str], permission: str) -> bool:
    return RBACService.has_permission(user_permissions, permission)


async def check_any_permission(user_permissions: List[str], permissions: List[str]) -> bool:
    return RBACService.has_any_permission(user_permissions, permissions)


async def check_all_permissions(user_permissions: List[str], permissions: List[str]) -> bool:
    return RBACService.has_all_permissions(user_permissions, permissions)