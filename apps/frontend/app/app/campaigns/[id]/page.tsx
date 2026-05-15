"use client";

import { useState, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  MoreHorizontal,
  Mail,
  Users,
  TrendingUp,
  MousePointerClick,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar,
  Zap,
  ChevronDown,
  Search,
  Filter,
  Download,
  RefreshCw,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed";
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
}

const campaign = {
  id: "1",
  name: "Enterprise SaaS Outreach",
  description: "Targeting VP and C-level executives at Series B-C startups",
  status: "active" as const,
  startDate: "2026-05-01",
  createdBy: "Sarah Chen",
  leads: 2847,
  sent: 12840,
  delivered: 12756,
  opened: 5423,
  clicked: 1117,
  replied: 3842,
  bounced: 84,
  unsubscribed: 12,
  openRate: 42.5,
  clickRate: 8.8,
  replyRate: 30.1,
  bounceRate: 0.7,
};

const leads: Lead[] = [
  { id: 1, name: "Sarah Chen", email: "sarah.chen@techscale.io", company: "TechScale Inc.", status: "replied", sentAt: "2026-05-01 09:00", openedAt: "2026-05-01 10:15", clickedAt: "2026-05-01 10:30", repliedAt: "2026-05-02 14:20" },
  { id: 2, name: "Michael Torres", email: "m.torres@dataflow.com", company: "DataFlow Systems", status: "clicked", sentAt: "2026-05-01 09:00", openedAt: "2026-05-01 11:45", clickedAt: "2026-05-01 12:00", repliedAt: null },
  { id: 3, name: "Emma Williams", email: "emma.w@cloudnine.co", company: "CloudNine Solutions", status: "opened", sentAt: "2026-05-01 09:00", openedAt: "2026-05-01 14:30", clickedAt: null, repliedAt: null },
  { id: 4, name: "James Miller", email: "james@nexusai.io", company: "Nexus AI", status: "delivered", sentAt: "2026-05-01 09:00", openedAt: null, clickedAt: null, repliedAt: null },
  { id: 5, name: "Lisa Park", email: "lisa.park@synthetix.com", company: "Synthetix Labs", status: "bounced", sentAt: "2026-05-01 09:00", openedAt: null, clickedAt: null, repliedAt: null },
  { id: 6, name: "David Kim", email: "d.kim@brightstack.io", company: "BrightStack", status: "replied", sentAt: "2026-05-01 09:00", openedAt: "2026-05-01 16:00", clickedAt: "2026-05-01 16:15", repliedAt: "2026-05-03 09:00" },
  { id: 7, name: "Alex Johnson", email: "alex@startupxyz.com", company: "StartupXYZ", status: "opened", sentAt: "2026-05-01 09:00", openedAt: "2026-05-02 08:00", clickedAt: null, repliedAt: null },
  { id: 8, name: "Rachel Green", email: "rachel@acmeco.com", company: "Acme Corp", status: "unsubscribed", sentAt: "2026-05-01 09:00", openedAt: "2026-05-01 10:00", clickedAt: null, repliedAt: null },
];

const abTestResults = {
  variantA: { name: "Personalized", sent: 6420, opened: 2978, clicked: 687, replied: 2145, openRate: 46.4, clickRate: 10.7, replyRate: 33.4 },
  variantB: { name: "Generic", sent: 6420, opened: 2445, clicked: 430, replied: 1697, openRate: 38.1, clickRate: 6.7, replyRate: 26.4 },
  winner: "A",
};

const statusColors = {
  sent: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  delivered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  opened: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  clicked: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  replied: "bg-green-500/10 text-green-400 border-green-500/20",
  bounced: "bg-red-500/10 text-red-400 border-red-500/20",
  unsubscribed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const statusIcons = {
  sent: Mail,
  delivered: CheckCircle,
  opened: Mail,
  clicked: MousePointerClick,
  replied: TrendingUp,
  bounced: AlertCircle,
  unsubscribed: AlertCircle,
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showABTest, setShowABTest] = useState(false);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { label: "Sent", value: campaign.sent.toLocaleString(), icon: Mail, color: "purple" },
    { label: "Delivered", value: campaign.delivered.toLocaleString(), icon: CheckCircle, color: "blue" },
    { label: "Opened", value: campaign.opened.toLocaleString(), icon: Mail, color: "yellow" },
    { label: "Clicked", value: campaign.clicked.toLocaleString(), icon: MousePointerClick, color: "green" },
    { label: "Replied", value: campaign.replied.toLocaleString(), icon: TrendingUp, color: "emerald" },
    { label: "Bounced", value: campaign.bounced.toLocaleString(), icon: AlertCircle, color: "red" },
  ];

  const colorMap: Record<string, string> = {
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  const getPercentage = (value: number, total: number) => {
    return Math.round((value / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 capitalize">
              {campaign.status}
            </Badge>
          </div>
          <p className="text-gray-400">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "active" ? (
            <Button variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause Campaign
            </Button>
          ) : (
            <Button className="gap-2">
              <Play className="w-4 h-4" />
              Resume Campaign
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Started: {campaign.startDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{campaign.leads.toLocaleString()} leads</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Created by:</span>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            {campaign.createdBy.charAt(0)}
          </div>
          <span>{campaign.createdBy}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorMap[stat.color])}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
              {stat.label !== "Sent" && stat.label !== "Bounced" && (
                <div className="text-xs text-gray-500 mt-1">
                  {getPercentage(stat.value as unknown as number, campaign.sent)}%
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h3 className="text-lg font-semibold mb-6">Performance Breakdown</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Open Rate</span>
                <span className="font-medium">{campaign.openRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${campaign.openRate}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Click Rate</span>
                <span className="font-medium">{campaign.clickRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${campaign.clickRate}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Reply Rate</span>
                <span className="font-medium">{campaign.replyRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${campaign.replyRate}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Bounce Rate</span>
                <span className="font-medium">{campaign.bounceRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${campaign.bounceRate}%` }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Email Flow</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Initial Email</div>
                <div className="text-xs text-gray-400">Sent to {campaign.leads} leads</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{campaign.openRate}%</div>
                <div className="text-xs text-gray-400">opened</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Follow-up</div>
                <div className="text-xs text-gray-400">After 2 days</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{campaign.clickRate}%</div>
                <div className="text-xs text-gray-400">clicked</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Final Follow-up</div>
                <div className="text-xs text-gray-400">After 4 days</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{campaign.replyRate}%</div>
                <div className="text-xs text-gray-400">replied</div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 gap-2"
            onClick={() => setShowABTest(!showABTest)}
          >
            <FlaskConical className="w-4 h-4" />
            View A/B Test Results
          </Button>
        </div>
      </div>

      {showABTest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/5 to-transparent"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold">A/B Test Results</h3>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                Winner: Variant A
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-white/5 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">{abTestResults.variantA.name}</span>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  +{Math.round((abTestResults.variantA.replyRate - abTestResults.variantB.replyRate) / abTestResults.variantB.replyRate * 100)}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Sent</div>
                  <div className="font-semibold">{abTestResults.variantA.sent.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Open Rate</div>
                  <div className="font-semibold">{abTestResults.variantA.openRate}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Click Rate</div>
                  <div className="font-semibold">{abTestResults.variantA.clickRate}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Reply Rate</div>
                  <div className="font-semibold text-green-400">{abTestResults.variantA.replyRate}%</div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">{abTestResults.variantB.name}</span>
                <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                  Control
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Sent</div>
                  <div className="font-semibold">{abTestResults.variantB.sent.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Open Rate</div>
                  <div className="font-semibold">{abTestResults.variantB.openRate}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Click Rate</div>
                  <div className="font-semibold">{abTestResults.variantB.clickRate}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Reply Rate</div>
                  <div className="font-semibold text-gray-300">{abTestResults.variantB.replyRate}%</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Leads</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="replied">Replied</option>
              <option value="bounced">Bounced</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Lead</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Company</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Sent</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Opened</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Clicked</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Replied</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const StatusIcon = statusIcons[lead.status];
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-gray-400">{lead.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{lead.company}</td>
                    <td className="py-3 px-4">
                      <Badge className={cn("capitalize gap-1", statusColors[lead.status])}>
                        <StatusIcon className="w-3 h-3" />
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{lead.sentAt}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {lead.openedAt || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {lead.clickedAt || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {lead.repliedAt ? (
                        <span className="text-green-400">{lead.repliedAt}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No leads found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}