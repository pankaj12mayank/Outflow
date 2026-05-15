"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  CheckCircle,
  ExternalLink,
  Link as LinkIcon,
  FormInput,
  MousePointer,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

const sampleResult = {
  website: "techcorp.com",
  business_name: "TechCorp",
  emails: ["contact@techcorp.com", "info@techcorp.com"],
  phone: "+1 (415) 555-0100",
  whatsapp: "https://wa.me/14155550100",
  calendly: "https://calendly.com/techcorp",
  has_contact_form: true,
  has_cta: true,
  social_links: {
    linkedin: "https://linkedin.com/company/techcorp",
    twitter: "https://twitter.com/techcorp",
    facebook: "https://facebook.com/techcorp",
  },
  pages_crawled: ["Homepage", "Contact", "About"],
};

export default function WebsiteCrawlerPage() {
  const [url, setUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCrawl = async () => {
    if (!url) return;
    
    setIsCrawling(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setResult(sampleResult);
    setIsCrawling(false);
  };

  return (
    <div className="space-y-6">
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

        <div className="flex gap-4 mb-6">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-white/5 border-white/10"
          />
          <Button
            onClick={handleCrawl}
            disabled={!url || isCrawling}
            className="gap-2"
          >
            {isCrawling ? (
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

        {isCrawling && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Globe className="w-8 h-8 text-green-400 animate-pulse" />
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
            <p className="text-gray-400">Crawling website and extracting contact data...</p>
            <div className="mt-4 space-y-2 text-sm text-gray-500">
              <p>✓ Loading homepage</p>
              <p>✓ Finding contact page</p>
              <p className="text-purple-400">→ Extracting emails</p>
            </div>
          </div>
        )}
      </motion.div>

      {result && !isCrawling && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-6 rounded-2xl border border-green-500/20 bg-green-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Website Crawled Successfully</span>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                {result.website}
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Mail className="w-4 h-4" />
                  Emails Found
                </div>
                <div className="space-y-2">
                  {result.emails.map((email: string, i: number) => (
                    <div key={i} className="font-medium">{email}</div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <Phone className="w-4 h-4" />
                  Phone
                </div>
                <div className="font-medium">{result.phone}</div>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </div>
                <div className="font-medium">{result.whatsapp}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", result.has_contact_form ? "bg-green-500/10" : "bg-gray-500/10")}>
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
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", result.has_cta ? "bg-green-500/10" : "bg-gray-500/10")}>
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
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
            <h3 className="font-medium mb-4">Pages Crawled</h3>
            <div className="flex flex-wrap gap-2">
              {result.pages_crawled.map((page: string) => (
                <Badge key={page} className="bg-purple-500/10 text-purple-400">
                  {page}
                </Badge>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
            <h3 className="font-medium mb-4">Social Links</h3>
            <div className="flex flex-wrap gap-3">
              {result.social_links.linkedin && (
                <Button variant="outline" size="sm" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  LinkedIn
                </Button>
              )}
              {result.social_links.twitter && (
                <Button variant="outline" size="sm" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Twitter
                </Button>
              )}
              {result.social_links.facebook && (
                <Button variant="outline" size="sm" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Facebook
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}