"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users,
  Target,
  Mail,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  ChevronRight,
  Plus,
  Activity,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";
import { ScrollReveal, ScrollProgress } from "@/app/components/premium/sections";
import api from "@/app/lib/api";

interface DashboardStats {
  totalLeads: number;
  activeCampaigns: number;
  emailAnalyticsSent: number;
  replyRate: number;
  leadsGrowth: number;
  campaignsGrowth: number;
  emailAnalyticsGrowth: number;
  replyRateGrowth: number;
}

interface Campaign {
  id: string;
  name: string;
  leads: number;
  sent: number;
  replies: number;
  replyRate: number;
  status: string;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
  status: string;
}

const calculateTrend = (value: number | undefined | null): "up" | "down" | "neutral" => {
    if (value === undefined || value === null || value === 0) return "neutral";
    return value > 0 ? "up" : value < 0 ? "down" : "neutral";
  };

  const formatGrowth = (value: number | undefined | null): number => {
    if (value === undefined || value === null || value === 0) return 0;
    return Math.abs(value);
  };

function StatCard({
  name,
  value,
  growth,
  trend,
  icon: Icon,
  color,
  loading,
}: {
  name: string;
  value: string | number;
  growth: number;
  trend: "up" | "down" | "neutral";
  icon: any;
  color: "purple" | "green";
  loading?: boolean;
}) {
  const isNeutral = trend === "neutral";
  
  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center animate-pulse", color === "purple" ? "bg-purple-500/10" : "bg-green-500/10")} />
        </div>
        <div className="h-8 bg-white/5 rounded-lg mb-1 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-24 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border transition-all hover:border-white/10",
        isNeutral 
          ? "bg-gradient-to-b from-gray-500/5 to-transparent border-gray-500/10" 
          : "bg-gradient-to-b from-white/5 to-transparent border-white/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isNeutral
              ? "bg-gray-500/10 border border-gray-500/20"
              : color === "purple"
              ? "bg-purple-500/10 border border-purple-500/20"
              : "bg-green-500/10 border border-green-500/20"
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              isNeutral ? "text-gray-400" : color === "purple" ? "text-purple-400" : "text-green-400"
            )}
          />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-400"
          )}
        >
          {trend === "up" ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : trend === "down" ? (
            <ArrowDownRight className="w-4 h-4" />
          ) : null}
          {isNeutral ? "0%" : growth > 0 ? `${growth.toFixed(1)}%` : ""}
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{name}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeCampaigns: 0,
    emailAnalyticsSent: 0,
    replyRate: 0,
    leadsGrowth: 0,
    campaignsGrowth: 0,
    emailAnalyticsGrowth: 0,
    replyRateGrowth: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [emailAnalytics, setEmailAnalytics] = useState<any>({});

  const dateOptions = [
    "Last 7 days",
    "Last 30 days",
    "Last 90 days",
    "This month",
    "Last month",
    "Custom",
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        api.get("/analytics/overview"),
        api.get("/api/v1/campaigns"),
      ]);

      const analytics = analyticsRes.data || {};
      const campaignsData = campaignsRes.data?.campaigns || campaignsRes.data || [];

      const leads = analytics.leads || {};
      const campaignData = analytics.campaigns || {};
      const emailAnalytics = analytics.emailAnalytics || {};
      const sales = analytics.sales || {};

      const totalLeads = leads.total || 0;
      const activeCampaigns = campaignData.active || 0;
      const emailAnalyticsSent = emailAnalytics.sent || 0;
      const replyRate = emailAnalytics.replied && emailAnalytics.sent ? ((emailAnalytics.replied / emailAnalytics.sent) * 100).toFixed(1) : "0";

      // Calculate real growth from API data (comparing current vs previous period)
      const leadsGrowth = leads.growth !== undefined ? leads.growth : 0;
      const campaignsGrowth = campaignData.growth !== undefined ? campaignData.growth : 0;
      const emailAnalyticsGrowth = emailAnalytics.growth !== undefined ? emailAnalytics.growth : 0;
      const replyRateGrowth = parseFloat(replyRate as string) > 0 ? (emailAnalytics.growth || 0) : 0;

      setStats({
        totalLeads,
        activeCampaigns,
        emailAnalyticsSent,
        replyRate: parseFloat(replyRate as string),
        leadsGrowth,
        campaignsGrowth,
        emailAnalyticsGrowth,
        replyRateGrowth,
      });

      const formattedCampaigns = Array.isArray(campaignsData) 
        ? campaignsData.slice(0, 3).map((c: any, i: number) => ({
            id: c.id || c._id || String(i + 1),
            name: c.name || `Campaign ${i + 1}`,
            leads: c.leads_count || c.leads || 0,
            sent: c.emailAnalytics_sent || c.sent || 0,
            replies: c.replies || 0,
            replyRate: c.reply_rate || 0,
            status: c.status || "active",
          }))
        : [];
      setCampaigns(formattedCampaigns);
      setEmailAnalytics(emailAnalytics);

      setActivities([
        { id: "1", type: "lead_enriched", message: "Dashboard data loaded successfully", time: "Just now", status: "success" },
      ]);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setStats({
        totalLeads: 0,
        activeCampaigns: 0,
        emailAnalyticsSent: 0,
        replyRate: 0,
        leadsGrowth: 0,
        campaignsGrowth: 0,
        emailAnalyticsGrowth: 0,
        replyRateGrowth: 0,
      });
      setCampaigns([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const statCards = [
    {
      name: "Total Leads",
      value: formatNumber(stats.totalLeads),
      growth: formatGrowth(stats.leadsGrowth),
      trend: calculateTrend(stats.leadsGrowth),
      icon: Users,
      color: "purple" as const,
    },
    {
      name: "Active Campaigns",
      value: stats.activeCampaigns,
      growth: formatGrowth(stats.campaignsGrowth),
      trend: calculateTrend(stats.campaignsGrowth),
      icon: Target,
      color: "green" as const,
    },
    {
      name: "Emails Sent",
      value: formatNumber(stats.emailAnalyticsSent),
      growth: formatGrowth(stats.emailAnalyticsGrowth),
      trend: calculateTrend(stats.emailAnalyticsGrowth),
      icon: Mail,
      color: "purple" as const,
    },
    {
      name: "Avg. Reply Rate",
      value: `${stats.replyRate}%`,
      growth: formatGrowth(stats.replyRateGrowth),
      trend: calculateTrend(stats.replyRateGrowth),
      icon: TrendingUp,
      color: "green" as const,
    },
  ];

  const hasData = stats.totalLeads > 0 || stats.activeCampaigns > 0 || stats.emailAnalyticsSent > 0;

  return (
    <div className="space-y-8">
      <ScrollProgress />

      <div className="flex items-center justify-between">
        <ScrollReveal animation="slide-up">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name?.split(" ")[0] || "User"}</h1>
            <p className="text-gray-400">Here's what's happening with your outreach today.</p>
          </div>
        </ScrollReveal>
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white font-medium transition-all"
          >
            <Calendar className="w-4 h-4" />
            {dateRange}
          </button>
          {showDatePicker && (
            <div className="absolute top-full mt-2 right-0 z-50 w-48 p-2 rounded-xl bg-gray-900 border border-white/10 shadow-xl">
              {dateOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setDateRange(option);
                    setShowDatePicker(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                    dateRange === option
                      ? "bg-purple-500/10 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => router.push("/app/campaigns")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {!hasData && !loading && (
        <div className="p-8 rounded-2xl border border-white/10 bg-white/5 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No data available yet</h3>
          <p className="text-gray-400 mb-4">Start by creating your first campaign to see analytics here.</p>
          <button
            onClick={() => router.push("/app/campaigns")}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          >
            Create Campaign
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <ScrollReveal
            key={stat.name}
            animation="slide-up"
            delay={i * 100}
          >
            <StatCard {...stat} loading={loading} />
          </ScrollReveal>
        ))}
      </div>

      {hasData && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Top Campaigns</h2>
              <button 
                onClick={() => router.push("/app/campaigns")}
                className="text-sm text-purple-400 hover:text-purple-300 font-medium"
              >
                View all
              </button>
            </div>
            {campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign, i) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => router.push(`/app/campaigns/${campaign.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-1">{campaign.name}</div>
                      <div className="text-sm text-gray-400">
                        {campaign.leads.toLocaleString()} leads • {campaign.sent.toLocaleString()} sent
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{campaign.replyRate}%</div>
                      <div className="text-xs text-gray-400">reply rate</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No campaigns yet</p>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{activity.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{activity.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      )}

      {hasData && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <h2 className="text-xl font-bold mb-6">Reply Rate Trend</h2>
            {emailAnalytics.replies_trend && emailAnalytics.replies_trend.length > 0 ? (
              <>
                <div className="h-48 flex items-end justify-between gap-2">
                  {emailAnalytics.replies_trend.map((value: number, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(value, 5)}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400"
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-400">
                  <span>Period 1</span>
                  <span>Period 2</span>
                  <span>Period 3</span>
                  <span>Period 4</span>
                  <span>Period 5</span>
                  <span>Period 6</span>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                <p>No trend data available</p>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <h2 className="text-xl font-bold mb-6">Lead Sources</h2>
            {emailAnalytics.lead_sources && emailAnalytics.lead_sources.length > 0 ? (
              <div className="space-y-4">
                {emailAnalytics.lead_sources.map((item: { source: string; count: number; percentage: number }, i: number) => (
                  <div key={item.source}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{item.source}</span>
                      <span className="text-gray-400">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No source data available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}