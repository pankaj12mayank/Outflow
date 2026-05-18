"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  Users,
  Mail,
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
  ChevronRight,
  Clock,
  Zap,
  X,
  Send,
  Eye,
  Copy,
  Edit3,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

interface Campaign {
  id: number;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  leads: number;
  sent: number;
  replied: number;
  replyRate: number;
  openRate: number;
  clickRate: number;
  startDate: string;
  createdBy: string;
  tags: string[];
}

const campaigns: Campaign[] = [
  {
    id: 1,
    name: "Enterprise SaaS Outreach",
    description: "Targeting VP and C-level executives at Series B-C startups",
    status: "active",
    leads: 2847,
    sent: 12840,
    replied: 3842,
    replyRate: 29.9,
    openRate: 42.3,
    clickRate: 8.7,
    startDate: "2026-05-01",
    createdBy: "Sarah Chen",
    tags: ["enterprise", "saas", "outreach"],
  },
  {
    id: 2,
    name: "Q2 Product Launch",
    description: "Announcing our new AI features to warm leads",
    status: "active",
    leads: 1923,
    sent: 8640,
    replied: 2156,
    replyRate: 24.9,
    openRate: 38.5,
    clickRate: 12.2,
    startDate: "2026-05-05",
    createdBy: "Michael Torres",
    tags: ["product", "launch", "warm"],
  },
  {
    id: 3,
    name: "Cold Email A/B Test",
    description: "Testing personalized vs generic subject lines",
    status: "draft",
    leads: 856,
    sent: 0,
    replied: 0,
    replyRate: 0,
    openRate: 0,
    clickRate: 0,
    startDate: "2026-05-20",
    createdBy: "Emma Williams",
    tags: ["testing", "cold", "ab-test"],
  },
  {
    id: 4,
    name: "Follow-up Sequence",
    description: "Re-engagement campaign for unresponsive leads",
    status: "paused",
    leads: 3421,
    sent: 15420,
    replied: 1542,
    replyRate: 10.0,
    openRate: 18.4,
    clickRate: 3.2,
    startDate: "2026-04-15",
    createdBy: "Sarah Chen",
    tags: ["follow-up", "re-engagement"],
  },
  {
    id: 5,
    name: "LinkedIn Warm Outreach",
    description: "Multi-channel approach combining LinkedIn + Email",
    status: "active",
    leads: 1256,
    sent: 6280,
    replied: 1884,
    replyRate: 30.0,
    openRate: 45.1,
    clickRate: 15.8,
    startDate: "2026-05-10",
    createdBy: "James Miller",
    tags: ["linkedin", "multi-channel", "warm"],
  },
];

const statusColors = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const statusFilters = ["All", "active", "paused", "completed", "draft"];

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [campaignList, setCampaignList] = useState(campaigns);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const router = useRouter();

  const filteredCampaigns = campaignList.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleCampaignStatus = (id: number) => {
    setCampaignList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          if (c.status === "draft") return { ...c, status: "active" as const };
          if (c.status === "active") return { ...c, status: "paused" as const };
          if (c.status === "paused") return { ...c, status: "active" as const };
        }
        return c;
      })
    );
  };

  const deleteCampaign = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      setCampaignList((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleViewCampaign = (id: number) => {
    router.push(`/app/campaigns/${id}`);
    setActiveMenu(null);
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const newCampaign = {
      ...campaign,
      id: Date.now(),
      name: `${campaign.name} (Copy)`,
      status: "draft" as const,
      sent: 0,
      replied: 0,
    };
    setCampaignList([...campaignList, newCampaign]);
    setActiveMenu(null);
    alert("Campaign duplicated!");
  };

  const totalEmailsSent = campaignList.reduce((sum, c) => sum + c.sent, 0);
  const activeCampaigns = campaignList.filter((c) => c.status === "active").length;
  const totalLeads = campaignList.reduce((sum, c) => sum + c.leads, 0);
  const avgOpenRate = campaignList.length > 0
    ? Math.round(campaignList.reduce((sum, c) => sum + c.openRate, 0) / campaignList.length * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
          <p className="text-gray-400">
            Create, manage, and track your outreach campaigns
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold">{activeCampaigns}</div>
          </div>
          <div className="text-gray-400 text-sm">Active Campaigns</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold">{totalLeads.toLocaleString()}</div>
          </div>
          <div className="text-gray-400 text-sm">Total Leads</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-3xl font-bold">{totalEmailsSent.toLocaleString()}</div>
          </div>
          <div className="text-gray-400 text-sm">Emails Sent</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold">{avgOpenRate}%</div>
          </div>
          <div className="text-gray-400 text-sm">Open Rate</div>
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                statusFilter === status
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredCampaigns.map((campaign, i) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-all"
          >
            <div className="flex items-start gap-6">
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  campaign.status === "active"
                    ? "bg-green-500/10 border border-green-500/20"
                    : campaign.status === "paused"
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-gray-500/10 border border-gray-500/20"
                )}
              >
                {campaign.status === "active" ? (
                  <Play className="w-6 h-6 text-green-400" />
                ) : campaign.status === "paused" ? (
                  <Pause className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Target className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 
                        className="text-xl font-bold cursor-pointer hover:text-purple-400 transition-colors"
                        onClick={() => handleViewCampaign(campaign.id)}
                      >
                        {campaign.name}
                      </h3>
                      <Badge className={cn("capitalize", statusColors[campaign.status as keyof typeof statusColors])}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-gray-400">{campaign.description}</p>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    {campaign.status === "draft" && (
                      <Button size="sm" className="gap-2" onClick={() => toggleCampaignStatus(campaign.id)}>
                        <Play className="w-4 h-4" />
                        Launch
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => toggleCampaignStatus(campaign.id)}>
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button size="sm" className="gap-2" onClick={() => toggleCampaignStatus(campaign.id)}>
                        <Play className="w-4 h-4" />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={() => setActiveMenu(activeMenu === campaign.id ? null : campaign.id)}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      {activeMenu === campaign.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-40 p-1 rounded-lg bg-gray-900 border border-white/10 shadow-xl">
                          <button
                            onClick={() => handleViewCampaign(campaign.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleDuplicateCampaign(campaign)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      Leads
                    </div>
                    <div className="text-lg font-semibold">{campaign.leads.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Mail className="w-4 h-4" />
                      Sent
                    </div>
                    <div className="text-lg font-semibold">{campaign.sent.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      Replies
                    </div>
                    <div className="text-lg font-semibold">{campaign.replied.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Zap className="w-4 h-4" />
                      Reply Rate
                    </div>
                    <div className="text-lg font-semibold text-green-400">{campaign.replyRate}%</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <BarChart3 className="w-4 h-4" />
                      Open Rate
                    </div>
                    <div className="text-lg font-semibold">{campaign.openRate}%</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      Started
                    </div>
                    <div className="text-lg font-semibold">{campaign.startDate}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    {campaign.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                      {campaign.createdBy.charAt(0)}
                    </div>
                    <span>{campaign.createdBy}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No campaigns found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          <Button className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-2xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Campaign</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Campaign Name</label>
                  <Input
                    placeholder="e.g., Summer Product Launch"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <Input
                    placeholder="Brief description of your campaign"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Target Leads</label>
                  <Input
                    type="number"
                    placeholder="Number of leads to target"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sequence</label>
                  <select className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white">
                    <option>Select a sequence...</option>
                    <option>Initial Outreach</option>
                    <option>Demo Follow-up</option>
                    <option>Re-engagement</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}