"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
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
  Eye,
  Pencil,
  Trash2,
  FileDown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { toast } from "@/app/components/toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useLeads, useLeadStats } from "@/app/hooks/use-leads";
import { PageError, PageLoading } from "@/app/components/page-state";

type LeadRow = {
  id: string | number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string;
  title: string;
  website: string;
  enrichment: string;
  score: number;
  source: string;
  lastContact: string;
};

function mapApiLead(row: Record<string, any>): LeadRow {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.name || row.email || "Unknown";
  return {
    id: row.id || row._id,
    name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    company: row.company || row.company_name || "",
    title: row.job_title || row.title || "",
    website: row.website || row.company_domain || "",
    enrichment: row.enriched_data ? "completed" : row.email_verified ? "completed" : row.status === "new" ? "pending" : (row.status || "pending"),
    score: row.score ?? 0,
    source: row.source || "API",
    lastContact: row.updated_at?.slice?.(0, 10) || row.created_at?.slice?.(0, 10) || "",
  };
}

const statusConfig = {
  completed: { color: "green", icon: CheckCircle, label: "Enriched" },
  in_progress: { color: "blue", icon: Clock, label: "In Progress" },
  pending: { color: "gray", icon: Clock, label: "Pending" },
  failed: { color: "red", icon: AlertCircle, label: "Failed" },
};

export default function LeadsPage() {
  const router = useRouter();
  const { data: apiData, isLoading, isError, error, refetch } = useLeads();
  useLeadStats();
  const apiLeads = Array.isArray(apiData) ? apiData : apiData?.leads || apiData?.data || [];
  const leads: LeadRow[] = apiLeads.map(mapApiLead);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<(string | number)[]>([]);
  const [enrichmentFilter, setEnrichmentFilter] = useState<string>("all");
  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | number | null>(null);

  if (isLoading && apiLeads.length === 0) {
    return <PageLoading label="Loading leads..." />;
  }

  const handleEnrichSelected = () => {
    if (selectedLeads.length > 0) {
      toast.info("Enriching leads...", `${selectedLeads.length} leads selected`);
      setSelectedLeads([]);
    }
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleVisitWebsite = (website: string) => {
    window.open(`https://${website}`, "_blank");
  };

  const handleDeleteLead = (id: string | number) => {
    setShowDeleteConfirm(null);
    toast.delete(`Lead ${id}`);
  };

  const downloadSampleCSV = () => {
    const csvContent = "name,email,phone,company,title,website\nJohn Doe,john@company.com,+1234567890,Acme Inc,CEO,acme.com\nJane Smith,jane@startup.io,+0987654321,Startup.io,CTO,startup.io";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_leads.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLeads = leads.filter((lead: LeadRow) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      enrichmentFilter === "all" || lead.enrichment === enrichmentFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleLeadSelection = (id: string | number) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {isError && (
        <PageError
          message={(error as any)?.response?.data?.detail || "Could not load leads from API."}
          onRetry={() => refetch()}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leads</h1>
          <p className="text-gray-400">
            Manage and enrich your prospect database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <div className="absolute left-0 top-full mt-1 z-50 w-48 p-1 rounded-lg bg-gray-900 border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => router.push("/app/scraping/csv-import")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={downloadSampleCSV}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <FileDown className="w-4 h-4" />
                Download Sample
              </button>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleEnrichSelected}
            disabled={selectedLeads.length === 0}
          >
            <RefreshCw className="w-4 h-4" />
            Enrich Selected
          </Button>
          <Button 
            className="gap-2"
            onClick={() => setShowAddModal(true)}
          >
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["all", "completed", "in_progress", "pending", "failed"].map(
            (filter) => (
              <button
                key={filter}
                onClick={() => setEnrichmentFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize whitespace-nowrap",
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

        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-10" />
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
              {!isLoading && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
                    <p className="font-medium text-white mb-1">No leads yet</p>
                    <p className="text-sm mb-4">Import CSV or run a scraping tool to add prospects.</p>
                    <Button variant="outline" onClick={() => router.push("/app/scraping/csv-import")}>
                      Import leads
                    </Button>
                  </td>
                </tr>
              )}
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
                      <div className="flex items-center gap-1 relative">
                        {lead.email && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-8 h-8 p-0"
                            onClick={() => handleSendEmail(lead.email!)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-8 h-8 p-0"
                            onClick={() => handleCall(lead.phone!)}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                        {lead.website && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-8 h-8 p-0"
                            onClick={() => handleVisitWebsite(lead.website)}
                          >
                            <Globe className="w-4 h-4" />
                          </Button>
                        )}
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-8 h-8 p-0"
                            onClick={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          {activeMenu === lead.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-40 p-1 rounded-lg bg-gray-900 border border-white/10 shadow-xl">
                              <button
                                onClick={() => { setActiveMenu(null); toast.info("Viewing lead", lead.name); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              <button
                                onClick={() => { setActiveMenu(null); toast.info("Editing lead", lead.name); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => { setActiveMenu(null); setShowDeleteConfirm(lead.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {showDeleteConfirm === lead.id && (
                          <div className="absolute right-0 top-full mt-1 z-50 w-56 p-4 rounded-lg bg-gray-900 border border-red-500/20 shadow-xl">
                            <p className="text-sm text-white mb-3">Are you sure you want to delete this lead?</p>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDeleteLead(lead.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
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
    </div>
  );
}