"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastContainer } from "@/app/components/toast/toast-container";
import { SystemOwnerAuthProvider } from "@/app/hooks/useSystemOwnerAuth";

/** Query + toasts + system owner auth — safe for public pages (landing, login). */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SystemOwnerAuthProvider>
        {children}
        <ToastContainer />
      </SystemOwnerAuthProvider>
    </QueryClientProvider>
  );
}
