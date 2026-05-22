"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { getAuthHeaders } from "@/app/lib/auth";
import { AlertTriangle, RefreshCw, Mail, ArrowLeft } from "lucide-react";

interface BounceRow {
  id: string;
  email?: string;
  bounce_type?: string;
  organization_id?: string;
  timestamp?: string;
}

export default function EmailBouncesPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    hard: number;
    soft: number;
    recent: BounceRow[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/polls/bounces/stats", {
        headers: getAuthHeaders(),
        params: { limit: 100 },
      });
      setStats(res.data);
    } catch {
      toast.error("Failed to load bounce stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SoPageLayout
      title="Email Bounces"
      description="Webhook-recorded bounces from SMTP providers"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/system-owner/email"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-white/10 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Email hub
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-white/10 text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      }
    >
      {loading && !stats ? (
        <p className="text-sm text-gray-500 py-12 text-center">Loading bounce data…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-xl border border-white/10 bg-white/5">
              <div className="text-sm text-gray-400 mb-1">Total bounces</div>
              <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="text-sm text-gray-400 mb-1">Hard bounces</div>
              <div className="text-2xl font-bold text-red-400">{stats?.hard ?? 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="text-sm text-gray-400 mb-1">Soft bounces</div>
              <div className="text-2xl font-bold text-yellow-400">{stats?.soft ?? 0}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-sm">Recent bounces</span>
            </div>
            {!stats?.recent?.length ? (
              <p className="text-sm text-gray-500 py-12 text-center">No bounce webhooks recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-left">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Org</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        {row.email || "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{row.bounce_type || "hard"}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]">
                        {row.organization_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {row.timestamp ? new Date(row.timestamp).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </SoPageLayout>
  );
}
