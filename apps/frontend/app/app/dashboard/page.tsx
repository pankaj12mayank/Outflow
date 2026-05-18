"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/app/hooks";
import { cn } from "@/app/lib/utils";
import { ScrollReveal, ScrollProgress } from "@/app/components/premium";

const stats: {
  name: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
  color: "purple" | "green";
}[] = [
  {
    name: "Total Leads",
    value: "12,847",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "purple",
  },
  {
    name: "Active Campaigns",
    value: "24",
    change: "+3",
    trend: "up",
    icon: Target,
    color: "green",
  },
  {
    name: "Emails Sent",
    value: "89.2K",
    change: "+18%",
    trend: "up",
    icon: Mail,
    color: "purple",
  },
  {
    name: "Avg. Reply Rate",
    value: "23.4%",
    change: "+5.2%",
    trend: "up",
    icon: TrendingUp,
    color: "green",
  },
];

const recentActivity = [
  {
    id: 1,
    type: "email_sent",
    message: "Email sent to Sarah Chen (TechScale)",
    time: "2 minutes ago",
    status: "success",
  },
  {
    id: 2,
    type: "lead_enriched",
    message: "Lead enriched: Michael Torres (DataFlow)",
    time: "15 minutes ago",
    status: "success",
  },
  {
    id: 3,
    type: "campaign_started",
    message: "Q2 Outreach Campaign launched",
    time: "1 hour ago",
    status: "success",
  },
  {
    id: 4,
    type: "sequence_completed",
    message: "Sequence completed for 47 leads",
    time: "2 hours ago",
    status: "success",
  },
  {
    id: 5,
    type: "reply_received",
    message: "New reply from Emma Williams (CloudNine)",
    time: "3 hours ago",
    status: "success",
  },
];

const topCampaigns = [
  {
    name: "Enterprise SaaS Outreach",
    leads: 2847,
    sent: 12840,
    replies: 3842,
    replyRate: 29.9,
    status: "active",
  },
  {
    name: "Q2 Product Launch",
    leads: 1923,
    sent: 8640,
    replies: 2156,
    replyRate: 24.9,
    status: "active",
  },
  {
    name: "Cold Email A/B Test",
    leads: 856,
    sent: 4280,
    replies: 1072,
    replyRate: 25.1,
    status: "active",
  },
];

const upcomingTasks = [
  {
    id: 1,
    title: "Review Q2 campaign performance",
    time: "Today, 2:00 PM",
    type: "meeting",
  },
  {
    id: 2,
    title: "Approve new lead list",
    time: "Today, 4:00 PM",
    type: "review",
  },
  {
    id: 3,
    title: "Update email templates",
    time: "Tomorrow, 10:00 AM",
    type: "task",
  },
];

function StatCard({
  name,
  value,
  change,
  trend,
  icon: Icon,
  color,
}: {
  name: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
  color: "purple" | "green";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            color === "purple"
              ? "bg-purple-500/10 border border-purple-500/20"
              : "bg-green-500/10 border border-green-500/20"
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              color === "purple" ? "text-purple-400" : "text-green-400"
            )}
          />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend === "up" ? "text-green-400" : "text-red-400"
          )}
        >
          {trend === "up" ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {change}
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

  const dateOptions = [
    "Last 7 days",
    "Last 30 days",
    "Last 90 days",
    "This month",
    "Last month",
    "Custom",
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <ScrollReveal
            key={stat.name}
            animation="slide-up"
            delay={i * 100}
          >
            <StatCard {...stat} />
          </ScrollReveal>
        ))}
      </div>

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
          <div className="space-y-4">
            {topCampaigns.map((campaign, i) => (
              <motion.div
                key={campaign.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => router.push(`/app/campaigns/${i + 1}`)}
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
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, i) => (
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
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
<div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Upcoming Tasks</h2>
            <button 
              onClick={() => router.push("/app/calendar")}
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              View calendar
            </button>
          </div>
        <div className="grid md:grid-cols-3 gap-4">
          {upcomingTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xs text-gray-400">{task.time}</div>
              </div>
              <div className="font-medium">{task.title}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-xl font-bold mb-6">Reply Rate Trend</h2>
          <div className="h-48 flex items-end justify-between gap-2">
            {[65, 72, 68, 78, 82, 75, 88, 92, 85, 95, 88, 98].map((value, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${value}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400"
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-xl font-bold mb-6">Lead Sources</h2>
          <div className="space-y-4">
            {[
              { source: "LinkedIn", count: 4823, percentage: 38 },
              { source: "Cold Outreach", count: 3240, percentage: 25 },
              { source: "Referrals", count: 2156, percentage: 17 },
              { source: "Webinars", count: 1892, percentage: 15 },
              { source: "Other", count: 736, percentage: 5 },
            ].map((item, i) => (
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
        </div>
      </div>
    </div>
  );
}