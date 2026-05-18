"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { Save, Cpu, RefreshCw } from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function SystemOwnerAiSettingsPage() {
  const [form, setForm] = useState({
    ai_provider: "ollama",
    openai_api_key: "",
    anthropic_api_key: "",
    ollama_base_url: "http://localhost:11434",
    ollama_model: "llama3.2",
  });
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/api/v1/system-owner/platform/ai-settings", {
        headers: authHeaders(),
      });
      const s = res.data.stored || {};
      setForm({
        ai_provider: s.ai_provider || "ollama",
        openai_api_key: s.openai_api_key || "",
        anthropic_api_key: s.anthropic_api_key || "",
        ollama_base_url: s.ollama_base_url || "http://localhost:11434",
        ollama_model: s.ollama_model || "llama3.2",
      });
      setRuntime(res.data.runtime);
    } catch {
      toast.error("Failed to load AI settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/v1/system-owner/platform/ai-settings", form, {
        headers: authHeaders(),
      });
      toast.success("AI settings saved");
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Save failed", err.response?.data?.detail || "");
    } finally {
      setSaving(false);
    }
  };

  const healthCheck = async () => {
    try {
      const res = await api.post(
        "/api/v1/system-owner/platform/health-check",
        {},
        { headers: authHeaders() }
      );
      setRuntime((r) => ({ ...r, health: res.data }));
      toast.success("Health check complete");
    } catch {
      toast.error("Health check failed");
    }
  };

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Cpu className="w-6 h-6 text-purple-400" /> AI & API
      </h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        OpenAI, Anthropic, or Ollama — saved in the database, not in files.
      </p>

      {runtime && (
        <div className="mb-6 p-4 rounded-lg border border-white/10 text-sm text-gray-300">
          Provider: <strong className="text-white">{String(runtime.provider)}</strong> —{" "}
          {runtime.healthy ? (
            <span className="text-green-400">healthy</span>
          ) : (
            <span className="text-amber-400">offline</span>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <label className="block text-sm text-gray-400">
          Provider
          <select
            className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
            value={form.ai_provider}
            onChange={(e) => setForm({ ...form, ai_provider: e.target.value })}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </label>

        {form.ai_provider === "openai" && (
          <label className="block text-sm text-gray-400">
            OpenAI API key
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
              value={form.openai_api_key}
              onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
            />
          </label>
        )}

        {form.ai_provider === "anthropic" && (
          <label className="block text-sm text-gray-400">
            Anthropic API key
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
              value={form.anthropic_api_key}
              onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value })}
            />
          </label>
        )}

        {form.ai_provider === "ollama" && (
          <>
            <label className="block text-sm text-gray-400">
              Ollama URL
              <input
                className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
                value={form.ollama_base_url}
                onChange={(e) => setForm({ ...form, ollama_base_url: e.target.value })}
              />
            </label>
            <label className="block text-sm text-gray-400">
              Model
              <input
                className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white"
                value={form.ollama_model}
                onChange={(e) => setForm({ ...form, ollama_model: e.target.value })}
              />
            </label>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button
            type="button"
            onClick={healthCheck}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
