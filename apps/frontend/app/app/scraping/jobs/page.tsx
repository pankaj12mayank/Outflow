"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  Globe,
  FileSpreadsheet,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

const jobs = [
  {
    id: "job-001",
    type: "google_maps",
    typeLabel: "Google Maps",
    keyword: "software companies",
    location: "San Francisco, CA",
    status: "completed",
    progress: 100,
    total: 150,
    processed: 150,
    failed: 8,
    createdAt: "2 hours ago",
    duration: "4m 32s",
    results: 142,
  },
  {
    id: "job-002",
    type: "website",
    typeLabel: "Website Crawler",
    keyword: "techcorp.com",
    status: "running",
    progress: 68,
    total: 1,
    processed: 1,
    failed: 0,
    createdAt: "1 hour ago",
    duration: "2m 15s",
    results: 1,
  },
  {
    id: "job-003",
    type: "csv_import",
    typeLabel: "CSV Import",
    keyword: "leads_q2.csv",
    status: "completed",
    progress: 100,
    total: 542,
    processed: 542,
    failed: 4,
    createdAt: "3 hours ago",
    duration: "1m 08s",
    results: 538,
  },
  {
    id: "job-004",
    type: "linkedin",
    typeLabel: "LinkedIn Enrich",
    keyword: "sarah-chen-profile",
    status: "completed",
    progress: 100,
    total: 1,
    processed: 1,
    failed: 0,
    createdAt: "5 hours ago",
    duration: "12s",
    results: 1,
  },
  {
    id: "job-005",
    type: "bulk_enrich",
    typeLabel: "Bulk Enrich",
    keyword: "250 leads",
    status: "failed",
    progress: 45,
    total: 250,
    processed: 112,
    failed: 12,
    createdAt: "6 hours ago",
    duration: "8m 42s",
    results: 100,
    error: "Rate limit exceeded - please retry later",
  },
  {
    id: "job-006",
    type: "google_maps",
    typeLabel: "Google Maps",
    keyword: "lawyers",
    location: "New York, NY",
    status: "pending",
    progress: 0,
    total: 200,
    processed: 0,
    failed: 0,
    createdAt: "10 minutes ago",
    duration: null,
    results: 0,
  },
];

const statusConfig: Record<string, any> = {
  pending: {
    color: "gray",
    icon: Clock,
    label: "Pending",
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/20",
  },
  running: {
    color: "blue",
    icon: Play,
    label: "Running",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  completed: {
    color: "green",
    icon: CheckCircle,
    label: "Completed",
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/20",
  },
  failed: {
    color: "red",
    icon: XCircle,
    label: "Failed",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
};

const typeIcons: Record<string, any> = {
  google_maps: { icon: Target, color: "purple" },
  website: { icon: Globe, color: "green" },
  linkedin: { icon: Users, color: "blue" },
  csv_import: { icon: FileSpreadsheet, color: "yellow" },
  bulk_enrich: { icon: Zap, color: "purple" },
};

function StatCard({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${color}-500/10`)}>
          <Icon className={cn("w-6 h-6", `text-${color}-400`)} />
        </div>
        {trend && (
          <span className={cn("text-sm font-medium", trend > 0 ? "text-green-400" : "text-red-400")}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function JobRow({ job }: { job: any }) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const typeInfo = typeIcons[job.type];
  const TypeIcon = typeInfo?.icon || Activity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 border-b border-white/5 hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-5">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${typeInfo?.color || "gray"}-500/10`)}>
          <TypeIcon className={cn("w-6 h-6", `text-${typeInfo?.color || "gray"}-400`)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium">{job.keyword}</span>
            {job.location && (
              <span className="text-sm text-gray-400">in {job.location}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {job.createdAt}
            </span>
            {job.duration && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {job.duration}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {job.status === "running" && (
            <div className="w-32">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{job.progress}%</span>
                <span className="text-gray-400">{job.processed}/{job.total}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
          )}

          {job.status === "completed" && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">{job.results}</div>
              <div className="text-xs text-gray-400">results</div>
            </div>
          )}

          {job.status === "failed" && (
            <div className="text-right">
              <div className="text-sm text-red-400">{job.failed} failed</div>
              <div className="text-xs text-gray-400 truncate max-w-[200px]">{job.error}</div>
            </div>
          )}

          <Badge className={cn("gap-1", status.bg, status.text, status.border)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>

          <div className="flex items-center gap-1">
            {job.status === "running" && (
              <>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <Pause className="w-4 h-4" />
                </Button>
              </>
            )}
            {job.status === "failed" && (
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function JobMonitorPage() {
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    totalResults: jobs.reduce((sum, j) => sum + j.results, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Monitor</h1>
          <p className="text-gray-400">Track and manage all scraping jobs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setIsLoading(true)}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Jobs"
          value={stats.total}
          icon={Activity}
          color="purple"
        />
        <StatCard
          label="Running"
          value={stats.running}
          icon={Play}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Total Results"
          value={stats.totalResults.toLocaleString()}
          icon={TrendingUp}
          color="yellow"
          trend={12}
        />
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold">All Jobs</h2>
          <div className="flex items-center gap-2">
            {["all", "pending", "running", "completed", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                  filter === f
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {filteredJobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Job Performance
          </h3>
          <div className="space-y-4">
            {["Google Maps", "Website Crawler", "LinkedIn Enrich", "CSV Import"].map((type, i) => {
              const typeJobs = jobs.filter((j) => j.typeLabel.toLowerCase().includes(type.toLowerCase()));
              const successRate = typeJobs.length > 0
                ? Math.round(
                    (typeJobs.filter((j) => j.status === "completed").length / typeJobs.length) * 100
                  )
                : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{type}</span>
                    <span className="text-gray-400">{successRate}% success</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${successRate}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { time: "2 min ago", action: "Google Maps search completed", status: "success" },
              { time: "15 min ago", action: "Website crawl started", status: "info" },
              { time: "1 hour ago", action: "CSV import finished", status: "success" },
              { time: "3 hours ago", action: "LinkedIn enrich completed", status: "success" },
              { time: "6 hours ago", action: "Bulk enrich failed (rate limit)", status: "error" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activity.status === "success" && "bg-green-400",
                  activity.status === "info" && "bg-blue-400",
                  activity.status === "error" && "bg-red-400"
                )} />
                <span className="text-gray-400 w-16">{activity.time}</span>
                <span>{activity.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}