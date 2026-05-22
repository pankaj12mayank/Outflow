"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { getAuthHeaders } from "@/app/lib/auth";
import { Save, Cpu, RefreshCw, Loader2 } from "lucide-react";

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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        { headers: getAuthHeaders() }
      );
      setRuntime((r) => ({ ...r, health: res.data }));
      toast.success("Health check complete");
    } catch {
      toast.error("Health check failed");
    }
  };

  return (
    <div className="w-full p-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-3">
          <Cpu className="w-8 h-8 text-purple-400" /> AI & API Settings
        </h1>
        <p className="text-gray-400">
          Configure AI providers (OpenAI, Anthropic, or Ollama). Settings are stored in database, not in files.
        </p>
      </div>

      {runtime && (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${runtime.healthy ? "bg-green-400" : "bg-amber-400"}`} />
            <div>
              <div className="text-sm text-gray-300">Provider: <strong className="text-white">{String(runtime.provider || form.ai_provider)}</strong></div>
              <div className={`text-sm ${runtime.healthy ? "text-green-400" : "text-amber-400"}`}>
                {runtime.healthy ? "Connected" : "Offline - check configuration"}
              </div>
            </div>
          </div>
          <button
            onClick={healthCheck}
            className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recheck
          </button>
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          AI Provider Configuration
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">AI Provider</label>
            <div className="grid grid-cols-3 gap-4">
              {["ollama", "openai", "anthropic"].map((provider) => (
                <button
                  key={provider}
                  onClick={() => setForm({ ...form, ai_provider: provider })}
                  className={`p-5 rounded-xl border text-center transition-all ${
                    form.ai_provider === provider
                      ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{provider}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {provider === "ollama" ? "Local model" : provider === "openai" ? "GPT-4, GPT-4o" : "Claude 3.5"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {form.ai_provider === "openai" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">OpenAI API Key</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                  value={form.openai_api_key}
                  onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Get your key from platform.openai.com</p>
            </div>
          )}

          {form.ai_provider === "anthropic" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Anthropic API Key</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                  value={form.anthropic_api_key}
                  onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value })}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Get your key from console.anthropic.com</p>
            </div>
          )}

          {form.ai_provider === "ollama" && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Ollama URL</label>
                <input
                  className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                  value={form.ollama_base_url}
                  onChange={(e) => setForm({ ...form, ollama_base_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Model</label>
                <input
                  className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                  value={form.ollama_model}
                  onChange={(e) => setForm({ ...form, ollama_model: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/25 font-medium"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
