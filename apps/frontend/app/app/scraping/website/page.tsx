"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Globe,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useCrawlWebsite, useCrawlWebsiteSync } from "@/app/hooks/use-scraping";
import { normalizeWebsiteUrl } from "@/app/lib/scraping-stats";
import { toast } from "@/app/components/toast";
import { PageError } from "@/app/components/page-state";

type CrawlResult = {
  website: string;
  business_name: string;
  emails: string[];
  phone: string;
  whatsapp: string;
  has_contact_form: boolean;
  has_cta: boolean;
  social_links: Record<string, string>;
  pages_crawled: string[];
};

function mapCrawlResponse(data: Record<string, unknown>, inputUrl: string): CrawlResult {
  const emails = (data.emails as string[]) || [];
  const phones = (data.phones as string[]) || [];
  const phone = String(data.phone || phones[0] || "");
  const social = (data.social_links as Record<string, string>) || {};
  return {
    website: String(data.website || data.url || inputUrl),
    business_name: String(data.title || data.business_name || ""),
    emails,
    phone,
    whatsapp: String(data.whatsapp || ""),
    has_contact_form: Boolean(data.has_contact_form),
    has_cta: Boolean(data.has_cta),
    social_links: social,
    pages_crawled: (data.pages_crawled as string[]) || ["Homepage"],
  };
}

export default function WebsiteCrawlerPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const syncMutation = useCrawlWebsiteSync();
  const jobMutation = useCrawlWebsite();

  const handleCrawl = async () => {
    const target = normalizeWebsiteUrl(url);
    if (!target) return;
    setResult(null);

    try {
      const data = await syncMutation.mutateAsync({ url: target });
      setResult(mapCrawlResponse(data, target));
      if (!data.emails?.length && !data.phones?.length) {
        toast.info("Crawl complete", "No contacts found in sync response; a background job was also queued.");
      }
    } catch (e: any) {
      toast.error("Crawl failed", e?.response?.data?.detail || e?.message || "Unknown error");
      return;
    }

    try {
      const job = await jobMutation.mutateAsync({ url: target, crawl_contact_pages: true });
      setLastJobId(job?.id || job?.job_id || null);
    } catch {
      /* sync result shown */
    }
  };

  const isLoading = syncMutation.isPending || jobMutation.isPending;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-green-400" />
          Scraping
        </span>
        <span>/</span>
        <span className="text-white">Website Crawler</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
      >
        <h2 className="text-xl font-bold mb-6">Crawl Website</h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-white/5 border-white/10"
          />
          <Button onClick={handleCrawl} disabled={!url.trim() || isLoading} className="gap-2 shrink-0">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Start Crawl
              </>
            )}
          </Button>
        </div>

        {syncMutation.isError && !result && (
          <PageError
            message={(syncMutation.error as any)?.response?.data?.detail || "Could not crawl website."}
            onRetry={handleCrawl}
          />
        )}
      </motion.div>

      {result && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-6 rounded-2xl border border-green-500/20 bg-green-500/10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Crawl response</span>
              </div>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={result.website.startsWith("http") ? result.website : `https://${result.website}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  {result.website}
                </a>
              </Button>
            </div>

            {result.business_name && (
              <p className="text-sm text-gray-300 mb-4">{result.business_name}</p>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Mail className="w-4 h-4" />
                  Emails Found
                </div>
                <div className="space-y-2">
                  {result.emails.length > 0 ? (
                    result.emails.map((email, i) => (
                      <div key={i} className="font-medium text-sm">
                        {email}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">None detected</div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Phone className="w-4 h-4" />
                  Phone
                </div>
                <div className="font-medium">{result.phone || "—"}</div>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </div>
                <div className="font-medium">{result.whatsapp || "—"}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    result.has_contact_form ? "bg-green-500/10" : "bg-gray-500/10"
                  )}
                >
                  {result.has_contact_form ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">Contact Form</div>
                  <div className="text-sm text-gray-400">{result.has_contact_form ? "Found" : "Not found"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    result.has_cta ? "bg-green-500/10" : "bg-gray-500/10"
                  )}
                >
                  {result.has_cta ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">CTA Buttons</div>
                  <div className="text-sm text-gray-400">{result.has_cta ? "Found" : "Not found"}</div>
                </div>
              </div>
            </div>

            {lastJobId && (
              <p className="text-xs text-gray-400 mt-4">
                Background job: {lastJobId} —{" "}
                <Link href="/app/scraping" className="text-purple-400 hover:underline">
                  recent jobs
                </Link>
              </p>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
            <h3 className="font-medium mb-4">Pages Crawled</h3>
            <div className="flex flex-wrap gap-2">
              {result.pages_crawled.map((page) => (
                <Badge key={page} className="bg-purple-500/10 text-purple-400">
                  {page}
                </Badge>
              ))}
            </div>
          </div>

          {Object.keys(result.social_links).length > 0 && (
            <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
              <h3 className="font-medium mb-4">Social Links</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(result.social_links).map(([network, link]) =>
                  link ? (
                    <Button key={network} variant="outline" size="sm" className="gap-2" asChild>
                      <a href={link} target="_blank" rel="noreferrer">
                        <LinkIcon className="w-4 h-4" />
                        {network}
                      </a>
                    </Button>
                  ) : null
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
