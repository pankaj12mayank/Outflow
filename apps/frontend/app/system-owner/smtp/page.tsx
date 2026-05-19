"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { Save, Mail, Send, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

type SmtpConfig = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_default: boolean;
  is_active: boolean;
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function SystemOwnerSmtpPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "failed">("unknown");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "Primary SMTP",
    host: "",
    port: 587,
    username: "",
    password: "",
    from_email: "",
    from_name: "Outflo",
    use_tls: true,
    is_default: true,
  });
  const [testTo, setTestTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/smtp/configs", { headers: authHeaders() });
      setConfigs(res.data || []);
      const def = (res.data as SmtpConfig[])?.find((c) => c.is_default);
      if (def) {
        setEditingId(def.id);
        setForm({
          name: def.name,
          host: def.host,
          port: def.port,
          username: def.username,
          password: "",
          from_email: def.from_email,
          from_name: def.from_name,
          use_tls: def.use_tls ?? true,
          is_default: true,
        });
        setConnectionStatus(def.is_active ? "connected" : "unknown");
      }
    } catch {
      toast.error("Failed to load SMTP configs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, is_active: true };
      if (editingId) {
        await api.put(`/api/v1/smtp/configs/${editingId}`, payload, { headers: authHeaders() });
        toast.success("SMTP configuration saved");
        setConnectionStatus("connected");
      } else {
        const res = await api.post("/api/v1/smtp/configs", payload, { headers: authHeaders() });
        setEditingId(res.data.id);
        toast.success("SMTP configuration created");
        setConnectionStatus("connected");
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Save failed", err.response?.data?.detail || "Could not save configuration");
      setConnectionStatus("failed");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) {
      toast.error("Enter a test email address");
      return;
    }
    setTesting(true);
    try {
      await api.post(
        "/api/v1/system-owner/platform/test-email",
        { recipient: testTo, subject: "Outflo SMTP test", body: "SMTP is working." },
        { headers: authHeaders() }
      );
      toast.success("Test email sent successfully!", `Delivered to ${testTo}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Test failed", err.response?.data?.detail || "Could not send test email");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-purple-400" /> SMTP Configuration
          </h1>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            connectionStatus === "connected" && "bg-green-500/10 text-green-400 border border-green-500/20",
            connectionStatus === "failed" && "bg-red-500/10 text-red-400 border border-red-500/20",
            connectionStatus === "unknown" && "bg-gray-500/10 text-gray-400 border border-gray-500/20"
          )}>
            {connectionStatus === "connected" && <CheckCircle className="w-3 h-3" />}
            {connectionStatus === "failed" && <AlertCircle className="w-3 h-3" />}
            {connectionStatus === "connected" ? "Connected" : connectionStatus === "failed" ? "Failed" : "Not configured"}
          </div>
        </div>
        <p className="text-gray-400">
          Configure your email delivery settings. No .env file edits required.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-purple-400" />
            Server Settings
          </h2>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-300">Configuration Name</span>
              <input
                type="text"
                className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My SMTP Server"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-300">SMTP Host</span>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-300">Port</span>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                  placeholder="587"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-300">Username</span>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="user@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-300">Password</span>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Leave blank to keep current" : "Enter password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            Sender Settings
          </h2>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-300">From Email</span>
              <input
                type="email"
                className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="noreply@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-300">From Name</span>
              <input
                type="text"
                className="mt-1.5 w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Outflo"
              />
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={form.use_tls}
                onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
              />
              <div>
                <span className="text-sm font-medium text-white">Use TLS/SSL</span>
                <p className="text-xs text-gray-400">Recommended for secure email delivery</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
              />
              <div>
                <span className="text-sm font-medium text-white">Set as default</span>
                <p className="text-xs text-gray-400">Use this configuration for all outgoing emails</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/25"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-purple-400" />
          Test Configuration
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            placeholder="Enter test email address"
            className="flex-1 rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-colors"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || !testTo}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? "Sending..." : "Send Test Email"}
          </button>
        </div>
      </div>

      {configs.length > 1 && (
        <p className="text-sm text-gray-500 mt-6 text-center">
          {configs.length} SMTP configuration(s) in database
        </p>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
