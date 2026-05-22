import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";

export const metadata: Metadata = pageMetadata("Leads", "Manage and enrich your lead pipeline.");

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
