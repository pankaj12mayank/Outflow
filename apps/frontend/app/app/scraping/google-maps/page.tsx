"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useGoogleMapsSearch } from "@/app/hooks/use-scraping";
import { toast } from "@/app/components/toast";
import Link from "next/link";

type MapResult = {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  category?: string;
  email?: string;
};

export default function GoogleMapsScraperPage() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(50);
  const [results, setResults] = useState<MapResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const searchMutation = useGoogleMapsSearch();

  const handleSearch = async () => {
    if (!keyword) return;
    try {
      const res = await searchMutation.mutateAsync({ keyword, location, limit });
      setLastJobId(res?.id || res?.job_id || null);
      toast.success("Search queued", "Check Scraping → Recent Jobs for progress.");
      setResults([]);
    } catch (e: any) {
      toast.error("Search failed", e?.response?.data?.detail || e?.message || "Unknown error");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedResults((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedResults.length === results.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(results.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-400" />
          Scraping
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Google Maps Scraper</span>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-xl font-bold mb-6">Search Google Maps</h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Search Keyword *</label>
            <Input
              placeholder="e.g., software companies, lawyers"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              placeholder="e.g., San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Results</label>
            <Input
              type="number"
              min="1"
              max="200"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={!keyword || searchMutation.isPending}
          className="gap-2"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Google Maps
            </>
          )}
        </Button>
        {lastJobId && (
          <p className="mt-4 text-sm text-gray-400">
            Job <span className="text-purple-400 font-mono">{lastJobId}</span> created.{" "}
            <Link href="/app/scraping" className="text-purple-400 hover:underline">
              View all jobs
            </Link>
          </p>
        )}
      </div>

      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedResults.length === results.length}
                  onChange={selectAll}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <span className="text-sm text-gray-400">
                  Select all ({results.length})
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export Selected ({selectedResults.length})
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add to Campaign
              </Button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedResults.includes(result.id)}
                  onChange={() => toggleSelection(result.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                      {result.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    {result.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {result.address}
                      </span>
                    )}
                    {result.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {result.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {result.email && (
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Mail className="w-4 h-4" />
                      {result.email}
                    </span>
                  )}
                  {result.website && (
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Globe className="w-4 h-4" />
                      {result.website}
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="icon">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}