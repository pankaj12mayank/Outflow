"use client";

import { AuthProvider } from "@/app/hooks/useAuth";

/** Org user auth — mount inside /app, /login, /register, etc. */
export function AuthProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
