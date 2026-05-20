"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { 
  BarChart3, Send, Eye, Zap, MousePointer, RefreshCw,
  TrendingUp, TrendingDown, XCircle, AlertTriangle, CheckCircle
} from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function EmailAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [failureStats, setFailureStats] = useState<any>(null);
  const [retryStats, setRetryStats] = useState<any>(null);
  const [days, setDays] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, failuresRes, retriesRes] = await Promise.all([
        api.get("/api/v1/email-engine/analytics", { 
          headers: authHeaders(),
          params: { days }
        }),
        api.get("/api/v1/email-engine/analytics/failures", { 
          headers: authHeaders(),
          params: { days }
        }),
        api.get("/api/v1/email-engine/analytics/retries", { 
          headers: authHeaders(),
          params: { days }
        }),
      ]);
      setAnalytics(analyticsRes.data);
      setFailureStats(failuresRes.data);
      setRetryStats(retriesRes.data);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => (
    <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value || "0"}</div>
      <div className="text-gray-400 text-sm">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  return (
    <SoPageLayout
      title="Email Analytics"
      description="Track email performance and delivery metrics"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button 
            onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Sent" 
              value={analytics?.total_sent || 0} 
              icon={Send} 
              color="bg-purple-500/10 border border-purple-500/20"
              subtitle={`Delivery rate: ${analytics?.delivery_rate || 0}%`}
            />
            <StatCard 
              title="Delivered" 
              value={analytics?.total_delivered || 0} 
              icon={CheckCircle} 
              color="bg-green-500/10 border border-green-500/20"
            />
            <StatCard 
              title="Opened" 
              value={analytics?.total_opened || 0} 
              icon={Eye} 
              color="bg-blue-500/10 border border-blue-500/20"
              subtitle={`Open rate: ${analytics?.open_rate || 0}%`}
              trend={analytics?.total_sent ? ((analytics.total_opened / analytics.total_sent) * 100) - 25 : 0}
            />
            <StatCard 
              title="Clicked" 
              value={analytics?.total_clicked || 0} 
              icon={MousePointer} 
              color="bg-orange-500/10 border border-orange-500/20"
              subtitle={`Click rate: ${analytics?.click_rate || 0}%`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Bounced" 
              value={analytics?.total_bounced || 0} 
              icon={XCircle} 
              color="bg-red-500/10 border border-red-500/20"
              subtitle={`Bounce rate: ${analytics?.bounce_rate || 0}%`}
            />
            <StatCard 
              title="Unsubscribed" 
              value={analytics?.total_unsubscribed || 0} 
              icon={AlertTriangle} 
              color="bg-yellow-500/10 border border-yellow-500/20"
            />
            <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{retryStats?.total_retries || 0}</div>
              <div className="text-gray-400 text-sm">Total Retries</div>
            </div>
            <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{retryStats?.successful_retries || 0}</div>
              <div className="text-gray-400 text-sm">Successful Retries</div>
            </div>
          </div>

          {failureStats && failureStats.failures && failureStats.failures.length > 0 && (
            <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <h2 className="text-xl font-bold mb-6">Failure Breakdown</h2>
              <div className="space-y-4">
                {failureStats.failures.map((failure: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="font-medium">{failure.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{failure.count}</div>
                      <div className="text-xs text-gray-400">
                        {failureStats.total > 0 ? ((failure.count / failureStats.total) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SoPageLayout>
  );
}