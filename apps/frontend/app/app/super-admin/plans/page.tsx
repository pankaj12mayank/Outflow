"use client";

import { useState } from "react";
import { usePlans, useCreatePlan, useUpdatePlan } from "@/app/hooks/use-admin";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  ai_limits: Record<string, number>;
  email_limits: Record<string, number>;
  scraping_limits: Record<string, number>;
  is_active: boolean;
  is_featured: boolean;
}

export default function PlansPage() {
  const { data: plans, isLoading } = usePlans();
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", monthly_price: 0, yearly_price: 0,
    features: {}, limits: {}, ai_limits: {}, email_limits: {}, scraping_limits: {},
    is_active: true, is_featured: false,
  });

  const planList = Array.isArray(plans) ? plans : [];

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ planId: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", slug: "", description: "", monthly_price: 0, yearly_price: 0,
      features: {}, limits: {}, ai_limits: {}, email_limits: {}, scraping_limits: {},
      is_active: true, is_featured: false });
  };

  const startEdit = (plan: Plan) => {
    setForm({
      name: plan.name, slug: plan.slug, description: plan.description || "",
      monthly_price: plan.monthly_price, yearly_price: plan.yearly_price,
      features: plan.features, limits: plan.limits,
      ai_limits: plan.ai_limits, email_limits: plan.email_limits,
      scraping_limits: plan.scraping_limits,
      is_active: plan.is_active, is_featured: plan.is_featured,
    });
    setEditingId(plan.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pricing Plans</h1>
          <p className="text-gray-400">Manage subscription plans</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", slug: "", description: "", monthly_price: 0, yearly_price: 0, features: {}, limits: {}, ai_limits: {}, email_limits: {}, scraping_limits: {}, is_active: true, is_featured: false }); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Plan
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Plan" : "Create Plan"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500" />
            <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="col-span-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500" />
            <input placeholder="Monthly Price" type="number" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: parseFloat(e.target.value) || 0 })}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" />
            <input placeholder="Yearly Price" type="number" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: parseFloat(e.target.value) || 0 })}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded" />
              Featured
            </label>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={handleSubmit} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check className="w-4 h-4" /> {editingId ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-gray-500">Loading...</div>
        ) : planList.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-500">No plans found</div>
        ) : planList.map((plan: Plan) => (
          <div key={plan.id} className={`rounded-2xl bg-white/[0.03] border p-6 ${plan.is_featured ? "border-violet-500/50 ring-1 ring-violet-500/30" : "border-white/5"}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-xs text-gray-500">/{plan.slug}</p>
              </div>
              {plan.is_featured && (
                <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400">Featured</span>
              )}
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">${plan.monthly_price}</span>
              <span className="text-gray-500 text-sm">/month</span>
              <p className="text-xs text-gray-500 mt-1">${plan.yearly_price}/year</p>
            </div>
            {plan.description && <p className="text-sm text-gray-400 mb-4">{plan.description}</p>}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
              <button onClick={() => startEdit(plan)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <span className={`text-xs px-2 py-0.5 rounded-full ${plan.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                {plan.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}