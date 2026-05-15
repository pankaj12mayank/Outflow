"use client";

import { useMonitoringStats, usePlatformStats } from "@/app/hooks/use-admin";
import { Server, Activity, Zap, Clock, Database, Wifi, Cpu, HardDrive, RefreshCw } from "lucide-react";

function MetricRow({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color || "text-white"}`}>{value}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

export default function MonitoringPage() {
  const { data: monitoring } = useMonitoringStats();
  const { data: stats } = usePlatformStats();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Monitoring</h1>
          <p className="text-gray-400">Real-time server and service health</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-sm text-gray-400">Auto-refresh every 10s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${monitoring?.server_status === "healthy" ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="text-lg font-semibold text-white">Server Status</span>
          </div>
          <p className={`text-3xl font-bold ${monitoring?.server_status === "healthy" ? "text-emerald-400" : "text-rose-400"}`}>
            {monitoring?.server_status || "unknown"}
          </p>
          <p className="text-xs text-gray-500 mt-2">Uptime: {Math.floor((monitoring?.uptime_seconds || 0) / 86400)}d {Math.floor(((monitoring?.uptime_seconds || 0) % 86400) / 3600)}h</p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-5 h-5 text-violet-400" />
            <span className="text-lg font-semibold text-white">Active Connections</span>
          </div>
          <p className="text-3xl font-bold text-white">{monitoring?.active_connections ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2">{monitoring?.active_polling_users ?? 0} polling users</p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-semibold text-white">Performance</span>
          </div>
          <p className="text-3xl font-bold text-white">{monitoring?.avg_response_time_ms ?? 0}<span className="text-lg font-normal text-gray-500">ms</span></p>
          <p className="text-xs text-gray-500 mt-2">Error rate: {monitoring?.error_rate ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" /> System Resources
          </h3>
          <MetricRow label="CPU Usage" value="—" unit="%" />
          <MetricRow label="Memory Usage" value="—" unit="%" />
          <MetricRow label="Disk Usage" value="—" unit="%" />
          <MetricRow label="Active Threads" value={monitoring?.uptime_seconds ? 1 : 0} />
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Job Queue
          </h3>
          <MetricRow label="Queue Size" value={monitoring?.queue_size ?? 0} />
          <MetricRow label="Scraping Jobs Running" value={monitoring?.scraping_jobs_running ?? 0} />
          <MetricRow label="Scraping Jobs Pending" value={monitoring?.scraping_jobs_pending ?? 0} />
          <MetricRow label="Total Organizations" value={stats?.total_organizations ?? 0} color="text-violet-400" />
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Database
          </h3>
          <MetricRow label="Connection Pool" value="Active" color="text-emerald-400" />
          <MetricRow label="Total Organizations" value={stats?.total_organizations ?? 0} />
          <MetricRow label="Total Users" value={stats?.total_users ?? 0} />
          <MetricRow label="Active Subscriptions" value={stats?.active_subscriptions ?? 0} />
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" /> Metrics Summary
          </h3>
          <MetricRow label="MRR" value={`$${(stats?.mrr ?? 0).toFixed(0)}`} color="text-emerald-400" />
          <MetricRow label="ARR" value={`$${(stats?.arr ?? 0).toFixed(0)}`} color="text-emerald-400" />
          <MetricRow label="Churn Rate" value={(stats?.churn_rate ?? 0).toFixed(1)} unit="%" color="text-amber-400" />
          <MetricRow label="New Orgs This Month" value={stats?.new_orgs_this_month ?? 0} />
        </div>
      </div>
    </div>
  );
}