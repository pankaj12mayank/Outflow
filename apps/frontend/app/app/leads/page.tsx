"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Globe,
  Linkedin,
  RefreshCw,
  Upload,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

const leads = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah.chen@techscale.io",
    phone: "+1 415 555 0123",
    company: "TechScale Inc.",
    title: "VP of Sales",
    website: "techscale.io",
    enrichment: "completed",
    score: 92,
    source: "Google Maps",
    lastContact: "2026-05-12",
  },
  {
    id: 2,
    name: "Michael Torres",
    email: "m.torres@dataflow.com",
    phone: "+1 212 555 0456",
    company: "DataFlow Systems",
    title: "Head of Growth",
    website: "dataflow.com",
    enrichment: "completed",
    score: 87,
    source: "CSV Import",
    lastContact: "2026-05-11",
  },
  {
    id: 3,
    name: "Emma Williams",
    email: "emma.w@cloudnine.co",
    phone: "+1 650 555 0789",
    company: "CloudNine Solutions",
    title: "CRO",
    website: "cloudnine.co",
    enrichment: "in_progress",
    score: 78,
    source: "Website Crawler",
    lastContact: "2026-05-10",
  },
  {
    id: 4,
    name: "James Miller",
    email: null,
    phone: "+1 408 555 0234",
    company: "Nexus AI",
    title: "CEO",
    website: "nexusai.io",
    enrichment: "pending",
    score: 65,
    source: "Google Maps",
    lastContact: "2026-05-08",
  },
  {
    id: 5,
    name: "Lisa Park",
    email: "lisa.park@synthetix.com",
    phone: "+1 510 555 0567",
    company: "Synthetix Labs",
    title: "Director of Marketing",
    website: "synthetix.com",
    enrichment: "completed",
    score: 89,
    source: "LinkedIn",
    lastContact: "2026-05-13",
  },
  {
    id: 6,
    name: "David Kim",
    email: "d.kim@brightstack.io",
    phone: "+1 628 555 0890",
    company: "BrightStack",
    title: "VP Engineering",
    website: "brightstack.io",
    enrichment: "failed",
    score: 45,
    source: "Website Crawler",
    lastContact: "2026-04-28",
  },
];

const statusConfig = {
  completed: { color: "green", icon: CheckCircle, label: "Enriched" },
  in_progress: { color: "blue", icon: Clock, label: "In Progress" },
  pending: { color: "gray", icon: Clock, label: "Pending" },
  failed: { color: "red", icon: AlertCircle, label: "Failed" },
};

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [enrichmentFilter, setEnrichmentFilter] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      enrichmentFilter === "all" || lead.enrichment === enrichmentFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleLeadSelection = (id: number) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leads</h1>
          <p className="text-gray-400">
            Manage and enrich your prospect database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Enrich Selected
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="text-3xl font-bold mb-1">{leads.length}</div>
          <div className="text-sm text-gray-400">Total Leads</div>
        </div>
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="text-3xl font-bold mb-1 text-green-400">
            {leads.filter((l) => l.enrichment === "completed").length}
          </div>
          <div className="text-sm text-gray-400">Enriched</div>
        </div>
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="text-3xl font-bold mb-1 text-blue-400">
            {leads.filter((l) => l.enrichment === "in_progress").length}
          </div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="text-3xl font-bold mb-1 text-yellow-400">
            {leads.filter((l) => l.enrichment === "pending").length}
          </div>
          <div className="text-sm text-gray-400">Need Enrichment</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "completed", "in_progress", "pending", "failed"].map(
            (filter) => (
              <button
                key={filter}
                onClick={() => setEnrichmentFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                  enrichmentFilter === filter
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "border border-white/10 text-gray-400 hover:text-white"
                )}
              >
                {filter === "all" ? "All" : filter.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLeads.length === filteredLeads.length}
                onChange={() => {
                  if (selectedLeads.length === filteredLeads.length) {
                    setSelectedLeads([]);
                  } else {
                    setSelectedLeads(filteredLeads.map((l) => l.id));
                  }
                }}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <span className="text-sm text-gray-400">
                Select all ({filteredLeads.length})
              </span>
            </label>
          </div>
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/10 text-purple-400">
                {selectedLeads.length} selected
              </Badge>
              <Button variant="outline" size="sm" className="gap-2">
                <Zap className="w-4 h-4" />
                Enrich
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-12 p-4"></th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Name
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Company
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Source
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Enrichment
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Score
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Last Contact
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, i) => {
                const status = statusConfig[lead.enrichment as keyof typeof statusConfig];
                const StatusIcon = status.icon;
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-gray-400">{lead.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{lead.company}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className="bg-white/5 text-gray-400 text-xs">
                        {lead.source}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={cn(
                          "gap-1 text-xs",
                          status.color === "green" &&
                            "bg-green-500/10 text-green-400 border-green-500/20",
                          status.color === "blue" &&
                            "bg-blue-500/10 text-blue-400 border-blue-500/20",
                          status.color === "gray" &&
                            "bg-gray-500/10 text-gray-400 border-gray-500/20",
                          status.color === "red" &&
                            "bg-red-500/10 text-red-400 border-red-500/20"
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              lead.score >= 80
                                ? "bg-green-500"
                                : lead.score >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{lead.score}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-400">
                        {lead.lastContact}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {lead.email && (
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                        {lead.website && (
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <Globe className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}