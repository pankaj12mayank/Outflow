"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { 
  Zap, Plus, Search, Edit, Trash2, RefreshCw, Play, Pause,
  Clock, AlertCircle, ArrowRight
} from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

const EVENT_TYPES = [
  { value: "welcome", label: "Welcome", category: "Auth" },
  { value: "email_verification", label: "Email Verification", category: "Auth" },
  { value: "password_reset", label: "Password Reset", category: "Auth" },
  { value: "password_changed", label: "Password Changed", category: "Auth" },
  { value: "suspicious_login", label: "Suspicious Login", category: "Auth" },
  { value: "payment_success", label: "Payment Success", category: "Billing" },
  { value: "payment_failed", label: "Payment Failed", category: "Billing" },
  { value: "invoice_generated", label: "Invoice Generated", category: "Billing" },
  { value: "plan_upgraded", label: "Plan Upgraded", category: "Billing" },
  { value: "plan_downgraded", label: "Plan Downgraded", category: "Billing" },
  { value: "trial_started", label: "Trial Started", category: "Billing" },
  { value: "trial_ending", label: "Trial Ending", category: "Billing" },
  { value: "subscription_cancelled", label: "Subscription Cancelled", category: "Billing" },
  { value: "usage_limit_reached", label: "Usage Limit Reached", category: "Billing" },
  { value: "meeting_scheduled", label: "Meeting Scheduled", category: "Meetings" },
  { value: "meeting_reminder", label: "Meeting Reminder", category: "Meetings" },
  { value: "meeting_cancelled", label: "Meeting Cancelled", category: "Meetings" },
  { value: "post_meeting_followup", label: "Post Meeting Follow-up", category: "Meetings" },
  { value: "cold_outreach", label: "Cold Outreach", category: "Outreach" },
  { value: "follow_up_1", label: "Follow-up 1", category: "Outreach" },
  { value: "follow_up_2", label: "Follow-up 2", category: "Outreach" },
  { value: "final_bump", label: "Final Bump", category: "Outreach" },
  { value: "interested_lead", label: "Interested Lead", category: "AI" },
  { value: "pricing_inquiry", label: "Pricing Inquiry", category: "AI" },
  { value: "meeting_request", label: "Meeting Request", category: "AI" },
  { value: "maybe_later", label: "Maybe Later", category: "AI" },
  { value: "out_of_office", label: "Out of Office", category: "AI" },
];

export default function EmailTriggersPage() {
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [triggersRes, templatesRes] = await Promise.all([
        api.get("/api/v1/email-engine/triggers", {
          headers: authHeaders(),
          params: { status: filter === "all" ? undefined : filter, page_size: 50 }
        }),
        api.get("/api/v1/email-engine/templates", {
          headers: authHeaders(),
          params: { status: "active", page_size: 50 }
        }),
      ]);
      setTriggers(triggersRes.data?.triggers || []);
      setTemplates(templatesRes.data?.templates || []);
    } catch (error) {
      toast.error("Failed to load triggers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleDelete = async (triggerId: string) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;
    
    try {
      await api.delete(`/api/v1/email-engine/triggers/${triggerId}`, {
        headers: authHeaders()
      });
      toast.success("Trigger deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete trigger");
    }
  };

  const handleToggle = async (trigger: any) => {
    const newStatus = trigger.status === "active" ? "inactive" : "active";
    try {
      await api.put(`/api/v1/email-engine/triggers/${trigger._id}`, 
        { status: newStatus },
        { headers: authHeaders() }
      );
      toast.success(`Trigger ${newStatus === "active" ? "activated" : "paused"}`);
      loadData();
    } catch (error) {
      toast.error("Failed to update trigger");
    }
  };

  const getEventLabel = (eventType: string) => {
    const event = EVENT_TYPES.find(e => e.value === eventType);
    return event ? event.label : eventType;
  };

  const getCategory = (eventType: string) => {
    const event = EVENT_TYPES.find(e => e.value === eventType);
    return event ? event.category : "Other";
  };

  return (
    <SoPageLayout
      title="Email Triggers"
      description="Configure event-driven email triggers"
      actions={
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Trigger
        </button>
      }
    >
      <div className="flex gap-4 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : triggers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No triggers configured</p>
          <p className="text-sm mt-2">Create triggers to automate email delivery based on events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {triggers.map((trigger) => (
            <div
              key={trigger._id}
              className="p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    trigger.status === 'active' 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-gray-500/10 border border-gray-500/20'
                  }`}>
                    <Zap className={`w-5 h-5 ${trigger.status === 'active' ? 'text-green-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="font-medium">{trigger.name}</div>
                    <div className="text-sm text-gray-400">
                      {getEventLabel(trigger.event_type)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-md text-xs ${
                    getCategory(trigger.event_type) === 'Auth' ? 'bg-blue-500/10 text-blue-400' :
                    getCategory(trigger.event_type) === 'Billing' ? 'bg-green-500/10 text-green-400' :
                    getCategory(trigger.event_type) === 'Meetings' ? 'bg-purple-500/10 text-purple-400' :
                    getCategory(trigger.event_type) === 'Outreach' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {getCategory(trigger.event_type)}
                  </span>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {trigger.delay_seconds > 0 ? `${trigger.delay_seconds}s delay` : 'Immediate'}
                  </div>
                  
                  {trigger.retry_enabled && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <RefreshCw className="w-3 h-3" />
                      {trigger.retry_limit} retries
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleToggle(trigger)}
                    className={`p-2 rounded-lg ${
                      trigger.status === 'active' 
                        ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {trigger.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <button 
                    onClick={() => setEditingTrigger(trigger)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={() => handleDelete(trigger._id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTriggerModal 
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {editingTrigger && (
        <EditTriggerModal 
          trigger={editingTrigger}
          templates={templates}
          onClose={() => setEditingTrigger(null)}
          onSuccess={() => {
            setEditingTrigger(null);
            loadData();
          }}
        />
      )}
    </SoPageLayout>
  );
}

function CreateTriggerModal({ templates, onClose, onSuccess }: { templates: any[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    event_type: "welcome",
    template_id: "",
    delay_seconds: 0,
    retry_enabled: true,
    retry_limit: 3,
    priority: 5
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.template_id) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setSaving(true);
    try {
      await api.post("/api/v1/email-engine/triggers", form, {
        headers: authHeaders()
      });
      toast.success("Trigger created");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create trigger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
        <h2 className="text-xl font-bold mb-6">Create Email Trigger</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Trigger Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              placeholder="Welcome Email Trigger"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Event Type *</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              {EVENT_TYPES.map(event => (
                <option key={event.value} value={event.value}>
                  {event.label} ({event.category})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Template *</label>
            <select
              value={form.template_id}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              <option value="">Select a template</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Delay (seconds)</label>
              <input
                type="number"
                value={form.delay_seconds}
                onChange={(e) => setForm({ ...form, delay_seconds: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              >
                <option value={1}>High</option>
                <option value={5}>Normal</option>
                <option value={10}>Low</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.retry_enabled}
                onChange={(e) => setForm({ ...form, retry_enabled: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Enable Retries</span>
            </label>
            {form.retry_enabled && (
              <div>
                <input
                  type="number"
                  value={form.retry_limit}
                  onChange={(e) => setForm({ ...form, retry_limit: parseInt(e.target.value) || 3 })}
                  className="w-16 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-sm"
                  min={1}
                  max={10}
                />
                <span className="text-sm text-gray-400 ml-2">max retries</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Trigger"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTriggerModal({ trigger, templates, onClose, onSuccess }: { trigger: any; templates: any[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: trigger.name,
    template_id: trigger.template_id,
    delay_seconds: trigger.delay_seconds,
    retry_enabled: trigger.retry_enabled,
    retry_limit: trigger.retry_limit,
    priority: trigger.priority,
    status: trigger.status
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.put(`/api/v1/email-engine/triggers/${trigger._id}`, form, {
        headers: authHeaders()
      });
      toast.success("Trigger updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update trigger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
        <h2 className="text-xl font-bold mb-6">Edit Trigger</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Trigger Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Template</label>
            <select
              value={form.template_id}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Delay (seconds)</label>
              <input
                type="number"
                value={form.delay_seconds}
                onChange={(e) => setForm({ ...form, delay_seconds: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}