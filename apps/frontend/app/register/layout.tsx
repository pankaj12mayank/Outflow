import { AuthProviders } from "@/app/providers/auth-providers";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthProviders>{children}</AuthProviders>;
}
