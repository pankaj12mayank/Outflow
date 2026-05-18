"use client";

import { AppLayout } from "@/app/components/sidebar";
import { AuthProviders } from "@/app/providers/auth-providers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <AppLayout>{children}</AppLayout>
    </AuthProviders>
  );
}