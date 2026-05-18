"use client";

import { useState, useEffect, useCallback } from "react";
import { Edit2, X, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";

type Plan = {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  is_default: boolean;
  is_popular: boolean;
  show_on_landing?: boolean;
  status: string;
  features?: { feature_key: string; enabled: boolean; limit?: number }[];
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function SystemOwnerPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    is_popular: false,
    show_on_landing: true,
    team_members_limit: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/plans", { headers: authHeaders() });
      setPlans(res.data.plans || []);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ensureTemplates = async () => {
    try {
      await api.post("/api/v1/plans/seed-templates", {}, { headers: authHeaders() });
      toast.success("Plans ready", "Free, Starter, Pro, Enterprise templates loaded");
      load();
    } catch {
      toast.error("Could not seed plans");
    }
  };

  const teamLimit = (plan: Plan) => {
    const f = plan.features?.find((x) => x.feature_key === "team_members");
    return f?.limit ?? 1;
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      is_popular: plan.is_popular,
      show_on_landing: plan.show_on_landing === true,
      team_members_limit: teamLimit(plan),
    });
  };

  const savePlan = async () => {
    if (!editing) return;
    const features = (editing.features || []).map((f) =>
      f.feature_key === "team_members"
        ? { ...f, enabled: true, limit: form.team_members_limit }
        : f
    );
    const limits = features
      .filter((f) => f.feature_key === "team_members")
      .map(() => ({
        resource: "team_members",
        limit: form.team_members_limit,
        unit: "members",
      }));

    try {
      await api.put(
        `/api/v1/plans/${editing.id}`,
        {
          name: form.name,
          description: form.description,
          price_monthly: form.price_monthly,
          price_yearly: form.price_yearly,
          is_popular: form.is_popular,
          show_on_landing: form.show_on_landing,
          features,
          limits: limits.length ? limits : undefined,
          status: editing.status || "active",
        },
        { headers: authHeaders() }
      );
      toast.success("Plan updated", "Landing and team limits synced");
      setEditing(null);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Save failed", err.response?.data?.detail || "Try again");
    }
  };

  const toggleLanding = async (plan: Plan) => {
    if (plan.status !== "active") {
      toast.error("Activate plan first", "Only active plans can appear on landing");
      return;
    }
    try {
      await api.put(
        `/api/v1/plans/${plan.id}`,
        { show_on_landing: plan.show_on_landing !== true },
        { headers: authHeaders() }
      );
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const toggleActive = async (plan: Plan) => {
    const activating = plan.status !== "active";
    try {
      await api.put(
        `/api/v1/plans/${plan.id}`,
        {
          status: activating ? "active" : "inactive",
          show_on_landing: activating ? plan.show_on_landing === true : false,
        },
        { headers: authHeaders() }
      );
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <SoPageLayout
      title="Pricing plans"
      description="Four template plans. Active + On landing = visible on /landing. Deactivate hides from landing."
      actions={
        <button
          type="button"
          onClick={ensureTemplates}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reset templates
        </button>
      }
    >
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center">
          <p className="text-gray-400 mb-4">No plans yet.</p>
          <button type="button" onClick={ensureTemplates} className="text-purple-400 underline">
            Load default plans
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                  {plan.is_default && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Default</span>
                  )}
                  {plan.is_popular && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300">Popular</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      plan.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {plan.status}
                  </span>
                  {plan.show_on_landing === true && plan.status === "active" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">On landing</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                <p className="text-white font-bold mt-2">
                  ${plan.price_monthly}/mo · Team limit: {teamLimit(plan)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleLanding(plan)}
                  disabled={plan.status !== "active"}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-40"
                >
                  {plan.show_on_landing === true ? (
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> On landing</span>
                  ) : (
                    <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Off landing</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(plan)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:bg-white/5"
                >
                  {plan.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit {editing.name}</h3>
            <div className="space-y-4">
              <label className="block text-sm text-gray-400">
                Name
                <input
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="block text-sm text-gray-400">
                Description
                <input
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm text-gray-400">
                  Monthly ($)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    value={form.price_monthly}
                    onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })}
                  />
                </label>
                <label className="block text-sm text-gray-400">
                  Yearly ($)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    value={form.price_yearly}
                    onChange={(e) => setForm({ ...form, price_yearly: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="block text-sm text-gray-400">
                Max team members (plan limit)
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  value={form.team_members_limit}
                  onChange={(e) => setForm({ ...form, team_members_limit: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_popular}
                  onChange={(e) => setForm({ ...form, is_popular: e.target.checked })}
                />
                Mark as popular on landing
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.show_on_landing}
                  onChange={(e) => setForm({ ...form, show_on_landing: e.target.checked })}
                  disabled={editing.status !== "active"}
                />
                Show on landing page (requires active)
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-gray-400">
                <X className="w-4 h-4 inline mr-1" /> Cancel
              </button>
              <button
                type="button"
                onClick={savePlan}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </SoPageLayout>
  );
}
