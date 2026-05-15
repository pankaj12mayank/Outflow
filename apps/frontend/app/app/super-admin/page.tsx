"use client";

import { usePlatformStats, useBillingStats, useMonitoringStats, useSystemAlerts, useAbuseReports } from "@/app/hooks/use-admin";
import { Activity, Users, DollarSign, AlertTriangle, Server, TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, trend, color = "violet" }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; trend?: "up" | "down"; color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
          {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend === "up" ? "Growing" : "Declining"}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  const { data: stats } = usePlatformStats();
  const { data: billing } = useBillingStats();
  const { data: monitoring } = useMonitoringStats();
  const { data: alerts } = useSystemAlerts();
  const { data: abuse } = useAbuseReports({ limit: 5 });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
        <p className="text-gray-400">Real-time monitoring of the entire Outflo platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Organizations" value={stats?.total_organizations ?? 0} subtitle={`${stats?.active_organizations ?? 0} active`} icon={Users} trend="up" color="violet" />
        <StatCard title="Total Users" value={stats?.total_users ?? 0} subtitle={`${stats?.active_subscriptions ?? 0} paying`} icon={Activity} color="blue" />
        <StatCard title="MRR" value={`$${(billing?.mrr ?? 0).toFixed(0)}`} subtitle={`ARR: $${(billing?.arr ?? 0).toFixed(0)}`} icon={DollarSign} trend="up" color="emerald" />
        <StatCard title="Abuse Reports" value={alerts?.length ?? 0} subtitle="Pending review" icon={AlertTriangle} color={alerts?.length ? "rose" : "emerald"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" />
            Server Status
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.server_status ?? "unknown"}</p>
              <p className="text-xs text-gray-500 mt-1">Status</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.active_connections ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Connections</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.avg_response_time_ms ?? 0}ms</p>
              <p className="text-xs text-gray-500 mt-1">Avg Response</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.error_rate ?? 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Error Rate</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.scraping_jobs_running ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Scraping Jobs</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/[0.02]">
              <p className="text-2xl font-bold text-white">{monitoring?.active_polling_users ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active Polling</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            System Alerts
          </h3>
          <div className="space-y-3">
            {alerts?.length ? alerts.map((alert: { id: number; title: string; severity: string; message: string; created_at: string }) => (
              <div key={alert.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{alert.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    alert.severity === "critical" ? "bg-rose-500/20 text-rose-400" :
                    alert.severity === "high" ? "bg-amber-500/20 text-amber-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All systems operational</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          Recent Abuse Reports
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Organization</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Severity</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {abuse?.length ? abuse.map((report: { id: number; organization_name: string; report_type: string; severity: string; status: string; created_at: string }) => (
                <tr key={report.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white">{report.organization_name}</td>
                  <td className="py-3 px-4 text-gray-400">{report.report_type}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.severity === "critical" ? "bg-rose-500/20 text-rose-400" :
                      report.severity === "high" ? "bg-amber-500/20 text-amber-400" :
                      report.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>{report.severity}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      report.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>{report.status}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No abuse reports found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}