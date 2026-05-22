"use client";

import { AppLayout } from "@/app/components/sidebar";
import { AuthProviders } from "@/app/providers/auth-providers";
import { CrmRouteGuard } from "@/app/components/RouteGuard";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <AppLayout>
        <CrmRouteGuard>{children}</CrmRouteGuard>
      </AppLayout>
    </AuthProviders>
  );
}
