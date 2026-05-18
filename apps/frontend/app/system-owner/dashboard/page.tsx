"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Users, Activity, Monitor, Zap, Globe, Database,
  TrendingUp, TrendingDown, Mail, Target, Calendar, 
  Bot, Server, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign,
  Building2, Layers, Search, Play, Pause, BarChart3,
  ChevronRight, Settings, Bell, Home
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";
import { Button, Card, CardHeader, CardContent, CardTitle, CardDescription, StatCard } from "@/app/components/premium";
import { ChartContainer, LineChart, AreaChart, BarChart, DonutChart, Sparkline } from "@/app/components/premium/chart";
import { Skeleton, StatsSkeleton, ChartSkeleton, DashboardSkeleton } from "@/app/components/premium/skeleton";
import { Badge, StatusBadge, CountBadge } from "@/app/components/premium/badge";
import { Tabs, TabList, TabTrigger, TabContent } from "@/app/components/premium/tabs";
import { Breadcrumb, BreadcrumbItem } from "@/app/components/premium/navigation";
import { Alert, AlertBanner } from "@/app/components/premium/alert";
import { ScrollReveal, ScrollProgress } from "@/app/components/premium";

interface DashboardData {
  overview: any;
  subscriptions: any;
  revenue: any;
  ai_usage: any;
  smtp: any;
  scraping: any;
  workers: any;
  queue: any;
  campaigns: any;
  leads: any;
  meetings: any;
  generated_at: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const colorMap: Record<string, string> = {
  green: "#4ade80",
  blue: "#60a5fa",
  purple: "#a78bfa",
  cyan: "#22d3ee",
  orange: "#fb923c",
  yellow: "#fbbf24",
  pink: "#f472b6",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  emerald: "#34d399",
  amber: "#f59e0b",
};

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  delay?: number;
  sparkline?: number[];
}

function MetricCard({ title, value, change, icon: Icon, color, delay = 0, sparkline }: MetricCardProps) {
  const iconColor = colorMap[color] || colorMap.purple;
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-border-hover)] transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className="p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </motion.div>
          {change !== undefined && (
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isPositive 
                  ? "text-green-400 bg-green-400/10" 
                  : "text-red-400 bg-red-400/10"
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </motion.div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{value}</div>
        <div className="text-sm text-[var(--color-text-tertiary)]">{title}</div>
        
        {sparkline && sparkline.length > 0 && (
          <div className="mt-4 h-12">
            <Sparkline data={sparkline} color={isPositive ? "#4ade80" : "#f87171"} height={48} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface HealthIndicatorProps {
  status: "healthy" | "warning" | "critical";
  label: string;
  value?: string | number;
  trend?: number;
}

function HealthIndicator({ status, label, value, trend }: HealthIndicatorProps) {
  const colors = {
    healthy: { bg: "bg-green-500", glow: "shadow-[0_0_12px_rgba(74,222,128,0.5)]", text: "text-green-400" },
    warning: { bg: "bg-yellow-500", glow: "shadow-[0_0_12px_rgba(251,191,36,0.5)]", text: "text-yellow-400" },
    critical: { bg: "bg-red-500", glow: "shadow-[0_0_12px_rgba(248,113,113,0.5)]", text: "text-red-400" }
  };
  const style = colors[status];
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-4 bg-[var(--color-bg-tertiary)] rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors"
    >
      <div className={`w-3 h-3 rounded-full ${style.bg} ${style.glow} transition-all duration-300`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">{label}</div>
        {value !== undefined && <div className="text-xs text-[var(--color-text-tertiary)]">{value}</div>}
      </div>
      {trend !== undefined && (
        <div className={trend >= 0 ? "text-green-400" : "text-red-400"}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        </div>
      )}
    </motion.div>
  );
}

export default function SystemOwnerDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useSystemOwnerAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.get("/api/v1/system-owner-dashboard/comprehensive", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  if (authLoading || loading) {
    return <DashboardSkeleton tabs={true} sidebar={false} />;
  }

  if (!isAuthenticated || !data) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "platform", label: "Platform", icon: Server },
    { id: "health", label: "Health", icon: Activity },
  ];

  const generateSparkline = (base: number, variance: number = 20) => {
    return Array.from({ length: 7 }, (_, i) => base + (Math.random() - 0.5) * variance);
  };

  const tabContent = {
    overview: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Monthly Recurring Revenue" value={formatCurrency(data.subscriptions.mrr)} icon={DollarSign} color="green" change={12} sparkline={generateSparkline(45)} />
          <MetricCard title="Annual Recurring Revenue" value={formatCurrency(data.subscriptions.arr)} icon={TrendingUp} color="blue" change={8} sparkline={generateSparkline(50)} />
          <MetricCard title="Active Subscriptions" value={data.subscriptions.total_subscriptions} icon={Users} color="purple" change={5} sparkline={generateSparkline(35)} />
          <MetricCard title="Total Organizations" value={data.overview.total_organizations} icon={Building2} color="cyan" change={3} sparkline={generateSparkline(40)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Campaigns" value={data.overview.total_campaigns} icon={Target} color="orange" sparkline={generateSparkline(25)} />
          <MetricCard title="Active Campaigns" value={data.overview.active_campaigns} icon={Play} color="green" change={15} sparkline={generateSparkline(30)} />
          <MetricCard title="Total Leads" value={data.overview.total_leads} icon={Users} color="yellow" sparkline={generateSparkline(55)} />
          <MetricCard title="Leads (30d)" value={data.leads.leads_30d} icon={TrendingUp} color="emerald" change={22} sparkline={generateSparkline(60)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartContainer title="Revenue Trend (30d)" subtitle="Daily revenue breakdown" variant="glass">
            {data.revenue.daily_breakdown && (
              <AreaChart
                data={data.revenue.daily_breakdown}
                dataKey="revenue"
                colors={["#a78bfa"]}
                height={200}
              />
            )}
          </ChartContainer>

          <ChartContainer title="Campaign Performance" subtitle="Key metrics" variant="glass">
            <div className="space-y-4">
              {[
                { label: "Open Rate", value: data.campaigns.open_rate, color: "#4ade80" },
                { label: "Click Rate", value: data.campaigns.click_rate, color: "#60a5fa" },
                { label: "Reply Rate", value: data.campaigns.reply_rate, color: "#a78bfa" },
              ].map((metric, i) => (
                <motion.div 
                  key={metric.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex justify-between items-center p-3 bg-[var(--color-bg-tertiary)] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} />
                    <span className="text-[var(--color-text-secondary)]">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                    </div>
                    <span className="text-[var(--color-text-primary)] font-semibold w-14 text-right">{metric.value}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartContainer>

          <ChartContainer title="Task Queue" subtitle="Worker status" variant="glass">
            <div className="space-y-4">
              {[
                { label: "Active Workers", value: data.workers.active_workers, color: "#4ade80" },
                { label: "Pending Tasks", value: data.workers.pending_tasks, color: "#fbbf24" },
                { label: "Success Rate (1h)", value: `${data.workers.success_rate}%`, color: "#a78bfa" },
              ].map((metric, i) => (
                <motion.div 
                  key={metric.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex justify-between items-center p-3 bg-[var(--color-bg-tertiary)] rounded-xl"
                >
                  <span className="text-[var(--color-text-secondary)]">{metric.label}</span>
                  <span className="text-[var(--color-text-primary)] font-semibold" style={{ color: metric.color }}>{metric.value}</span>
                </motion.div>
              ))}
            </div>
          </ChartContainer>
        </div>
      </motion.div>
    ),
    revenue: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Monthly Recurring Revenue", value: formatCurrency(data.subscriptions.mrr), icon: DollarSign, color: "#4ade80", gradient: "from-green-500/20 to-green-600/10" },
            { label: "Annual Recurring Revenue", value: formatCurrency(data.subscriptions.arr), icon: TrendingUp, color: "#60a5fa", gradient: "from-blue-500/20 to-blue-600/10" },
            { label: "Avg. Subscription Value", value: formatCurrency(data.subscriptions.avg_subscription_value), icon: BarChart3, color: "#a78bfa", gradient: "from-purple-500/20 to-purple-600/10" },
          ].map((item, i) => (
            <motion.div 
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${item.gradient} border border-${item.color}/20 rounded-2xl p-6`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-sm" style={{ color: item.color }}>{item.label}</span>
              </div>
              <div className="text-4xl font-bold text-[var(--color-text-primary)]">{item.value}</div>
              <div className="text-sm mt-2" style={{ color: `${item.color}80` }}>per month</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Revenue Breakdown by Day" subtitle={`Last ${data.revenue.period_days} days`} variant="glass">
            {data.revenue.daily_breakdown && (
              <AreaChart
                data={data.revenue.daily_breakdown}
                dataKey="revenue"
                colors={["#a78bfa", "#4ade80"]}
                height={250}
                showLegend
              />
            )}
          </ChartContainer>

          <ChartContainer title="Revenue Distribution" subtitle="By subscription tier" variant="glass">
            <DonutChart
              data={[
                { name: "Enterprise", value: 45000 },
                { name: "Professional", value: 28000 },
                { name: "Starter", value: 12000 },
                { name: "Free", value: 5000 },
              ]}
              nameKey="name"
              valueKey="value"
              colors={["#a78bfa", "#4ade80", "#60a5fa", "#fbbf24"]}
              height={250}
              centerLabel="Total"
              centerValue={formatCurrency(data.revenue.total_revenue)}
            />
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: formatCurrency(data.revenue.total_revenue) },
            { label: "New Subscriptions", value: data.revenue.total_new_subscriptions },
            { label: "Avg Revenue/Day", value: formatCurrency(data.revenue.avg_revenue_per_day) },
            { label: "Active Subs", value: data.subscriptions.total_subscriptions },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl"
            >
              <div className="text-[var(--color-text-tertiary)] text-sm">{item.label}</div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{item.value}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
    platform: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Users" value={data.overview.total_users} icon={Users} color="blue" sparkline={generateSparkline(40)} />
          <MetricCard title="Organizations" value={data.overview.total_organizations} icon={Building2} color="cyan" sparkline={generateSparkline(35)} />
          <MetricCard title="Total Campaigns" value={data.overview.total_campaigns} icon={Target} color="orange" sparkline={generateSparkline(30)} />
          <MetricCard title="Leads Generated" value={data.overview.total_leads} icon={Users} color="yellow" change={18} sparkline={generateSparkline(45)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartContainer title="Campaign Status" subtitle="Distribution by status" variant="glass">
            <DonutChart
              data={Object.entries(data.campaigns.status_breakdown || {}).map(([status, count]) => ({ name: status, value: count }))}
              nameKey="name"
              valueKey="value"
              colors={["#4ade80", "#60a5fa", "#fbbf24", "#f87171"]}
              height={200}
            />
          </ChartContainer>

          <ChartContainer title="AI Usage by Model" subtitle="Generations per model" variant="glass">
            {data.ai_usage.model_usage && (
              <BarChart
                data={data.ai_usage.model_usage}
                dataKey="total"
                xKey="model"
                colors={["#a78bfa"]}
                horizontal
                height={180}
              />
            )}
          </ChartContainer>

          <ChartContainer title="Lead Sources (30d)" subtitle="By acquisition channel" variant="glass">
            {data.leads.sources && (
              <BarChart
                data={data.leads.sources}
                dataKey="count"
                xKey="source"
                colors={["#4ade80"]}
                horizontal
                height={180}
              />
            )}
          </ChartContainer>
        </div>
      </motion.div>
    ),
    health: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="SMTP Configs" value={`${data.smtp.active_configs}/${data.smtp.total_configs}`} icon={Mail} color="blue" />
          <MetricCard title="Emails (24h)" value={data.smtp.emails_sent_24h} icon={Mail} color="green" change={5} />
          <MetricCard title="Delivery Rate" value={data.smtp.delivery_rate + "%"} icon={CheckCircle} color="emerald" change={2} />
          <MetricCard title="Bounce Rate" value={data.smtp.bounce_rate + "%"} icon={AlertTriangle} color={data.smtp.bounce_rate < 5 ? "green" : "yellow"} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Scraping Jobs" value={data.scraping.total_jobs} icon={Search} color="amber" />
          <MetricCard title="Completed (24h)" value={data.scraping.completed_24h} icon={CheckCircle} color="green" change={12} />
          <MetricCard title="Failed (24h)" value={data.scraping.failed_24h} icon={XCircle} color={data.scraping.failed_24h < 10 ? "green" : "red"} />
          <MetricCard title="Success Rate" value={data.scraping.success_rate + "%"} icon={TrendingUp} color="emerald" change={3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="SMTP Health" subtitle="Connection and delivery status" variant="glass">
            <div className="space-y-3">
              <HealthIndicator 
                status={data.smtp.active_configs > 0 ? "healthy" : "critical"} 
                label="SMTP Connections" 
                value={`${data.smtp.active_configs} active`}
              />
              <HealthIndicator 
                status={data.smtp.bounce_rate < 5 ? "healthy" : data.smtp.bounce_rate < 15 ? "warning" : "critical"} 
                label="Bounce Rate" 
                value={`${data.smtp.bounce_rate}%`}
                trend={-2}
              />
              <HealthIndicator 
                status={data.smtp.delivery_rate > 95 ? "healthy" : "warning"} 
                label="Delivery Rate" 
                value={`${data.smtp.delivery_rate}%`}
                trend={1}
              />
            </div>
          </ChartContainer>

          <ChartContainer title="Scraping Health" subtitle="Job success and failures" variant="glass">
            <div className="space-y-3">
              <HealthIndicator 
                status={data.scraping.success_rate > 80 ? "healthy" : data.scraping.success_rate > 60 ? "warning" : "critical"} 
                label="Success Rate" 
                value={`${data.scraping.success_rate}%`}
              />
              <HealthIndicator 
                status={data.scraping.failed_24h < 10 ? "healthy" : "warning"} 
                label="Failed Jobs (24h)" 
                value={data.scraping.failed_24h}
              />
              <HealthIndicator 
                status="healthy" 
                label="Queue Status" 
                value="Processing normally"
              />
            </div>
          </ChartContainer>
        </div>

        {data.queue.task_types && (
          <ChartContainer title="Task Types (24h)" subtitle="Distribution by category" variant="glass">
            <BarChart
              data={data.queue.task_types}
              dataKey="count"
              xKey="type"
              colors={["#a78bfa", "#4ade80", "#60a5fa"]}
              height={200}
            />
          </ChartContainer>
        )}
      </motion.div>
    ),
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <ScrollProgress />

      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center shadow-lg shadow-[var(--color-purple-glow)]"
              >
                <Shield className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Platform Dashboard</h1>
                <p className="text-xs text-[var(--color-text-tertiary)]">Real-time analytics & monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Breadcrumb>
                <BreadcrumbItem href="/system-owner">
                  <Home className="w-4 h-4" />
                </BreadcrumbItem>
                <BreadcrumbItem isActive>Dashboard</BreadcrumbItem>
              </Breadcrumb>

              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={fetchData}
                isLoading={isRefreshing}
                leftIcon={<RefreshCw className={isRefreshing ? "animate-spin" : "w-4 h-4"} />}
              >
                Refresh
              </Button>
            </div>
          </div>
          
          <div className="mt-4 -mb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} variant="pills" size="md">
              <TabList scrollable>
                {tabs.map((tab, i) => (
                  <TabTrigger key={tab.id} value={tab.id} icon={<tab.icon className="w-4 h-4" />}>
                    {tab.label}
                  </TabTrigger>
                ))}
              </TabList>
            </Tabs>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {tabContent[activeTab as keyof typeof tabContent]}
        </AnimatePresence>
      </main>
    </div>
  );
}