"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { Save, Mail, Send } from "lucide-react";

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
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
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
      }
    } catch {
      toast.error("Failed to load SMTP configs");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      const payload = { ...form, is_active: true };
      if (editingId) {
        await api.put(`/api/v1/smtp/configs/${editingId}`, payload, { headers: authHeaders() });
        toast.success("SMTP updated");
      } else {
        const res = await api.post("/api/v1/smtp/configs", payload, { headers: authHeaders() });
        setEditingId(res.data.id);
        toast.success("SMTP created");
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Save failed", err.response?.data?.detail || "");
    }
  };

  const sendTest = async () => {
    if (!testTo) {
      toast.error("Enter a test email address");
      return;
    }
    try {
      await api.post(
        "/api/v1/system-owner/platform/test-email",
        { recipient: testTo, subject: "Outflo SMTP test", body: "SMTP is working." },
        { headers: authHeaders() }
      );
      toast.success("Test email sent", testTo);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Test failed", err.response?.data?.detail || "");
    }
  };

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Mail className="w-6 h-6 text-purple-400" /> SMTP setup
      </h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        Configure email delivery here — no .env file edits required.
      </p>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        {[
          ["Host", "host"],
          ["Port", "port"],
          ["Username", "username"],
          ["Password", "password"],
          ["From email", "from_email"],
          ["From name", "from_name"],
        ].map(([label, key]) => (
          <label key={key} className="block text-sm text-gray-400">
            {label}
            <input
              type={key === "port" ? "number" : key === "password" ? "password" : "text"}
              className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
              value={String(form[key as keyof typeof form] ?? "")}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]: key === "port" ? Number(e.target.value) : e.target.value,
                })
              }
              placeholder={key === "password" && editingId ? "Leave blank to keep" : ""}
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.use_tls}
            onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
          />
          Use TLS
        </label>
        <button
          type="button"
          onClick={save}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
        >
          <Save className="w-4 h-4" /> Save SMTP
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h2 className="text-white font-medium">Send test email</h2>
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
        <button
          type="button"
          onClick={sendTest}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
        >
          <Send className="w-4 h-4" /> Send test
        </button>
      </div>

      {configs.length > 1 && (
        <p className="text-xs text-gray-500 mt-4">{configs.length} configs in database</p>
      )}
    </div>
  );
}
