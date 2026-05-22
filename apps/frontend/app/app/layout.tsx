import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "Dashboard",
  "Manage leads, campaigns, scraping, and analytics in Outflo."
);

export { default } from "./app-layout-client";
