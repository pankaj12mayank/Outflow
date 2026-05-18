"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function SoPageLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{title}</h1>
          {description && (
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/landing"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-white/10 text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View site
          </Link>
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
