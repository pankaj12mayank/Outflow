"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

const scrapingTools = [
  {
    id: "google-maps",
    name: "Google Maps Scraper",
    description: "Search and extract business data from Google Maps",
    icon: MapPin,
    color: "purple",
    stats: { total: 1247, success: 1189, failed: 58 },
  },
  {
    id: "website",
    name: "Website Crawler",
    description: "Crawl websites and extract contact information",
    icon: Globe,
    color: "green",
    stats: { total: 892, success: 856, failed: 36 },
  },
  {
    id: "linkedin",
    name: "LinkedIn Enrichment",
    description: "Enrich leads with LinkedIn profile data",
    icon: Target,
    color: "blue",
    stats: { total: 456, success: 432, failed: 24 },
  },
  {
    id: "csv",
    name: "CSV Import",
    description: "Import leads from CSV files with smart mapping",
    icon: FileSpreadsheet,
    color: "yellow",
    stats: { total: 2341, success: 2298, failed: 43 },
  },
];

const recentJobs = [
  {
    id: "job-1",
    type: "google_maps",
    keyword: "software companies",
    location: "San Francisco, CA",
    status: "completed",
    results: 127,
    createdAt: "2 hours ago",
  },
  {
    id: "job-2",
    type: "website",
    url: "techcorp.com",
    status: "running",
    progress: 68,
    createdAt: "1 hour ago",
  },
  {
    id: "job-3",
    type: "csv_import",
    filename: "leads_q2.csv",
    rows: 542,
    status: "completed",
    results: 538,
    createdAt: "3 hours ago",
  },
  {
    id: "job-4",
    type: "linkedin",
    name: "Sarah Chen",
    status: "completed",
    results: 1,
    createdAt: "5 hours ago",
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

export default function ScrapingPage() {
  const [activeTab, setActiveTab] = useState<"tools" | "jobs">("tools");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scraping</h1>
          <p className="text-gray-400">Lead discovery and enrichment tools</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => {}}>
            <RefreshCw className="w-4 h-4" />
            Refresh Stats
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value="4,936" icon={Users} color="purple" />
        <StatCard label="Enriched" value="4,775" icon={CheckCircle} color="green" />
        <StatCard label="Active Jobs" value="3" icon={Play} color="blue" />
        <StatCard label="Success Rate" value="97.8%" icon={TrendingUp} color="yellow" />
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

              <Link href={`/app/scraping/${tool.id}`}>
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
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
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
                  {job.type === "google_maps" && <MapPin className="w-5 h-5 text-purple-400" />}
                  {job.type === "website" && <Globe className="w-5 h-5 text-green-400" />}
                  {job.type === "csv_import" && <FileSpreadsheet className="w-5 h-5 text-yellow-400" />}
                  {job.type === "linkedin" && <Target className="w-5 h-5 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {job.type === "google_maps" && `Search: "${job.keyword}"`}
                      {job.type === "website" && `Crawl: ${job.url}`}
                      {job.type === "csv_import" && `Import: ${job.filename}`}
                      {job.type === "linkedin" && `Enrich: ${job.name}`}
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