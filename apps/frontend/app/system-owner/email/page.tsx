"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Plus, RefreshCw, FileText, Zap, Check, X, Link as LinkIcon } from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

const EVENT_TYPES = [
  { value: "welcome", label: "Welcome" },
  { value: "email_verification", label: "Email Verification" },
  { value: "password_reset", label: "Password Reset" },
  { value: "payment_success", label: "Payment Success" },
  { value: "payment_failed", label: "Payment Failed" },
  { value: "trial_started", label: "Trial Started" },
  { value: "trial_ending", label: "Trial Ending" },
  { value: "subscription_cancelled", label: "Subscription Cancelled" },
];

export default function EmailAutomationPage() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"templates" | "triggers">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  
  // Template state
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    body: "",
    category: "General"
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Trigger state
  const [showCreateTrigger, setShowCreateTrigger] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    name: "",
    event_type: "welcome",
    template_id: "",
    delay_seconds: 0
  });
  const [savingTrigger, setSavingTrigger] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, trigRes] = await Promise.allSettled([
        api.get("/api/v1/email-engine/templates", { headers: authHeaders() }),
        api.get("/api/v1/email-engine/triggers", { headers: authHeaders() }),
      ]);
      
      if (tRes.status === "fulfilled") {
        setTemplates(tRes.value.data?.templates || []);
      }
      if (trigRes.status === "fulfilled") {
        setTriggers(trigRes.value.data?.triggers || []);
      }
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Template functions
  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject) {
      toast.error("Name and subject are required");
      return;
    }
    setSavingTemplate(true);
    try {
      await api.post("/api/v1/email-engine/templates", newTemplate, { headers: authHeaders() });
      toast.success("Template created");
      setShowCreateTemplate(false);
      setNewTemplate({ name: "", subject: "", body: "", category: "General" });
      loadData();
    } catch (err: any) {
      toast.error("Failed to create template", err.response?.data?.detail || "");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await api.delete(`/api/v1/email-engine/templates/${id}`, { headers: authHeaders() });
      toast.success("Template deleted");
      loadData();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // Trigger functions
  const createTrigger = async () => {
    if (!newTrigger.name || !newTrigger.event_type) {
      toast.error("Name and event type are required");
      return;
    }
    setSavingTrigger(true);
    try {
      await api.post("/api/v1/email-engine/triggers", newTrigger, { headers: authHeaders() });
      toast.success("Trigger created");
      setShowCreateTrigger(false);
      setNewTrigger({ name: "", event_type: "welcome", template_id: "", delay_seconds: 0 });
      loadData();
    } catch (err: any) {
      toast.error("Failed to create trigger", err.response?.data?.detail || "");
    } finally {
      setSavingTrigger(false);
    }
  };

  const deleteTrigger = async (id: string) => {
    if (!confirm("Delete this trigger?")) return;
    try {
      await api.delete(`/api/v1/email-engine/triggers/${id}`, { headers: authHeaders() });
      toast.success("Trigger deleted");
      loadData();
    } catch {
      toast.error("Failed to delete trigger");
    }
  };

  if (loading) {
    return (
      <SoPageLayout
        title="Email Automation"
        description="Manage email templates and triggers"
        actions={<RefreshCw className="w-5 h-5 animate-spin text-gray-400" />}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </SoPageLayout>
    );
  }

  return (
    <SoPageLayout
      title="Email Automation"
      description="Manage email templates and triggers for automated emails"
      actions={
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeSection === "templates" && (
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          )}
          {activeSection === "triggers" && (
            <button
              onClick={() => setShowCreateTrigger(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              New Trigger
            </button>
          )}
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveSection("templates")}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            activeSection === "templates"
              ? "bg-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          Templates
          <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs">
            {templates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection("triggers")}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            activeSection === "triggers"
              ? "bg-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" />
          Triggers
          <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-xs">
            {triggers.length}
          </span>
        </button>
      </div>

      {/* Templates Section */}
      {activeSection === "templates" && (
        <>
          {/* Create Template Form */}
          {showCreateTemplate && (
            <div className="mb-6 p-6 rounded-2xl border border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Template
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="Welcome Email"
                      className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white"
                    >
                      <option value="General">General</option>
                      <option value="Welcome">Welcome</option>
                      <option value="Billing">Billing</option>
                      <option value="Notification">Notification</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="Welcome to Outflo!"
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Body</label>
                  <textarea
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                    placeholder="Hi {{user_name}}, welcome to {{platform_name}}..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={createTemplate}
                    disabled={savingTemplate}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl"
                  >
                    {savingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {savingTemplate ? "Creating..." : "Create Template"}
                  </button>
                  <button
                    onClick={() => setShowCreateTemplate(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-white mb-2">No Templates</h3>
              <p className="text-gray-400 mb-4">Create email templates for automated campaigns</p>
              <button
                onClick={() => setShowCreateTemplate(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
              >
                Create Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((t) => (
                <div
                  key={t.id || t._id}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{t.subject}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">{t.category}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        t.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {t.status || "draft"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTemplate(t.id || t._id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Triggers Section */}
      {activeSection === "triggers" && (
        <>
          {/* Create Trigger Form */}
          {showCreateTrigger && (
            <div className="mb-6 p-6 rounded-2xl border border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Create Trigger
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newTrigger.name}
                      onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                      placeholder="Welcome Email Trigger"
                      className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Type *</label>
                    <select
                      value={newTrigger.event_type}
                      onChange={(e) => setNewTrigger({ ...newTrigger, event_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white"
                    >
                      {EVENT_TYPES.map((et) => (
                        <option key={et.value} value={et.value}>{et.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Template (Optional)</label>
                  <select
                    value={newTrigger.template_id}
                    onChange={(e) => setNewTrigger({ ...newTrigger, template_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white"
                  >
                    <option value="">Select template (optional)</option>
                    {templates.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Delay (seconds)</label>
                  <input
                    type="number"
                    value={newTrigger.delay_seconds}
                    onChange={(e) => setNewTrigger({ ...newTrigger, delay_seconds: parseInt(e.target.value) || 0 })}
                    placeholder="0 for immediate"
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0a0f] border border-white/10 text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={createTrigger}
                    disabled={savingTrigger}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl"
                  >
                    {savingTrigger ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {savingTrigger ? "Creating..." : "Create Trigger"}
                  </button>
                  <button
                    onClick={() => setShowCreateTrigger(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Triggers List */}
          {triggers.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-white mb-2">No Triggers</h3>
              <p className="text-gray-400 mb-4">Create triggers to automate email sending based on events</p>
              <button
                onClick={() => setShowCreateTrigger(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
              >
                Create Trigger
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {triggers.map((t) => {
                const linkedTemplate = templates.find(
                  (tmpl) => (tmpl.id || tmpl._id) === t.template_id
                );
                return (
                  <div
                    key={t.id || t._id}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-gray-400">Event: {t.event_type}</span>
                        {linkedTemplate && (
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <LinkIcon className="w-3 h-3" />
                            {linkedTemplate.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          t.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                        }`}>
                          {t.status || "inactive"}
                        </span>
                        {t.delay_seconds > 0 && (
                          <span className="text-xs text-gray-500">{t.delay_seconds}s delay</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTrigger(t.id || t._id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </SoPageLayout>
  );
}