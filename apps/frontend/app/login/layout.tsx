import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";
import { AuthProviders } from "@/app/providers/auth-providers";

export const metadata: Metadata = pageMetadata("Sign in", "Sign in to your Outflo account.");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthProviders>{children}</AuthProviders>;
}
