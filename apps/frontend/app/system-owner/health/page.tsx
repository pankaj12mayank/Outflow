"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Database,
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import api from "@/app/lib/api";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Button } from "@/app/components/premium";

type PlatformStatus = {
  api: { status: string; version: string; env: string };
  mongodb: { healthy?: boolean; status?: string; error?: string };
  smtp: { configured: boolean; config_count: number; has_default: boolean };
  ai?: { provider: string; model: string; healthy: boolean };
};

export default function SystemHealthPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useSystemOwnerAuth();
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/system-owner/platform/status");
      setStatus(res.data);
    } catch {
      setStatus(null);
      setError("Could not load platform status. Sign in again as system owner.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated) load();
  }, [authLoading, isAuthenticated, router, load]);

  const runHealthCheck = async () => {
    setError(null);
    try {
      const res = await api.post("/api/v1/system-owner/platform/health-check");
      setHealth(res.data);
    } catch {
      setError("Health check failed");
    }
  };

  const purgeDemoData = async () => {
    if (!confirm("Delete all leads, campaigns, emails, scraping jobs, and related CRM activity? Organizations and users are kept.")) {
      return;
    }
    setPurging(true);
    setError(null);
    try {
      const res = await api.post("/api/v1/system-owner/platform/purge-demo-data");
      setPurgeResult(res.data?.purged || {});
      await runHealthCheck();
      await load();
    } catch {
      setError("Failed to purge demo data");
    } finally {
      setPurging(false);
    }
  };

  const mongoOk = status?.mongodb?.healthy === true;

  return (
    <SoPageLayout
      title="System Health"
      description="API, database, AI, and SMTP status — run checks and reset CRM demo metrics"
      actions={
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Health checker
            </h2>
            <StatusRow ok={status?.api?.status === "ok"} label="API" detail={`${status?.api?.version} (${status?.api?.env})`} />
            <StatusRow ok={mongoOk} label="MongoDB" detail={status?.mongodb?.status || status?.mongodb?.error || "unknown"} />
            <StatusRow
              ok={status?.smtp?.has_default}
              label="SMTP"
              detail={status?.smtp?.configured ? `${status.smtp.config_count} config(s)` : "Not configured"}
            />
            <StatusRow
              ok={status?.ai?.healthy}
              label={status?.ai?.provider || "AI"}
              detail={`${status?.ai?.model || "—"} ${status?.ai?.healthy ? "online" : "offline"}`}
            />
            <Button size="sm" onClick={runHealthCheck} leftIcon={<Activity className="w-4 h-4" />}>
              Run full health check
            </Button>
            {health && (
              <pre className="text-xs bg-black/40 p-4 rounded-xl overflow-auto max-h-56 text-gray-300">
                {JSON.stringify(health, null, 2)}
              </pre>
            )}
          </section>

          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-200">
              <Trash2 className="w-5 h-5" />
              Reset dashboard CRM data
            </h2>
            <p className="text-sm text-gray-400">
              Clears leads, campaigns, emails, scraping jobs, and activity logs so the system-owner dashboard shows only new real-time usage. Does not delete organizations or user accounts.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={purgeDemoData}
              disabled={purging}
              leftIcon={purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            >
              {purging ? "Purging…" : "Purge CRM demo data"}
            </Button>
            {purgeResult && (
              <pre className="text-xs bg-black/40 p-3 rounded-lg text-gray-300">
                {JSON.stringify(purgeResult, null, 2)}
              </pre>
            )}
          </section>

          <p className="text-xs text-gray-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            If you see &quot;Session mismatch&quot;, log out and sign in with admin@outflo.com only.
          </p>
        </div>
      )}
    </SoPageLayout>
  );
}

function StatusRow({ ok, label, detail }: { ok?: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {ok ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
      <span className="font-medium w-24 shrink-0">{label}</span>
      <span className="text-gray-400">{detail}</span>
    </div>
  );
}
