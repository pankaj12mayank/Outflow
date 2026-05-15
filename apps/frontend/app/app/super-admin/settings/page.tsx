"use client";

import { useState } from "react";
import api from "@/app/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Settings, Shield, Database, Bell, Sliders, Save } from "lucide-react";

type TabKey = "feature-flags" | "global-settings" | "api-keys" | "notifications";

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("feature-flags");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Settings</h1>
        <p className="text-gray-400">Configure feature flags, global settings, and more</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {(["feature-flags", "global-settings", "api-keys"] as TabKey[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm capitalize ${tab === t ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            {t === "feature-flags" && <Shield className="w-4 h-4" />}
            {t === "global-settings" && <Database className="w-4 h-4" />}
            {t === "api-keys" && <Sliders className="w-4 h-4" />}
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {tab === "feature-flags" && <FeatureFlagsTab />}
      {tab === "global-settings" && <GlobalSettingsTab />}
      {tab === "api-keys" && <APIKeysTab />}
    </div>
  );
}

function FeatureFlagsTab() {
  interface FeatureFlag {
    key: string;
    is_enabled: boolean;
    rollout: number;
  }

  const { data: flags } = useQuery<FeatureFlag[]>({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => api.get("/api/v1/admin/feature-flags").then((r) => r.data),
  });

  const flagsList = Array.isArray(flags) ? flags : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Feature Flags</h3>
      </div>
      <div className="space-y-3">
        {flagsList.map((flag: FeatureFlag) => (
          <div key={flag.key} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 p-4">
            <div>
              <p className="text-white font-medium">{flag.key as string}</p>
              <p className="text-xs text-gray-500 mt-0.5">Rollout: {flag.rollout as number ?? 0}%</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={flag.is_enabled as boolean} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>
        ))}
        {flagsList.length === 0 && (
          <div className="text-center py-8 text-gray-500">No feature flags configured</div>
        )}
      </div>
    </div>
  );
}

function GlobalSettingsTab() {
  interface GlobalSetting {
    key: string;
    value: unknown;
    category: string;
  }

  const { data: settings } = useQuery<GlobalSetting[]>({
    queryKey: ["admin", "global-settings"],
    queryFn: () => api.get("/api/v1/admin/global-settings").then((r) => r.data),
  });

  const settingsList = Array.isArray(settings) ? settings : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Global Settings</h3>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="space-y-4">
          {settingsList.map((s: GlobalSetting) => (
            <div key={s.key} className="grid grid-cols-3 gap-4 items-center py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{s.key as string}</p>
                <p className="text-xs text-gray-500">{s.category as string}</p>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  defaultValue={JSON.stringify(s.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
                <button className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {settingsList.length === 0 && (
            <div className="text-center py-8 text-gray-500">No global settings configured</div>
          )}
        </div>
      </div>
    </div>
  );
}

function APIKeysTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">API Keys</h3>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <p className="text-gray-400 text-sm mb-4">API keys for platform integrations and webhooks.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-white text-sm font-medium">Production API Key</p>
              <p className="text-xs text-gray-500 mt-0.5">sk_live_****</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-white text-sm font-medium">Development API Key</p>
              <p className="text-xs text-gray-500 mt-0.5">sk_test_****</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">Development</span>
          </div>
        </div>
        <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white">
          Regenerate Keys
        </button>
      </div>
    </div>
  );
}