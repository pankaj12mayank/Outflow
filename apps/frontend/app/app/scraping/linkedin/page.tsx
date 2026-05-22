"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  Loader2,
  Briefcase,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useEnrichLinkedIn, useEnrichLinkedInSync } from "@/app/hooks/use-scraping";
import { toast } from "@/app/components/toast";
import { PageError } from "@/app/components/page-state";

type EnrichResult = {
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  linkedin_url: string;
};

export default function LinkedInEnrichPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const syncMutation = useEnrichLinkedInSync();
  const jobMutation = useEnrichLinkedIn();

  const handleEnrich = async () => {
    if (!url.trim()) return;
    setResult(null);
    const linkedin_url = url.trim();

    try {
      const data = await syncMutation.mutateAsync({ linkedin_url });
      setResult({
        name: data.name || "—",
        title: data.title || "—",
        company: data.company || "—",
        location: data.location || "—",
        email: data.email || "—",
        linkedin_url: data.linkedin_url || data.url || linkedin_url,
      });
    } catch (e: any) {
      toast.error("Enrichment failed", e?.response?.data?.detail || e?.message || "Unknown error");
      return;
    }

    try {
      const job = await jobMutation.mutateAsync({ linkedin_url });
      setLastJobId(job?.id || job?.job_id || null);
      toast.success("Job queued", "Track progress under Scraping → Recent Jobs.");
    } catch {
      /* sync result already shown */
    }
  };

  const isLoading = syncMutation.isPending || jobMutation.isPending;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          Scraping
        </span>
        <span>/</span>
        <span className="text-white">LinkedIn Enrichment</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
      >
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-400">
            <strong>Manual URL input only.</strong> Enrichment uses the scraping API; empty fields mean the profile could not be parsed yet.
          </p>
        </div>

        <h2 className="text-xl font-bold mb-6">Enrich LinkedIn Profile</h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="https://linkedin.com/in/profile-name"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-white/5 border-white/10"
          />
          <Button onClick={handleEnrich} disabled={!url.trim() || isLoading} className="gap-2 shrink-0">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Enrich Profile
              </>
            )}
          </Button>
        </div>

        {(syncMutation.isError || jobMutation.isError) && !result && (
          <PageError
            message={
              (syncMutation.error as any)?.response?.data?.detail ||
              (jobMutation.error as any)?.message ||
              "Could not enrich profile."
            }
            onRetry={handleEnrich}
          />
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-xl border border-green-500/20 bg-green-500/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-green-400">API response received</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-lg">
                  {(result.name !== "—" ? result.name : "?").charAt(0)}
                </div>
                <div>
                  <div className="font-bold">{result.name}</div>
                  <div className="text-sm text-gray-400">{result.title}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{result.company}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{result.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <span>{result.email}</span>
                </div>
              </div>
            </div>

            {lastJobId && (
              <p className="text-xs text-gray-400 mt-4">
                Background job: {lastJobId} —{" "}
                <Link href="/app/scraping" className="text-purple-400 hover:underline">
                  view recent jobs
                </Link>
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Link href="/app/leads">
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Go to Leads
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="font-medium mb-3">Supported Fields</h3>
        <div className="flex flex-wrap gap-2">
          {["Name", "Title", "Company", "Location", "Email (if public)"].map((field) => (
            <Badge key={field} className="bg-white/5 text-gray-400">
              {field}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
