"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Database,
  Mail,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Send,
} from "lucide-react";
import api from "@/app/lib/api";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import { Button } from "@/app/components/premium";

type PlatformStatus = {
  api: { status: string; version: string; env: string };
  mongodb: { healthy?: boolean; status?: string; error?: string };
  smtp: { configured: boolean; config_count: number; has_default: boolean };
  urls: { app_url: string };
  ai?: {
    provider: string;
    model: string;
    healthy: boolean;
    openai_configured: boolean;
    anthropic_configured: boolean;
  };
  features: {
    debug_mode: boolean;
    background_polling: string;
    polling_note: string;
    ai_provider?: string;
    ai_healthy?: boolean;
  };
};

export default function SystemOwnerSetupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useSystemOwnerAuth();
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [smtpConfigs, setSmtpConfigs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testError, setTestError] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, smtp] = await Promise.all([
        api.get("/api/v1/system-owner/platform/status"),
        api.get("/api/v1/smtp/configs"),
      ]);
      setStatus(st.data);
      setSmtpConfigs(smtp.data || []);
    } catch {
      setStatus(null);
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
    const res = await api.post("/api/v1/system-owner/platform/health-check");
    setHealth(res.data);
  };

  const sendTestEmail = async () => {
    setTestError("");
    setTestMsg("");
    setSending(true);
    try {
      const res = await api.post("/api/v1/system-owner/platform/test-email", {
        recipient: testEmail,
      });
      setTestMsg(res.data.message || "Email sent");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setTestError(e.response?.data?.detail || "Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const mongoOk = status?.mongodb?.healthy === true;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 bg-white/5">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold">Platform Setup</h1>
              <p className="text-sm text-gray-400">Configure & test launch checklist (points 1–6)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Link href="/system-owner/dashboard" className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* 1 & 4 — Mongo + Health */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            1. Database (MongoDB) & 4. Health check
          </h2>
          <StatusRow ok={mongoOk} label="MongoDB" detail={status?.mongodb?.status || status?.mongodb?.error || "unknown"} />
          <StatusRow ok={status?.api?.status === "ok"} label="API" detail={`${status?.api?.version} (${status?.api?.env})`} />
          <Button size="sm" onClick={runHealthCheck} leftIcon={<Activity className="w-4 h-4" />}>
            Run full health check
          </Button>
          {health && (
            <pre className="text-xs bg-black/40 p-4 rounded-xl overflow-auto max-h-48">{JSON.stringify(health, null, 2)}</pre>
          )}
          <p className="text-xs text-gray-500">
            Production: use MongoDB Atlas free cluster. Set MONGO_URL on Render.
          </p>
        </section>

        {/* 2 — SMTP */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            2. Email / SMTP
          </h2>
          <StatusRow
            ok={status?.smtp?.has_default}
            label="Default SMTP"
            detail={
              status?.smtp?.configured
                ? `${status.smtp.config_count} config(s) — default ${status.smtp.has_default ? "set" : "missing"}`
                : "Not configured"
            }
          />
          <p className="text-sm text-gray-400">
            Add SMTP via API <code className="text-purple-300">POST /api/v1/smtp/configs</code> or Swagger{" "}
            <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`} target="_blank" rel="noreferrer" className="text-purple-400 inline-flex items-center gap-1">
              /docs <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          {smtpConfigs.length > 0 && (
            <ul className="text-sm text-gray-300 space-y-1">
              {smtpConfigs.map((c: Record<string, unknown>) => (
                <li key={String(c.id)}>
                  {String(c.name || c.provider)} — {String(c.host)}:{String(c.port)}
                  {c.is_default ? " (default)" : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="test@yourdomain.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
            />
            <Button onClick={sendTestEmail} disabled={!testEmail || sending} leftIcon={<Send className="w-4 h-4" />}>
              {sending ? "Sending…" : "Send test email"}
            </Button>
          </div>
          {testMsg && <p className="text-sm text-green-400">{testMsg}</p>}
          {testError && <p className="text-sm text-red-400">{testError}</p>}
        </section>

        {/* AI — paid API */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            AI (OpenAI / Anthropic — no Ollama on cloud)
          </h2>
          <StatusRow
            ok={status?.ai?.healthy}
            label={status?.ai?.provider || "AI"}
            detail={`${status?.ai?.model || "—"} ${status?.ai?.healthy ? "online" : "offline"}`}
          />
          <p className="text-sm text-gray-400">
            Render/Vercel: set <code className="text-purple-300">AI_PROVIDER=openai</code> and{" "}
            <code className="text-purple-300">OPENAI_API_KEY</code> in Render env. Run{" "}
            <code className="text-purple-300">deploy-one-click.bat</code> locally to generate files.
          </p>
        </section>

        {/* 3 — Campaigns */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            3. Campaigns & background jobs
          </h2>
          <p className="text-sm text-gray-400">{status?.features?.polling_note}</p>
          <p className="text-sm text-amber-400/90">
            Mode: {status?.features?.background_polling}. Test: create org → leads → campaign → Launch from app.
          </p>
        </section>

        {/* 5 — Billing */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            5. Plans & billing
          </h2>
          <p className="text-sm text-gray-400">Stripe checkout is not wired yet. Manage plans in admin UI.</p>
          <Link href="/system-owner/plans" className="text-purple-400 text-sm hover:underline">
            Open Plans manager →
          </Link>
        </section>

        {/* 6 — Deploy */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold">6. Deploy (Vercel + Render)</h2>
          <p className="text-sm text-gray-400">
            Docker not required. Full guide: <code className="text-purple-300">docs/DEPLOY_VERCEL_RENDER.md</code>
          </p>
          <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
            <li>Frontend → Vercel (apps/frontend)</li>
            <li>Backend → Render (apps/backend)</li>
            <li>Database → MongoDB Atlas M0 (free)</li>
            <li>Set APP_URL + CORS_ORIGINS after deploy</li>
          </ul>
          <p className="text-xs text-gray-500">App URL: {status?.urls?.app_url}</p>
        </section>

        {/* Quick links */}
        <section className="grid sm:grid-cols-3 gap-4">
          <QuickLink href="/system-owner/organizations" label="Organizations" />
          <QuickLink href="/system-owner/plans" label="Plans" />
          <QuickLink href="/system-owner/cms" label="CMS / Landing" />
        </section>
      </main>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok?: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {ok ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
      <span className="font-medium w-28">{label}</span>
      <span className="text-gray-400">{detail}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block p-4 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/40 text-center text-sm">
      {label}
    </Link>
  );
}
