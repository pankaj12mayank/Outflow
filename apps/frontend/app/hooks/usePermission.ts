"use client";

import { useAuth } from "./useAuth";

export type Role = "system_owner" | "organization_admin" | "team_member";

export interface UserRole {
  role: Role;
  permissions: string[];
  organization_id?: string;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  system_owner: 3,
  organization_admin: 2,
  team_member: 1,
};

const PERMISSIONS: Record<string, string[]> = {
  system_owner: [
    "organizations:read", "organizations:create", "organizations:update", "organizations:delete",
    "plans:read", "plans:create", "plans:update", "plans:delete",
    "pricing:read", "pricing:create", "pricing:update", "pricing:delete",
    "smtp:read", "smtp:create", "smtp:update", "smtp:delete",
    "cms:read", "cms:create", "cms:update", "cms:delete",
    "analytics:read", "analytics:export",
    "invoices:read", "invoices:create", "invoices:update",
    "features:read", "features:create", "features:update", "features:delete",
    "billing:read", "billing:update",
    "teams:read", "teams:create", "teams:update", "teams:delete",
    "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
    "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
    "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
    "settings:read", "settings:update",
    "users:read", "users:create", "users:update", "users:delete",
  ],
  organization_admin: [
    "organizations:read",
    "analytics:read", "analytics:export",
    "invoices:read",
    "features:read",
    "billing:read", "billing:update",
    "teams:read", "teams:create", "teams:update", "teams:delete",
    "leads:read", "leads:create", "leads:update", "leads:delete", "leads:enrich",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:start", "campaigns:pause",
    "sequences:read", "sequences:create", "sequences:update", "sequences:delete",
    "scraping:read", "scraping:create", "scraping:update", "scraping:delete",
    "settings:read", "settings:update",
  ],
  team_member: [
    "teams:read",
    "leads:read", "leads:create", "leads:update",
    "campaigns:read",
    "sequences:read",
    "scraping:read",
    "settings:read",
  ],
};

export function usePermission() {
  const { user } = useAuth();
  
  const role = (user?.role as Role) || "team_member";
  const permissions = user?.permissions || PERMISSIONS[role] || [];

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

export function getPermissionsForRole(role: Role): string[] {
  return PERMISSIONS[role] || [];
}