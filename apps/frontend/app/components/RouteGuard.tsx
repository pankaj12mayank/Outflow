"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { usePermission, Role } from "../hooks/usePermission";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/button";

interface RouteGuardConfig {
  requiredPermissions?: string[];
  requiredRole?: Role;
  redirectTo?: string;
}

/** Longest-prefix match for CRM /app routes (L14). */
export const crmRoutePermissions: Record<string, RouteGuardConfig> = {
  "/app/admin/organizations": { requiredRole: "system_owner" },
  "/app/admin/plans": { requiredRole: "system_owner" },
  "/app/admin/features": { requiredRole: "system_owner" },
  "/app/analytics": { requiredPermissions: ["analytics:read"] },
  "/app/billing": { requiredPermissions: ["billing:read"] },
  "/app/team": { requiredPermissions: ["teams:read"] },
  "/app/sequences": { requiredPermissions: ["sequences:read"] },
  "/app/campaigns": { requiredPermissions: ["campaigns:read"] },
  "/app/leads": { requiredPermissions: ["leads:read"] },
  "/app/scraping": { requiredPermissions: ["scraping:read"] },
};

const routePermissions = crmRoutePermissions;

function matchRouteConfig(pathname: string): RouteGuardConfig | null {
  const paths = Object.keys(crmRoutePermissions).sort((a, b) => b.length - a.length);
  for (const path of paths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return crmRoutePermissions[path];
    }
  }
  return null;
}

function checkRouteAccess(
  pathname: string,
  hasPermission: (p: string) => boolean,
  hasRole: (r: Role) => boolean
): boolean {
  const config = matchRouteConfig(pathname);
  if (!config) return true;
  if (config.requiredRole && !hasRole(config.requiredRole)) return false;
  if (config.requiredPermissions?.length) {
    return config.requiredPermissions.some((p) => hasPermission(p));
  }
  return true;
}

/** Blocks CRM pages when the user lacks route permissions; redirects unauthenticated users to login. */
export function CrmRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission, hasRole } = usePermission();

  const allowed = useMemo(
    () => checkRouteAccess(pathname, hasPermission, hasRole),
    [pathname, hasPermission, hasRole]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
        <Shield className="w-12 h-12 text-yellow-400" />
        <h2 className="text-xl font-bold">Access restricted</h2>
        <p className="text-gray-400 max-w-md text-sm">
          Your role does not include permission to view this page. Contact your organization admin if you need access.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

export function useRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, hasRole } = usePermission();

  const checkAccess = (): boolean => checkRouteAccess(pathname, hasPermission, hasRole);

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