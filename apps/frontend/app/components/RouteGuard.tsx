"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermission, Role } from "../hooks/usePermission";

interface RouteGuardConfig {
  requiredPermissions?: string[];
  requiredRole?: Role;
  redirectTo?: string;
}

const routePermissions: Record<string, RouteGuardConfig> = {
  "/app/admin/organizations": { requiredRole: "system_owner" },
  "/app/admin/plans": { requiredRole: "system_owner" },
  "/app/admin/features": { requiredRole: "system_owner" },
  "/app/team": { requiredPermissions: ["teams:read"] },
  "/app/billing": { requiredPermissions: ["billing:read"] },
  "/app/campaigns": { requiredPermissions: ["campaigns:read"] },
  "/app/leads": { requiredPermissions: ["leads:read"] },
  "/app/scraping": { requiredPermissions: ["scraping:read"] },
  "/app/analytics": { requiredPermissions: ["analytics:read"] },
};

export function useRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, hasRole } = usePermission();

  const checkAccess = (): boolean => {
    for (const [path, config] of Object.entries(routePermissions)) {
      if (pathname.startsWith(path)) {
        if (config.requiredRole && !hasRole(config.requiredRole)) {
          return false;
        }

        if (config.requiredPermissions) {
          const hasAccess = config.requiredPermissions.some((p) => hasPermission(p));
          if (!hasAccess) {
            return false;
          }
        }
      }
    }
    return true;
  };

  return { checkAccess };
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRole,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: Role;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { hasPermission, hasRole, isSystemOwner } = usePermission();

  useEffect(() => {
    if (requiredRole && !hasRole(requiredRole)) {
      router.push(redirectTo);
      return;
    }

    if (requiredPermissions.length > 0) {
      const hasAccess = requiredPermissions.some((p) => hasPermission(p));
      if (!hasAccess) {
        router.push(redirectTo);
      }
    }
  }, [requiredPermissions, requiredRole, redirectTo, router, hasPermission, hasRole]);

  if (requiredRole && !hasRole(requiredRole)) {
    return null;
  }

  if (requiredPermissions.length > 0) {
    const hasAccess = requiredPermissions.some((p) => hasPermission(p));
    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}