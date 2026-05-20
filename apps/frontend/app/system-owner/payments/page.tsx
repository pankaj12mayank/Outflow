"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { RefreshCw, CreditCard, History, Check, AlertCircle } from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

interface GatewaySettings {
  stripe?: { enabled?: boolean; publishable_key?: string; secret_key?: string };
  razorpay?: { enabled?: boolean; key_id?: string; key_secret?: string };
}

interface BillingHistoryItem {
  id?: string;
  _id?: string;
  event_type?: string;
  organization_name?: string;
  email?: string;
  amount?: number;
  status?: string;
  created_at?: string;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<GatewaySettings | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [tab, setTab] = useState<"gateways" | "history">("gateways");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state for gateways
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const results = await Promise.allSettled([
        api.get("/api/v1/system-owner/payments/settings", { headers: authHeaders() }),
        api.get("/api/v1/system-owner/billing/history", { headers: authHeaders(), params: { limit: 100 } }),
      ]);

      // Handle gateway settings
      const settingsResult = results[0];
      if (settingsResult.status === "fulfilled") {
        const data = settingsResult.value.data?.gateways || {};
        setGateways(data);
        
        // Update form state
        setStripeEnabled(data.stripe?.enabled || false);
        setStripeKey(data.stripe?.publishable_key || "");
        setStripeSecret(data.stripe?.secret_key || "");
        setRazorpayEnabled(data.razorpay?.enabled || false);
        setRazorpayKey(data.razorpay?.key_id || "");
        setRazorpaySecret(data.razorpay?.key_secret || "");
      } else if (settingsResult.status === "rejected") {
        // Gateway settings failed - continue with defaults
        setGateways({ stripe: { enabled: false }, razorpay: { enabled: false } });
      }

      // Handle billing history
      const historyResult = results[1];
      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value.data?.history || []);
      } else {
        setHistory([]);
      }

    } catch (err: any) {
      console.error("Billing load error:", err);
      setLoadError("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put(
        "/api/v1/system-owner/payments/settings",
        {
          stripe: {
            enabled: stripeEnabled,
            publishable_key: stripeKey,
            secret_key: stripeSecret,
          },
          razorpay: {
            enabled: razorpayEnabled,
            key_id: razorpayKey,
            key_secret: razorpaySecret,
          },
        },
        { headers: authHeaders() }
      );
      toast.success("Settings saved");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Failed to save settings";
      toast.error("Save failed", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleGatewayToggle = async (provider: "stripe" | "razorpay", enabled: boolean) => {
    try {
      if (provider === "stripe") {
        setStripeEnabled(enabled);
        await api.put(
          "/api/v1/system-owner/payments/settings",
          { stripe: { enabled } },
          { headers: authHeaders() }
        );
      } else {
        setRazorpayEnabled(enabled);
        await api.put(
          "/api/v1/system-owner/payments/settings",
          { razorpay: { enabled } },
          { headers: authHeaders() }
        );
      }
      toast.success(`${provider} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update gateway");
      // Revert on failure
      if (provider === "stripe") setStripeEnabled(!enabled);
      else setRazorpayEnabled(!enabled);
    }
  };

  if (loading) {
    return (
      <SoPageLayout
        title="Billing"
        description="Payment gateway configuration"
        actions={
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        }
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </SoPageLayout>
    );
  }

  return (
    <SoPageLayout
      title="Billing"
      description="Payment gateways and billing history"
      actions={
        <button
          onClick={load}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {/* Error Banner */}
      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{loadError}</span>
          <button onClick={load} className="ml-auto text-sm text-red-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab("gateways")}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            tab === "gateways"
              ? "bg-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Gateways
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            tab === "history"
              ? "bg-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          History
          {history.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Gateways Tab */}
      {tab === "gateways" && (
        <div className="space-y-6">
          {/* Stripe Gateway */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Stripe</h2>
                  <p className="text-sm text-gray-400">Accept payments via Credit Card</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-gray-400">Enabled</span>
                <input
                  type="checkbox"
                  checked={stripeEnabled}
                  onChange={(e) => handleGatewayToggle("stripe", e.target.checked)}
                  className="w-5 h-5 rounded bg-white/5 border-white/20 text-purple-500"
                />
              </label>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Publishable Key</label>
                <input
                  type="text"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="pk_live_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Secret Key</label>
                <input
                  type="password"
                  value={stripeSecret}
                  onChange={(e) => setStripeSecret(e.target.value)}
                  placeholder="sk_live_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Razorpay Gateway */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Razorpay</h2>
                  <p className="text-sm text-gray-400">Accept payments via UPI, Cards, Net Banking</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-gray-400">Enabled</span>
                <input
                  type="checkbox"
                  checked={razorpayEnabled}
                  onChange={(e) => handleGatewayToggle("razorpay", e.target.checked)}
                  className="w-5 h-5 rounded bg-white/5 border-white/20 text-purple-500"
                />
              </label>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key ID</label>
                <input
                  type="text"
                  value={razorpayKey}
                  onChange={(e) => setRazorpayKey(e.target.value)}
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key Secret</label>
                <input
                  type="password"
                  value={razorpaySecret}
                  onChange={(e) => setRazorpaySecret(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-semibold transition-all"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-white mb-2">No Billing History</h3>
              <p className="text-gray-400">
                Billing events will appear here when organizations subscribe to plans.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={item.id || item._id || index}
                  className="p-4 rounded-xl border border-white/10 bg-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {item.event_type || "Billing Event"}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {item.organization_name || "Unknown Organization"}
                        {item.email && ` • ${item.email}`}
                      </div>
                      {item.created_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {item.amount !== undefined && (
                        <div className="text-lg font-bold text-green-400">
                          ${item.amount.toFixed(2)}
                        </div>
                      )}
                      <div
                        className={`mt-1 px-2 py-0.5 rounded text-xs inline-block ${
                          item.status === "completed"
                            ? "bg-green-500/10 text-green-400"
                            : item.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {item.status || "pending"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SoPageLayout>
  );
}