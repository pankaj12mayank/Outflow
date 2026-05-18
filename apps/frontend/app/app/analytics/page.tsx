"use client";

import { useState } from "react";
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

const chartData = {
  emailTrend: [
    { day: "Mon", sent: 120, opened: 48, replied: 12 },
    { day: "Tue", sent: 145, opened: 62, replied: 15 },
    { day: "Wed", sent: 98, opened: 41, replied: 8 },
    { day: "Thu", sent: 167, opened: 72, replied: 18 },
    { day: "Fri", sent: 134, opened: 58, replied: 14 },
    { day: "Sat", sent: 89, opened: 35, replied: 7 },
    { day: "Sun", sent: 76, opened: 29, replied: 5 },
  ],
  funnel: [
    { name: "Sent", value: 829, percentage: 100, color: "#8B5CF6" },
    { name: "Delivered", value: 813, percentage: 98, color: "#06B6D4" },
    { name: "Opened", value: 345, percentage: 42, color: "#10B981" },
    { name: "Clicked", value: 156, percentage: 19, color: "#F59E0B" },
    { name: "Replied", value: 79, percentage: 10, color: "#EF4444" },
  ],
  sources: [
    { name: "Google Maps", value: 35, color: "#8B5CF6" },
    { name: "CSV Import", value: 28, color: "#06B6D4" },
    { name: "Website Crawl", value: 22, color: "#10B981" },
    { name: "LinkedIn", value: 10, color: "#F59E0B" },
    { name: "API", value: 5, color: "#EF4444" },
  ],
  campaignPerformance: [
    { name: "Q1 Launch", sent: 1250, replied: 125, openRate: 42 },
    { name: "Follow-up", sent: 890, replied: 107, openRate: 38 },
    { name: "Re-engage", sent: 650, replied: 52, openRate: 28 },
    { name: "Product", sent: 420, replied: 38, openRate: 31 },
  ],
  aiUsage: [
    { feature: "Personalization", tokens: 45000, generations: 890 },
    { feature: "Subject Lines", tokens: 12000, generations: 456 },
    { feature: "CTAs", tokens: 8000, generations: 312 },
    { feature: "Reply Class.", tokens: 15000, generations: 567 },
    { feature: "Optimization", tokens: 22000, generations: 234 },
  ],
  dailyActivity: [
    { hour: "6AM", emails: 2, ai: 1 },
    { hour: "9AM", emails: 24, ai: 8 },
    { hour: "12PM", emails: 18, ai: 12 },
    { hour: "3PM", emails: 31, ai: 15 },
    { hour: "6PM", emails: 12, ai: 6 },
    { hour: "9PM", emails: 5, ai: 3 },
  ],
};

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
  const [datePreset, setDatePreset] = useState("last_30_days");
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

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleExport = (format: string = "csv") => {
    toast.info("Exporting data...", `Format: ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-400">Track performance across all campaigns and activities</p>
        </div>
        <div className="flex items-center gap-3">
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
                <StatCard label="Emails Sent" value="2,847" change="+12%" changeType="up" icon={Mail} color="purple" subValue="vs last period" />
                <StatCard label="Open Rate" value="42.3%" change="+3.2%" changeType="up" icon={Eye} color="blue" subValue="avg 38%" />
                <StatCard label="Reply Rate" value="9.5%" change="+1.8%" changeType="up" icon={MessageSquare} color="green" subValue="avg 7.2%" />
                <StatCard label="Click Rate" value="18.8%" change="-0.5%" changeType="down" icon={MousePointerClick} color="yellow" subValue="avg 20%" />
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
                  <SimpleBarChart data={chartData.emailTrend} height={220} />
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Conversion Funnel
                  </h3>
                  <FunnelChart data={chartData.funnel} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Campaign Performance
                  </h3>
                  <SimpleBarChart data={chartData.campaignPerformance} height={200} />
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Lead Sources
                  </h3>
                  <DonutChart data={chartData.sources} size={180} />
                </div>
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "leads") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Leads" value="12,847" change="+847" changeType="up" icon={Users} color="purple" />
                <StatCard label="Valid Emails" value="94.2%" change="+1.2%" changeType="up" icon={CheckCircle} color="green" />
                <StatCard label="Enriched" value="8,234" change="+234" changeType="up" icon={Zap} color="yellow" />
                <StatCard label="Avg Score" value="72" change="+5" changeType="up" icon={Target} color="blue" />
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "sales") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Meetings Booked" value="156" change="+23" changeType="up" icon={Calendar} color="purple" />
                <StatCard label="Completed" value="134" change="+18" changeType="up" icon={CheckCircle} color="green" />
                <StatCard label="Conversions" value="47" change="+8" changeType="up" icon={Target} color="yellow" />
                <StatCard label="Revenue" value="$34.5K" change="+12%" changeType="up" icon={DollarSign} color="cyan" />
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  Sales Funnel
                </h3>
                <FunnelChart data={[
                  { name: "Leads", value: 2847, percentage: 100, color: "#8B5CF6" },
                  { name: "Meetings", value: 156, percentage: 5.5, color: "#06B6D4" },
                  { name: "Qualified", value: 89, percentage: 3.1, color: "#10B981" },
                  { name: "Conversions", value: 47, percentage: 1.6, color: "#F59E0B" },
                ]} />
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "ai") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="AI Generations" value="2,459" change="+345" changeType="up" icon={Sparkles} color="purple" />
                <StatCard label="Tokens Used" value="102K" change="+12K" changeType="up" icon={Zap} color="cyan" />
                <StatCard label="Avg Latency" value="1.2s" change="-0.3s" changeType="positive" icon={Clock} color="green" />
                <StatCard label="Success Rate" value="98.5%" change="+0.5%" changeType="up" icon={CheckCircle} color="yellow" />
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  AI Usage by Feature
                </h3>
                <SimpleBarChart data={chartData.aiUsage} height={220} />
              </div>
            </>
          )}

          {(activeTab === "overview" || activeTab === "system") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Scraping Jobs" value="234" change="+45" changeType="up" icon={Globe} color="purple" />
                <StatCard label="Success Rate" value="94.2%" change="+2.1%" changeType="up" icon={CheckCircle} color="green" />
                <StatCard label="Items Extracted" value="28.4K" change="+4.2K" changeType="up" icon={Target} color="yellow" />
                <StatCard label="Error Rate" value="0.8%" change="-0.2%" changeType="positive" icon={AlertTriangle} color="red" />
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
            {[
              { id: "1", type: "campaign_created", title: "Q2 Outreach Campaign", description: "Created and launched", timestamp: "2 min ago" },
              { id: "2", type: "email_sent", title: "500 emails sent", description: "Via Follow-up sequence", timestamp: "15 min ago" },
              { id: "3", type: "lead_added", title: "47 new leads", description: "From Google Maps scrape", timestamp: "1 hour ago" },
              { id: "4", type: "ai_generated", title: "100 personalized emails", description: "Using llama3.2", timestamp: "2 hours ago" },
              { id: "5", type: "meeting_booked", title: "3 meetings booked", description: "via calendar links", timestamp: "3 hours ago" },
            ].map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Alerts & Insights
          </h3>
          <div className="space-y-3">
            {[
              { type: "warning", title: "High bounce rate detected", description: "Campaign 'Re-engage' has 8.2% bounce rate", time: "2 hours ago" },
              { type: "success", title: "Open rate improved", description: "Campaign 'Q1 Launch' increased open rate by 15%", time: "5 hours ago" },
              { type: "info", title: "AI quota at 75%", description: "You've used 75% of your monthly AI generation quota", time: "1 day ago" },
              { type: "warning", title: "Email account warmup", description: "sales@acme.com needs 10 more days of warmup", time: "2 days ago" },
            ].map((alert, i) => (
              <div key={i} className={cn(
                "p-4 rounded-xl border",
                alert.type === "warning" && "border-yellow-500/20 bg-yellow-500/5",
                alert.type === "success" && "border-green-500/20 bg-green-500/5",
                alert.type === "info" && "border-blue-500/20 bg-blue-500/5",
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm mb-1">{alert.title}</div>
                    <div className="text-xs text-gray-400">{alert.description}</div>
                  </div>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}