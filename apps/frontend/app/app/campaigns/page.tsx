"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
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
  Zap,
  X,
  Send,
  Eye,
  Copy,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Can } from "@/app/components/Can";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "@/app/components/toast";
import { campaignsAPI } from "@/app/lib/api";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "draft" | "completed";
  total_recipients: number;
  emails_sent: number;
  settings?: Record<string, any>;
  created_at?: string;
  created_by?: string;
}

const statusColors: Record<string, string> = {
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
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchCampaigns = async () => {
    try {
      setError(null);
      const res = await campaignsAPI.list();
      setCampaignList(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filteredCampaigns = campaignList.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleCampaignStatus = async (campaign: Campaign) => {
    setToggling(campaign.id);
    try {
      if (campaign.status === "draft" || campaign.status === "paused") {
        await campaignsAPI.launch(campaign.id);
      } else if (campaign.status === "active") {
        await campaignsAPI.pause(campaign.id);
      }
      await fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update campaign status");
    } finally {
      setToggling(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await campaignsAPI.delete(id);
      setCampaignList((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete campaign");
    }
  };

  const handleViewCampaign = (id: string) => {
    router.push(`/app/campaigns/${id}`);
    setActiveMenu(null);
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const res = await campaignsAPI.create({
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
      });
      if (res.data?.id) {
        setCampaignList((prev) => [...prev, { ...campaign, id: res.data.id, name: `${campaign.name} (Copy)`, status: "draft", emails_sent: 0 }]);
      }
      setActiveMenu(null);
      toast.success("Campaign duplicated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate campaign");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    setCreating(true);
    try {
      const res = await campaignsAPI.create(data);
      if (res.data?.id) {
        setShowModal(false);
        await fetchCampaigns();
        toast.success("Campaign created");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const totalEmailsSent = campaignList.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
  const activeCount = campaignList.filter((c) => c.status === "active").length;
  const totalLeads = campaignList.reduce((sum, c) => sum + (c.total_recipients || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button onClick={fetchCampaigns}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
          <p className="text-gray-400">
            Create, manage, and track your outreach campaigns
          </p>
        </div>
        <Can permission="campaigns:create">
          <Button className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold">{activeCount}</div>
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
            <div className="text-3xl font-bold">{campaignList.length}</div>
          </div>
          <div className="text-gray-400 text-sm">Total Campaigns</div>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
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

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No campaigns found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          <Can permission="campaigns:create">
            <Button className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </Can>
        </div>
      )}

      <div className="space-y-4">
        {filteredCampaigns.map((campaign, i) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-all"
          >
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  campaign.status === "active"
                    ? "bg-green-500/10 border border-green-500/20"
                    : campaign.status === "paused"
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-gray-500/10 border border-gray-500/20"
                )}
              >
                {campaign.status === "active" ? (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                ) : campaign.status === "paused" ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                ) : (
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 
                        className="text-lg sm:text-xl font-bold cursor-pointer hover:text-purple-400 transition-colors"
                        onClick={() => handleViewCampaign(campaign.id)}
                      >
                        {campaign.name}
                      </h3>
                      <Badge className={cn("capitalize", statusColors[campaign.status] || statusColors.draft)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-gray-400">{campaign.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 relative self-end sm:self-auto">
                    {campaign.status === "draft" && (
                      <Can permission="campaigns:start">
                        <Button size="sm" className="gap-2" onClick={() => toggleCampaignStatus(campaign)} disabled={toggling === campaign.id}>
                          {toggling === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          Launch
                        </Button>
                      </Can>
                    )}
                    {campaign.status === "active" && (
                      <Can permission="campaigns:pause">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => toggleCampaignStatus(campaign)} disabled={toggling === campaign.id}>
                          {toggling === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                          Pause
                        </Button>
                      </Can>
                    )}
                    {campaign.status === "paused" && (
                      <Can permission="campaigns:start">
                        <Button size="sm" className="gap-2" onClick={() => toggleCampaignStatus(campaign)} disabled={toggling === campaign.id}>
                          {toggling === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          Resume
                        </Button>
                      </Can>
                    )}
                    <Can permission="campaigns:delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Can>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      Leads
                    </div>
                    <div className="text-lg font-semibold">{(campaign.total_recipients || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Mail className="w-4 h-4" />
                      Sent
                    </div>
                    <div className="text-lg font-semibold">{(campaign.emails_sent || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      Created
                    </div>
                    <div className="text-sm font-semibold">{campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-2xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCreate}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Create New Campaign</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} type="button">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2" htmlFor="name">Campaign Name</label>
                    <Input id="name" name="name" required placeholder="e.g., Summer Product Launch" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2" htmlFor="description">Description</label>
                    <Input id="description" name="description" placeholder="Brief description" className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowModal(false)} type="button">Cancel</Button>
                  <Button className="gap-2" type="submit" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Campaign
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}