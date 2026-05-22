"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission, Role } from "../hooks/usePermission";

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRole?: Role;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  requiredPermissions = [],
  requiredRole,
  fallback = null,
  redirectTo = "/app/dashboard",
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasAnyPermission, hasRole } = usePermission();

  const roleOk = !requiredRole || hasRole(requiredRole);
  const permOk =
    requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions);
  const allowed = roleOk && permOk;

  useEffect(() => {
    if (!allowed && !fallback) {
      router.replace(redirectTo);
    }
  }, [allowed, fallback, redirectTo, router]);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { role } = usePermission();

  if (!allowedRoles.includes(role as Role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface SystemOwnerOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SystemOwnerOnly({ children, fallback = null }: SystemOwnerOnlyProps) {
  const { isSystemOwner } = usePermission();

  if (!isSystemOwner()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { hasRole } = usePermission();

  if (!hasRole("organization_admin")) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}