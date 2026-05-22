import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";

export const metadata: Metadata = pageMetadata("Scraping", "Lead discovery tools — Google Maps, websites, LinkedIn, and CSV import.");

export default function ScrapingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
