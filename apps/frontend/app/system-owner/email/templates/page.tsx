"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { 
  FileText, Plus, Search, Edit, Copy, Trash2, Eye, 
  RefreshCw, CheckCircle, XCircle, MoreVertical
} from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function EmailTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/email-engine/templates", {
        headers: authHeaders(),
        params: { status: filter === "all" ? undefined : filter, page_size: 50 }
      });
      setTemplates(res.data?.templates || []);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await api.delete(`/api/v1/email-engine/templates/${templateId}`, {
        headers: authHeaders()
      });
      toast.success("Template deleted");
      loadTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicate = async (templateId: string, newName: string) => {
    try {
      await api.post(`/api/v1/email-engine/templates/${templateId}/duplicate`, 
        { new_name: newName },
        { headers: authHeaders() }
      );
      toast.success("Template duplicated");
      loadTemplates();
    } catch (error) {
      toast.error("Failed to duplicate template");
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SoPageLayout
      title="Email Templates"
      description="Create and manage email templates"
      actions={
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No templates found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className="p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className={`px-2 py-1 rounded-md text-xs ${
                  template.status === 'active' 
                    ? 'bg-green-500/10 text-green-400' 
                    : template.status === 'draft'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {template.status}
                </span>
              </div>
              
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {template.subject}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{template.category}</span>
                <span>{template.variables?.length || 0} variables</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDuplicate(template._id, `${template.name} (Copy)`)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(template._id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal 
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </SoPageLayout>
  );
}

function CreateTemplateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
    category: "general"
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.subject || !form.html_content) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setSaving(true);
    try {
      await api.post("/api/v1/email-engine/templates", form, {
        headers: authHeaders()
      });
      toast.success("Template created");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Create Email Template</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              placeholder="Welcome Email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              placeholder="Welcome to {{organization_name}}!"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              <option value="general">General</option>
              <option value="auth">Authentication</option>
              <option value="billing">Billing</option>
              <option value="outreach">Outreach</option>
              <option value="meetings">Meetings</option>
              <option value="notifications">Notifications</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">HTML Content *</label>
            <textarea
              value={form.html_content}
              onChange={(e) => setForm({ ...form, html_content: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm"
              placeholder="<html><body><h1>Hello {{first_name}}</h1></body></html>"
            />
            <p className="text-xs text-gray-500 mt-1">Use {'{{variable_name}}'} for dynamic content</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plain Text Content</label>
            <textarea
              value={form.text_content}
              onChange={(e) => setForm({ ...form, text_content: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              placeholder="Hello {{first_name}}, ..."
            />
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
            {saving ? "Creating..." : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTemplateModal({ template, onClose, onSuccess }: { template: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: template.name,
    subject: template.subject,
    html_content: template.html_content,
    text_content: template.text_content || "",
    category: template.category,
    status: template.status
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.put(`/api/v1/email-engine/templates/${template._id}`, form, {
        headers: authHeaders()
      });
      toast.success("Template updated");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">Edit Template</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              >
                <option value="general">General</option>
                <option value="auth">Authentication</option>
                <option value="billing">Billing</option>
                <option value="outreach">Outreach</option>
                <option value="meetings">Meetings</option>
                <option value="notifications">Notifications</option>
              </select>
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
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">HTML Content</label>
            <textarea
              value={form.html_content}
              onChange={(e) => setForm({ ...form, html_content: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plain Text Content</label>
            <textarea
              value={form.text_content}
              onChange={(e) => setForm({ ...form, text_content: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
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