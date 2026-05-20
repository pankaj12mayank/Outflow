"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SystemOwnerAuthProvider, useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import { SystemOwnerShell } from "./components/SystemOwnerShell";

function SystemOwnerRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const isLoginPage = pathname === "/login";
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasChecked(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!hasChecked) return;
    
    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
    } else if (isAuthenticated && isLoginPage) {
      router.replace("/system-owner/dashboard");
    }
  }, [isAuthenticated, hasChecked, isLoginPage, router]);

  if (isLoading || !hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isLoginPage) {
    return null;
  }

  return <SystemOwnerShell>{children}</SystemOwnerShell>;
}

export default function SystemOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SystemOwnerAuthProvider>
      <SystemOwnerRouteGuard>{children}</SystemOwnerRouteGuard>
    </SystemOwnerAuthProvider>
  );
}
