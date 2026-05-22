import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";

export const metadata: Metadata = pageMetadata("Analytics", "Campaign and outreach performance analytics.");

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
