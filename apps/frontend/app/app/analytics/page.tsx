"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  MousePointerClick,
  MessageSquare,
  Target,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Zap,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Sparkles,
  Bot,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { toast } from "@/app/components/toast";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import {
  useAnalyticsOverview,
  useLeadAnalytics,
  useCampaignAnalytics,
  useAIAnalytics,
  useSalesAnalytics,
  useActivityFeed,
  useQuickStats,
} from "@/app/hooks/use-analytics";
import { useScrapingStats } from "@/app/hooks/use-scraping";
import { PageError, PageLoading } from "@/app/components/page-state";
import {
  buildEmailTrendFromOverview,
  buildFunnelFromOverview,
  buildSourcesFromLeadAnalytics,
  buildCampaignPerformance,
  buildAiUsage,
} from "@/app/lib/analytics-charts";

function StatCard({ label, value, change, changeType, icon: Icon, color, subValue }: any) {
  const isPositive = changeType === "up" || changeType === "positive";
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const ChangeIcon = changeType === "up" || changeType === "positive" ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${color}-500/10`)}>
          <Icon className={cn("w-6 h-6", `text-${color}-400`)} />
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", changeColor)}>
            <ChangeIcon className="w-4 h-4" />
            {change}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">{label}</div>
        {subValue && <div className="text-xs text-gray-500">{subValue}</div>}
      </div>
    </motion.div>
  );
}

function SimpleBarChart({ data, height = 200 }: { data: any[]; height?: number }) {
  const max = Math.max(...data.map((d) => Math.max(...Object.values(d).filter((v) => typeof v === "number"))));

  return (
    <div className="space-y-2" style={{ height }}>
      <div className="flex items-end gap-2 h-full">
        {data.map((item, i) => {
          const keys = Object.keys(item).filter((k) => k !== "name" && k !== "day" && k !== "hour" && k !== "feature" && k !== "percentage");
          return (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className="flex-1 flex items-end gap-1">
                {keys.map((key, j) => {
                  const value = item[key];
                  const heightPercent = max > 0 ? (value / max) * 100 : 0;
                  const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
                  return (
                    <motion.div
                      key={key}
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ delay: i * 0.05 + j * 0.02 }}
                      className="flex-1 rounded-t"
                      style={{ backgroundColor: colors[j % colors.length], minHeight: "4px" }}
                      title={key}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-center text-gray-500 truncate">
                {item.name || item.day || item.hour || item.feature || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimpleLineChart({ data, height = 200 }: { data: any[]; height?: number }) {
  const keys = Object.keys(data[0] || {}).filter((k) => k !== "name" && k !== "day");
  const max = Math.max(...data.map((d) => Math.max(...keys.map((k) => d[k] || 0))));
  const min = 0;
  const range = max - min || 1;
  const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B"];

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${data.length * 40} 100`} preserveAspectRatio="none">
        {keys.map((key, ki) => {
          const points = data.map((d, i) => {
            const x = i * 40 + 20;
            const y = 95 - ((d[key] || 0) - min) / range * 85;
            return `${x},${y}`;
          }).join(" ");

          return (
            <polyline
              key={key}
              points={points}
              fill="none"
              stroke={colors[ki % colors.length]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {data.map((d, i) => (
          <div key={i} className="text-xs text-gray-500">{d.day}</div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data, size = 200 }: { data: any[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const center = size / 2;
  const radius = size / 2 - 20;
  let currentAngle = -90;

  const paths = data.map((item, i) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color,
      name: item.name,
      value: item.value,
      percentage: (percentage * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size}>
        {paths.map((path, i) => (
          <path key={i} d={path.d} fill={path.color} />
        ))}
        <circle cx={center} cy={center} r={radius * 0.6} fill="rgba(15,15,15,0.8)" />
      </svg>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-400">{item.name}</span>
            <span className="text-sm font-medium ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ data }: { data: any[] }) {
  const maxValue = data[0]?.value || 1;

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const widthPercent = (item.value / maxValue) * 100;
        return (
          <div key={item.name} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">{item.name}</span>
              <span className="text-sm font-medium">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="h-full rounded-lg flex items-center justify-end pr-3"
                style={{ backgroundColor: item.color }}
              >
                <span className="text-sm font-medium text-white">{item.percentage}%</span>
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const icons: Record<string, any> = {
    campaign_created: Target,
    email_sent: Mail,
    lead_added: Users,
    meeting_booked: Calendar,
    ai_generated: Sparkles,
  };
  const Icon = icons[activity.type] || Activity;
  const colors: Record<string, string> = {
    campaign_created: "purple",
    email_sent: "blue",
    lead_added: "green",
    meeting_booked: "yellow",
    ai_generated: "cyan",
  };
  const color = colors[activity.type] || "gray";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", `bg-${color}-500/10`)}>
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{activity.title}</div>
        <div className="text-xs text-gray-400">{activity.description}</div>
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0">{activity.timestamp}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [datePreset, setDatePreset] = useState("last_30_days");
  const dateParams = { preset: datePreset };
  const { data: overview, isLoading: overviewLoading, isError: overviewError, error: overviewErr, refetch: refetchOverview } =
    useAnalyticsOverview(dateParams);
  const { data: leadAnalytics } = useLeadAnalytics(dateParams);
  const { data: campaignAnalytics } = useCampaignAnalytics(dateParams);
  const { data: aiAnalytics } = useAIAnalytics(dateParams);
  const { data: salesAnalytics } = useSalesAnalytics(dateParams);
  const { data: activityFeed } = useActivityFeed(8);
  const { data: quickStats } = useQuickStats();
  const { data: scrapingStats } = useScrapingStats();

  const chartData = useMemo(
    () => ({
      emailTrend: buildEmailTrendFromOverview(overview),
      funnel: buildFunnelFromOverview(overview),
      sources: buildSourcesFromLeadAnalytics(leadAnalytics),
      campaignPerformance: buildCampaignPerformance(campaignAnalytics),
      aiUsage: buildAiUsage(aiAnalytics),
    }),
    [overview, leadAnalytics, campaignAnalytics, aiAnalytics]
  );

  const emails = (overview as Record<string, unknown>)?.emails as Record<string, number> | undefined;
  const sent = emails?.sent ?? 0;
  const openRate = sent ? `${Math.round(((emails?.opened ?? 0) / sent) * 1000) / 10}%` : "0%";
  const replyRate = sent ? `${Math.round(((emails?.replied ?? 0) / sent) * 1000) / 10}%` : "0%";
  const clickRate = sent ? `${Math.round(((emails?.clicked ?? 0) / sent) * 1000) / 10}%` : "0%";

  const totalLeads = (overview as any)?.leads?.total ?? (leadAnalytics as any)?.total ?? quickStats?.total_leads ?? 0;
  const sourceCount = ((leadAnalytics as any)?.sources as unknown[])?.length ?? 0;
  const salesOverview = (overview as any)?.sales as Record<string, number> | undefined;
  const meetingsBooked = salesOverview?.meetings_booked ?? 0;
  const positiveReplies = salesOverview?.positive_replies ?? 0;
  const dealsWon = (salesAnalytics as any)?.won ?? 0;
  const dealsTotal = (salesAnalytics as any)?.total_deals ?? 0;
  const aiGenerations = (aiAnalytics as any)?.total_generations ?? 0;
  const aiEnrichments = (aiAnalytics as any)?.total_enrichments ?? 0;
  const scrapingJobs = (scrapingStats as any)?.total_jobs ?? 0;
  const scrapingCompleted = (scrapingStats as any)?.completed ?? 0;
  const scrapingFailed = (scrapingStats as any)?.failed ?? 0;
  const scrapingSuccessRate =
    scrapingJobs > 0 ? `${Math.round((scrapingCompleted / scrapingJobs) * 1000) / 10}%` : "0%";

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "campaigns", label: "Campaigns", icon: Target },
    { id: "leads", label: "Leads", icon: Users },
    { id: "sales", label: "Sales", icon: DollarSign },
    { id: "ai", label: "AI", icon: Bot },
    { id: "system", label: "System", icon: Activity },
  ];

  const presets = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "last_7_days", label: "7 Days" },
    { id: "last_30_days", label: "30 Days" },
    { id: "this_month", label: "This Month" },
    { id: "this_quarter", label: "This Quarter" },
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await refetchOverview();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: string = "csv") => {
    toast.info("Exporting data...", `Format: ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {overviewError && (
        <PageError
          message={(overviewErr as any)?.response?.data?.detail || "Could not load analytics overview."}
          onRetry={() => refetchOverview()}
        />
      )}
      {overviewLoading && !overview && <PageLoading label="Loading analytics..." />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-400">Track performance across all campaigns and activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport("csv")}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setDatePreset(preset.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              datePreset === preset.id
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
        <div className="border-b border-white/5">
          <div className="flex items-center gap-1 p-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-purple-500/10 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {(activeTab === "overview" || activeTab === "campaigns") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Emails Sent" value={sent.toLocaleString()} icon={Mail} color="purple" subValue="from API overview" />
                <StatCard label="Open Rate" value={openRate} icon={Eye} color="blue" subValue={`${emails?.opened ?? 0} opened`} />
                <StatCard label="Reply Rate" value={replyRate} icon={MessageSquare} color="green" subValue={`${emails?.replied ?? 0} replied`} />
                <StatCard label="Click Rate" value={clickRate} icon={MousePointerClick} color="yellow" subValue={`${emails?.clicked ?? 0} clicked`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Email Trend
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400" />Sent</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-400" />Opened</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" />Replied</span>
                    </div>
                  </div>
                  {chartData.emailTrend.length > 0 ? (
                    <SimpleBarChart data={chartData.emailTrend} height={220} />
                  ) : (
                    <p className="text-sm text-gray-500 py-16 text-center">No email activity in this period yet.</p>
                  )}
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Conversion Funnel
                  </h3>
                  {chartData.funnel.length > 0 ? (
                    <FunnelChart data={chartData.funnel} />
                  ) : (
                    <p className="text-sm text-gray-500 py-16 text-center">No funnel data yet.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Campaign Performance
                  </h3>
                  {chartData.campaignPerformance.length > 0 ? (
                    <SimpleBarChart data={chartData.campaignPerformance} height={200} />
                  ) : (
                    <p className="text-sm text-gray-500 py-16 text-center">No campaigns yet.</p>
                  )}
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Lead Sources
                  </h3>
                  {chartData.sources.length > 0 ? (
                    <DonutChart data={chartData.sources} size={180} />
                  ) : (
                    <p className="text-sm text-gray-500 py-16 text-center">No lead sources yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "leads") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Leads" value={Number(totalLeads).toLocaleString()} icon={Users} color="purple" subValue="from API" />
                <StatCard label="Lead Sources" value={String(sourceCount)} icon={Globe} color="green" subValue="distinct sources" />
                <StatCard label="Active Campaigns" value={String((overview as any)?.campaigns?.active ?? quickStats?.active_campaigns ?? 0)} icon={Target} color="yellow" />
                <StatCard label="Emails Sent Today" value={String((quickStats as any)?.emails_sent_today ?? 0)} icon={Mail} color="blue" />
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "sales") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Meetings Booked" value={String(meetingsBooked)} icon={Calendar} color="purple" subValue="from overview" />
                <StatCard label="Positive Replies" value={String(positiveReplies)} icon={MessageSquare} color="green" />
                <StatCard label="Deals Won" value={String(dealsWon)} icon={CheckCircle} color="yellow" subValue={`${dealsTotal} total deals`} />
                <StatCard label="Pipeline Value" value={`$${((salesAnalytics as any)?.value ?? 0).toLocaleString()}`} icon={DollarSign} color="cyan" />
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  Sales Funnel
                </h3>
                {Number(totalLeads) > 0 ? (
                  <FunnelChart data={[
                    { name: "Leads", value: Number(totalLeads), percentage: 100, color: "#8B5CF6" },
                    { name: "Meetings", value: meetingsBooked, percentage: Math.round((meetingsBooked / Number(totalLeads)) * 1000) / 10, color: "#06B6D4" },
                    { name: "Positive Replies", value: positiveReplies, percentage: Math.round((positiveReplies / Number(totalLeads)) * 1000) / 10, color: "#10B981" },
                    { name: "Deals Won", value: dealsWon, percentage: Math.round((dealsWon / Number(totalLeads)) * 1000) / 10, color: "#F59E0B" },
                  ]} />
                ) : (
                  <p className="text-sm text-gray-500 py-16 text-center">No sales funnel data yet.</p>
                )}
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "ai") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="AI Generations" value={aiGenerations.toLocaleString()} icon={Sparkles} color="purple" />
                <StatCard label="Enrichments" value={aiEnrichments.toLocaleString()} icon={Zap} color="cyan" />
                <StatCard label="Combined Usage" value={(aiGenerations + aiEnrichments).toLocaleString()} icon={Bot} color="green" />
                <StatCard label="Period" value={datePreset.replace(/_/g, " ")} icon={Clock} color="yellow" />
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  AI Usage by Feature
                </h3>
                {chartData.aiUsage.length > 0 ? (
                  <SimpleBarChart data={chartData.aiUsage} height={220} />
                ) : (
                  <p className="text-sm text-gray-500 py-16 text-center">No AI usage recorded yet.</p>
                )}
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "system") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Scraping Jobs" value={scrapingJobs.toLocaleString()} icon={Globe} color="purple" />
                <StatCard label="Completed" value={scrapingCompleted.toLocaleString()} icon={CheckCircle} color="green" />
                <StatCard label="Success Rate" value={scrapingSuccessRate} icon={Target} color="yellow" />
                <StatCard label="Failed Jobs" value={scrapingFailed.toLocaleString()} icon={AlertTriangle} color="red" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Recent Activity
          </h3>
          <div className="space-y-1">
            {(Array.isArray(activityFeed) && activityFeed.length > 0
              ? activityFeed.map((a: Record<string, unknown>) => ({
                  id: String(a.id),
                  type: String(a.type || "info"),
                  title: String(a.type || "Activity"),
                  description: String(a.description || ""),
                  timestamp: a.created_at ? new Date(String(a.created_at)).toLocaleString() : "",
                }))
              : []
            ).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            {(!activityFeed || (Array.isArray(activityFeed) && activityFeed.length === 0)) && (
              <p className="text-sm text-gray-500 text-center py-6">No recent activity.</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Alerts & Insights
          </h3>
          <p className="text-sm text-gray-500 py-6 text-center">
            Automated alerts will appear here when monitoring rules are configured.
          </p>
        </div>
      </div>
    </div>
  );
}