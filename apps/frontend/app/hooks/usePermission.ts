"use client";

import { useAuth, getPermissionsForRole as getAuthPermissions, normalizeRole } from "./useAuth";

export type Role = "system_owner" | "organization_admin" | "team_member";

export interface UserRole {
  role: Role;
  permissions: string[];
  organization_id?: string;
}

export function getPermissionsForRole(role: Role): string[] {
  return getAuthPermissions(role);
}

const ROLE_HIERARCHY: Record<Role, number> = {
  system_owner: 3,
  organization_admin: 2,
  team_member: 1,
};

export function usePermission() {
  const { user } = useAuth();
  
  const role = (normalizeRole(user?.role) as Role) || "team_member";
  const permissions = user?.permissions?.length ? user.permissions : getAuthPermissions(role);

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes("*")) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (permissions.includes("*")) return true;
    return requiredPermissions.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (permissions.includes("*")) return true;
    return requiredPermissions.every((p) => permissions.includes(p));
  };

  const hasRole = (requiredRole: Role): boolean => {
    const userLevel = ROLE_HIERARCHY[role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  };

  const isSystemOwner = (): boolean => role === "system_owner";
  const isOrganizationAdmin = (): boolean => role === "organization_admin";
  const isTeamMember = (): boolean => role === "team_member";

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSystemOwner,
    isOrganizationAdmin,
    isTeamMember,
  };
}