import type { Metadata } from "next";

export const siteMetadata: Metadata = {
  title: {
    default: "Outflo - AI Outreach Automation",
    template: "%s | Outflo",
  },
  description:
    "AI-powered outreach automation for lead discovery, campaigns, and email sequences.",
};

export function pageMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description ?? siteMetadata.description,
  };
}
