"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Loader2,
  User,
  Briefcase,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

export default function LinkedInEnrichPage() {
  const [url, setUrl] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleEnrich = async () => {
    if (!url) return;
    
    setIsEnriching(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setResult({
      name: "Sarah Chen",
      title: "VP of Sales",
      company: "TechScale Inc",
      location: "San Francisco, CA",
      email: "sarah.chen@techscale.io",
      linkedin_url: url,
    });
    setIsEnriching(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          Scraping
        </span>
        <span>/</span>
        <span className="text-white">LinkedIn Enrichment</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
      >
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-400">
            <strong>Manual URL input only.</strong> This tool enriches a single LinkedIn profile at a time.
            No bulk scraping or automation is supported.
          </p>
        </div>

        <h2 className="text-xl font-bold mb-6">Enrich LinkedIn Profile</h2>

        <div className="flex gap-4 mb-6">
          <Input
            placeholder="https://linkedin.com/in/profile-name"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-white/5 border-white/10"
          />
          <Button
            onClick={handleEnrich}
            disabled={!url || isEnriching}
            className="gap-2"
          >
            {isEnriching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Enrich Profile
              </>
            )}
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-xl border border-green-500/20 bg-green-500/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-green-400">Profile Enriched Successfully</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-lg">
                  {result.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold">{result.name}</div>
                  <div className="text-sm text-gray-400">{result.title}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{result.company}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{result.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <span>{result.email}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add to Leads
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <h3 className="font-medium mb-3">Supported Fields</h3>
        <div className="flex flex-wrap gap-2">
          {["Name", "Title", "Company", "Location", "Email (if public)"].map((field) => (
            <Badge key={field} className="bg-white/5 text-gray-400">
              {field}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}