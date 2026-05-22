"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Globe,
  MapPin,
  FileSpreadsheet,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  Zap,
  Target,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useScrapingJobs, useScrapingStats } from "@/app/hooks/use-scraping";
import { PageError, PageLoading } from "@/app/components/page-state";
import { aggregateToolStatsFromJobs } from "@/app/lib/scraping-stats";

const scrapingToolDefs = [
  {
    id: "google-maps",
    name: "Google Maps Scraper",
    description: "Search and extract business data from Google Maps",
    icon: MapPin,
    color: "purple",
  },
  {
    id: "website",
    name: "Website Crawler",
    description: "Crawl websites and extract contact information",
    icon: Globe,
    color: "green",
  },
  {
    id: "linkedin",
    name: "LinkedIn Enrichment",
    description: "Enrich leads with LinkedIn profile data",
    icon: Target,
    color: "blue",
  },
  {
    id: "csv-import",
    name: "CSV Import",
    description: "Import leads from CSV files with smart mapping",
    icon: FileSpreadsheet,
    color: "yellow",
    path: "/app/scraping/csv-import",
  },
];

const statusColors = {
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${color}-500/10`)}>
          <Icon className={cn("w-5 h-5", `text-${color}-400`)} />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

type ScrapingJobRow = {
  id: string | number;
  type: string;
  keyword?: string;
  location?: string;
  url?: string;
  filename?: string;
  name?: string;
  rows?: number;
  status: string;
  progress?: number;
  results?: number;
  createdAt: string;
};

function formatJob(job: Record<string, unknown>): ScrapingJobRow {
  const params = (job.params as Record<string, unknown>) || {};
  return {
    id: (job.id ?? job._id) as string | number,
    type: String(job.job_type || job.type || "unknown"),
    keyword: params.keyword as string | undefined,
    location: params.location as string | undefined,
    url: params.url as string | undefined,
    filename: params.filename as string | undefined,
    name: (params.name || params.linkedin_url) as string | undefined,
    rows: params.rows as number | undefined,
    status: String(job.status || "pending"),
    progress: job.progress as number | undefined,
    results: (job.results_count ?? job.results) as number | undefined,
    createdAt: job.created_at ? new Date(String(job.created_at)).toLocaleString() : "",
  };
}

export default function ScrapingPage() {
  const [activeTab, setActiveTab] = useState<"tools" | "jobs">("tools");
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useScrapingStats();
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useScrapingJobs({ limit: 100 });

  const rawJobs = Array.isArray(jobsData)
    ? jobsData
    : (jobsData as { jobs?: Record<string, unknown>[]; data?: Record<string, unknown>[] } | undefined)?.jobs
      ?? (jobsData as { data?: Record<string, unknown>[] } | undefined)?.data
      ?? [];
  const recentJobs: ScrapingJobRow[] = rawJobs.map(formatJob);

  const toolStats = useMemo(() => aggregateToolStatsFromJobs(rawJobs), [rawJobs]);

  const scrapingTools = useMemo(
    () =>
      scrapingToolDefs.map((tool) => ({
        ...tool,
        stats: toolStats[tool.id] || { total: 0, success: 0, failed: 0 },
      })),
    [toolStats]
  );

  const handleRefreshStats = () => {
    refetchStats();
    refetchJobs();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scraping</h1>
          <p className="text-gray-400">Lead discovery and enrichment tools</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleRefreshStats}
            disabled={statsLoading || jobsLoading}
          >
            <RefreshCw className={cn("w-4 h-4", (statsLoading || jobsLoading) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {statsError && (
        <PageError message="Could not load scraping stats." onRetry={() => refetchStats()} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={String(stats?.total_jobs ?? stats?.total ?? "—")} icon={Users} color="purple" />
        <StatCard label="Completed" value={String(stats?.completed ?? stats?.success ?? "—")} icon={CheckCircle} color="green" />
        <StatCard label="Active Jobs" value={String(stats?.active ?? stats?.running ?? "—")} icon={Play} color="blue" />
        <StatCard label="Failed" value={String(stats?.failed ?? "—")} icon={TrendingUp} color="yellow" />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab("tools")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "tools"
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          Scraping Tools
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "jobs"
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          Recent Jobs
        </button>
      </div>

      {activeTab === "tools" && (
        <div className="grid md:grid-cols-2 gap-6">
          {scrapingTools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-all"
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    tool.color === "purple" && "bg-purple-500/10 border border-purple-500/20",
                    tool.color === "green" && "bg-green-500/10 border border-green-500/20",
                    tool.color === "blue" && "bg-blue-500/10 border border-blue-500/20",
                    tool.color === "yellow" && "bg-yellow-500/10 border border-yellow-500/20"
                  )}
                >
                  <tool.icon
                    className={cn(
                      "w-7 h-7",
                      tool.color === "purple" && "text-purple-400",
                      tool.color === "green" && "text-green-400",
                      tool.color === "blue" && "text-blue-400",
                      tool.color === "yellow" && "text-yellow-400"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{tool.name}</h3>
                  <p className="text-sm text-gray-400">{tool.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-xl font-bold">{tool.stats.total}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-xl font-bold text-green-400">{tool.stats.success}</div>
                  <div className="text-xs text-gray-400">Success</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-xl font-bold text-red-400">{tool.stats.failed}</div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
              </div>

              <Link href={tool.path || `/app/scraping/${tool.id}`}>
                <Button className="w-full gap-2">
                  Open Tool
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold">Recent Scraping Jobs</h2>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchJobs()}>
              <Filter className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          {jobsLoading && <PageLoading label="Loading jobs..." />}
          {jobsError && <PageError message="Could not load scraping jobs." onRetry={() => refetchJobs()} />}
          {!jobsLoading && !jobsError && recentJobs.length === 0 && (
            <p className="p-8 text-center text-gray-400 text-sm">No scraping jobs yet. Run a tool to create one.</p>
          )}
          <div className="divide-y divide-white/5">
            {recentJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    job.type === "google_maps" && "bg-purple-500/10",
                    job.type === "website" && "bg-green-500/10",
                    job.type === "csv_import" && "bg-yellow-500/10",
                    job.type === "linkedin" && "bg-blue-500/10"
                  )}
                >
                  {(job.type?.includes("google_maps") || job.type === "google_maps") && <MapPin className="w-5 h-5 text-purple-400" />}
                  {job.type?.includes("website") && <Globe className="w-5 h-5 text-green-400" />}
                  {job.type?.includes("csv") && <FileSpreadsheet className="w-5 h-5 text-yellow-400" />}
                  {job.type?.includes("linkedin") && <Target className="w-5 h-5 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {(job.type?.includes("google_maps") || job.type === "google_maps") && `Search: "${job.keyword || "—"}"`}
                      {(job.type?.includes("website") || job.type === "website") && `Crawl: ${job.url || "—"}`}
                      {(job.type?.includes("csv") || job.type === "csv_import") && `Import: ${job.filename || "—"}`}
                      {(job.type?.includes("linkedin") || job.type === "linkedin") && `Enrich: ${job.name || "—"}`}
                      {!job.type && "Scraping job"}
                    </span>
                    {job.location && (
                      <span className="text-sm text-gray-400">in {job.location}</span>
                    )}
                    {job.rows && (
                      <span className="text-sm text-gray-400">({job.rows} rows)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {job.createdAt}
                    {job.progress && ` • ${job.progress}%`}
                    {job.results && ` • ${job.results} results`}
                  </div>
                </div>

                <Badge className={cn("capitalize", statusColors[job.status as keyof typeof statusColors])}>
                  {job.status}
                </Badge>

                <div className="flex items-center gap-1">
                  {job.status === "running" && (
                    <>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Pause className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {job.status === "failed" && (
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}