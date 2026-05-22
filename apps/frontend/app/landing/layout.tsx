import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Outflo",
  "AI-powered outreach automation — discover leads, run campaigns, and scale email sequences."
);

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
