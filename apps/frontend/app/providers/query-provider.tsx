"use client";

import { RootProviders } from "./root-providers";
import { AuthProviders } from "./auth-providers";

/** @deprecated Prefer RootProviders + AuthProviders in route layouts */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RootProviders>
      <AuthProviders>{children}</AuthProviders>
    </RootProviders>
  );
}
