import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RootProviders } from "./providers/root-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Outflo - AI Outreach Automation",
  description: "AI-powered outreach automation platform for lead discovery and campaign management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
