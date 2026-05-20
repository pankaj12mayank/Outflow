"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Shield, Users, DollarSign, Building2, Target, Play, TrendingUp,
  Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";

interface DashboardData {
  overview: {
    total_users?: number;
    total_organizations?: number;
    total_leads?: number;
    total_campaigns?: number;
    active_campaigns?: number;
    emails_sent?: number;
  };
  subscriptions: {
    mrr?: number;
    arr?: number;
    total_subscriptions?: number;
  };
  revenue: {
    daily_breakdown?: Array<{ date: string; revenue: number }>;
  };
  workers: {
    active_workers?: number;
    pending_tasks?: number;
    success_rate?: number;
  };
  campaigns: {
    open_rate?: number;
    click_rate?: number;
    reply_rate?: number;
  };
  leads: {
    leads_30d?: number;
  };
}

function formatCurrency(value: number | undefined): string {
  if (!value || value === 0) return "$0.00";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number | undefined): string {
  if (!value || value === 0) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export default function SystemOwnerDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useSystemOwnerAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.get("/api/v1/system-owner-dashboard/comprehensive", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-purple-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0c0c14] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-400" />
              System Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome back, {user?.full_name || user?.email || "Admin"}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
            <button onClick={fetchData} className="text-sm text-red-400 hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Overview Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Organizations"
              value={formatNumber(data?.overview?.total_organizations)}
              icon={Building2}
              color="#22d3ee"
            />
            <MetricCard
              title="Total Users"
              value={formatNumber(data?.overview?.total_users)}
              icon={Users}
              color="#60a5fa"
            />
            <MetricCard
              title="Total Leads"
              value={formatNumber(data?.overview?.total_leads)}
              icon={Target}
              color="#fbbf24"
            />
            <MetricCard
              title="Total Campaigns"
              value={formatNumber(data?.overview?.total_campaigns)}
              icon={Play}
              color="#fb923c"
            />
          </div>
        </section>

        {/* Subscriptions Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Subscriptions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={formatCurrency(data?.subscriptions?.mrr)}
              icon={DollarSign}
              color="#4ade80"
            />
            <MetricCard
              title="Annual Recurring Revenue"
              value={formatCurrency(data?.subscriptions?.arr)}
              icon={TrendingUp}
              color="#a78bfa"
            />
            <MetricCard
              title="Active Subscriptions"
              value={formatNumber(data?.subscriptions?.total_subscriptions)}
              icon={Users}
              color="#8b5cf6"
            />
          </div>
        </section>

        {/* Campaign Performance */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Campaign Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Open Rate"
              value={`${data?.campaigns?.open_rate || 0}%`}
              icon={Activity}
              color="#4ade80"
            />
            <MetricCard
              title="Click Rate"
              value={`${data?.campaigns?.click_rate || 0}%`}
              icon={Target}
              color="#60a5fa"
            />
            <MetricCard
              title="Reply Rate"
              value={`${data?.campaigns?.reply_rate || 0}%`}
              icon={TrendingUp}
              color="#f472b6"
            />
          </div>
        </section>

        {/* System Health */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Active Workers"
              value={formatNumber(data?.workers?.active_workers)}
              icon={CheckCircle}
              color="#4ade80"
            />
            <MetricCard
              title="Pending Tasks"
              value={formatNumber(data?.workers?.pending_tasks)}
              icon={Activity}
              color="#fbbf24"
            />
            <MetricCard
              title="Success Rate"
              value={`${data?.workers?.success_rate || 0}%`}
              icon={TrendingUp}
              color="#a78bfa"
            />
          </div>
        </section>

        {/* Active Campaigns */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Campaigns</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard
              title="Active Campaigns"
              value={formatNumber(data?.overview?.active_campaigns)}
              icon={Play}
              color="#4ade80"
            />
            <MetricCard
              title="Leads (30d)"
              value={formatNumber(data?.leads?.leads_30d)}
              icon={Users}
              color="#fb923c"
            />
          </div>
        </section>

        {/* Revenue Chart Placeholder */}
        {data?.revenue?.daily_breakdown && data.revenue.daily_breakdown.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
              <div className="h-48 flex items-end justify-between gap-2">
                {data.revenue.daily_breakdown.slice(-14).map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-purple-500/30 rounded-t-lg hover:bg-purple-500/50 transition-colors"
                      style={{ 
                        height: `${Math.max((day.revenue / Math.max(...(data.revenue.daily_breakdown ?? []).map(d => d.revenue), 1)) * 100, 4)}%`,
                        minHeight: "4px"
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-white/10 bg-white/5"
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </motion.div>
  );
}