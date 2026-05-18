import type { ReactNode } from "react";

/** Landing uses only root layout providers (no auth) — keep this route lightweight. */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
