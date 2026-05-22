"use client";

import { ReactNode } from "react";
import { usePermission } from "@/app/hooks/usePermission";

interface CanProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  fallback?: ReactNode;
}

/** Render children only when the current user has the required permission(s). */
export function Can({ children, permission, permissions, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission } = usePermission();

  const allowed = permission
    ? hasPermission(permission)
    : permissions?.length
      ? hasAnyPermission(permissions)
      : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
