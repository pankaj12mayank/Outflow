"use client";

import { useState, use, useMemo } from "react";
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
  Calendar,
  Search,
  Download,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useCampaign, useCampaignStats, useCampaignEmails, useLaunchCampaign, usePauseCampaign } from "@/app/hooks/use-campaigns";
import { PageError, PageLoading } from "@/app/components/page-state";
import { toast } from "@/app/components/toast";

type LeadStatus = "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed" | "pending" | "failed";

interface Lead {
  id: string | number;
  name: string;
  email: string;
  company: string;
  status: LeadStatus;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
}

function mapCampaignView(raw: Record<string, unknown>, stats: Record<string, unknown>) {
  const sent = Number(raw.emails_sent ?? 0);
  const opened = Number(raw.emails_opened ?? 0);
  const clicked = Number(raw.emails_clicked ?? 0);
  const replied = Number(raw.emails_replied ?? 0);
  const bounced = Number(raw.emails_bounced ?? 0);
  const pct = (n: number) => (sent ? Math.round((n / sent) * 1000) / 10 : 0);
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Campaign"),
    description: String(raw.description ?? ""),
    status: String(raw.status ?? "draft"),
    startDate: String(raw.started_at ?? raw.created_at ?? "").slice(0, 10) || "—",
    createdBy: "—",
    leads: Number(stats.total_leads ?? raw.lead_count ?? 0),
    sent,
    delivered: Number(raw.emails_delivered ?? sent),
    opened,
    clicked,
    replied,
    bounced,
    unsubscribed: 0,
    openRate: pct(opened),
    clickRate: pct(clicked),
    replyRate: pct(replied),
    bounceRate: pct(bounced),
  };
}

function mapEmailRow(e: Record<string, unknown>): Lead {
  const status = (String(e.status || "sent").toLowerCase() as LeadStatus) || "sent";
  const created = String(e.created_at ?? "");
  return {
    id: String(e.id ?? e._id ?? Math.random()),
    name: String(e.to_email ?? e.from_email ?? "Contact").split("@")[0],
    email: String(e.to_email ?? ""),
    company: "—",
    status,
    sentAt: created ? new Date(created).toLocaleString() : "—",
    openedAt: null,
    clickedAt: null,
    repliedAt: null,
  };
}

const statusColors = {
  sent: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  delivered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  opened: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  clicked: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  replied: "bg-green-500/10 text-green-400 border-green-500/20",
  bounced: "bg-red-500/10 text-red-400 border-red-500/20",
  unsubscribed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  pending: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusIcons: Record<string, typeof Mail> = {
  sent: Mail,
  delivered: CheckCircle,
  opened: Mail,
  clicked: MousePointerClick,
  replied: TrendingUp,
  bounced: AlertCircle,
  unsubscribed: AlertCircle,
  pending: Mail,
  failed: AlertCircle,
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const { data: rawCampaign, isLoading, isError, error, refetch } = useCampaign(campaignId);
  const { data: stats } = useCampaignStats(campaignId);
  const { data: emailsData } = useCampaignEmails(campaignId, { limit: 100 });
  const launchMutation = useLaunchCampaign();
  const pauseMutation = usePauseCampaign();

  const campaign = useMemo(
    () => (rawCampaign ? mapCampaignView(rawCampaign as Record<string, unknown>, (stats as Record<string, unknown>) || {}) : null),
    [rawCampaign, stats]
  );

  const leads: Lead[] = useMemo(() => {
    const list = Array.isArray(emailsData) ? emailsData : [];
    return list.map((e: Record<string, unknown>) => mapEmailRow(e));
  }, [emailsData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showABTest, setShowABTest] = useState(false);

  if (isLoading && !campaign) {
    return <PageLoading label="Loading campaign..." />;
  }

  if (isError || !campaign) {
    return (
      <PageError
        message={(error as any)?.response?.data?.detail || "Campaign not found."}
        onRetry={() => refetch()}
      />
    );
  }

  const handleToggleRun = async () => {
    try {
      if (campaign.status === "running" || campaign.status === "active") {
        await pauseMutation.mutateAsync(campaignId);
        toast.success("Campaign paused");
      } else {
        await launchMutation.mutateAsync(campaignId);
        toast.success("Campaign launched");
      }
      refetch();
    } catch (e: any) {
      toast.error("Action failed", e?.response?.data?.detail || e?.message);
    }
  };

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
          {campaign.status === "running" || campaign.status === "active" ? (
            <Button variant="outline" className="gap-2" onClick={handleToggleRun} disabled={pauseMutation.isPending}>
              <Pause className="w-4 h-4" />
              Pause Campaign
            </Button>
          ) : (
            <Button className="gap-2" onClick={handleToggleRun} disabled={launchMutation.isPending}>
              <Play className="w-4 h-4" />
              Launch Campaign
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
          <div className="flex items-center gap-3 mb-4">
            <FlaskConical className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold">A/B Test Results</h3>
          </div>
          <p className="text-sm text-gray-400">A/B test metrics are not configured for this campaign yet.</p>
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
                const StatusIcon = statusIcons[lead.status] || Mail;
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