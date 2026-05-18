"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SystemOwnerAuthProvider, useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";

function SystemOwnerRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const isLoginPage = pathname === "/system-owner/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/system-owner/login");
    }
    if (!isLoading && isAuthenticated && isLoginPage) {
      router.replace("/system-owner/dashboard");
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-gray-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
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
