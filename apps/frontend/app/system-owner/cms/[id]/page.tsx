"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, Reorder } from "framer-motion";
import {
  Save, Eye, Globe, Layout, Trash2, GripVertical,
  Settings, Plus, ArrowLeft, Monitor, Smartphone, Tablet,
  History, Check, X, Send
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";

interface Block {
  _id: string;
  block_type: string;
  order: number;
  data: any;
  is_enabled: boolean;
}

interface Page {
  _id: string;
  name: string;
  slug: string;
  status: string;
  blocks: Block[];
  seo?: any;
}

const BLOCK_TYPES = [
  { type: "navbar", name: "Navigation Bar", icon: "☰" },
  { type: "hero", name: "Hero Section", icon: "🎯" },
  { type: "features", name: "Features Grid", icon: "⚡" },
  { type: "pricing", name: "Pricing Plans", icon: "💰" },
  { type: "testimonials", name: "Testimonials", icon: "💬" },
  { type: "faq", name: "FAQ", icon: "❓" },
  { type: "integrations", name: "Integrations", icon: "🔗" },
  { type: "cta", name: "Call to Action", icon: "📢" },
  { type: "footer", name: "Footer", icon: "📋" },
  { type: "logo_carousel", name: "Logo Carousel", icon: "🎠" },
  { type: "stats", name: "Statistics", icon: "📊" },
  { type: "contact", name: "Contact Form", icon: "📧" },
];

export default function PageEditor() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [showSeoPanel, setShowSeoPanel] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && pageId) {
      fetchPage();
    }
  }, [isAuthenticated, pageId]);

  const fetchPage = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.get(`/api/v1/cms/landing/pages/${pageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPage(response.data);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.put(`/api/v1/cms/landing/pages/${pageId}`, {
        name: page?.name,
        blocks: page?.blocks
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Saved successfully!");
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!confirm("Send this page? It will be visible to the public.")) return;
    
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post(`/api/v1/cms/landing/pages/${pageId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPage();
      alert("Sended successfully!");
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleAddBlock = async (blockType: string) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post(`/api/v1/cms/landing/pages/${pageId}/blocks?block_type=${blockType}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPage();
    } catch (error) {
      console.error("Failed to add block:", error);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Delete this block?")) return;
    
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.delete(`/api/v1/cms/landing/blocks/${blockId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPage();
    } catch (error) {
      console.error("Failed to delete block:", error);
    }
  };

  const handleUpdateBlockData = async (blockId: string, data: any) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.put(`/api/v1/cms/landing/blocks/${blockId}`, { data }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPage();
    } catch (error) {
      console.error("Failed to update block:", error);
    }
  };

  const handleSeoSave = async (seoData: any) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.put(`/api/v1/cms/landing/seo/${pageId}`, seoData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("SEO saved!");
    } catch (error) {
      console.error("Failed to save SEO:", error);
    }
  };

  if (isLoading || loading || !page) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const deviceWidths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-full mx-0 px-0">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/system-owner/cms")}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{page.name}</h1>
                <p className="text-xs text-gray-400">/{page.slug}</p>
              </div>
              <span className={`px-3 py-1 text-xs rounded-full ${
                page.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {page.status}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSeoPanel(!showSeoPanel)}
                className={`p-2 rounded-lg ${showSeoPanel ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
              >
                <Globe className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`p-2 rounded ${device === "desktop" ? "bg-white/10 text-white" : "text-gray-400"}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevice("tablet")}
                  className={`p-2 rounded ${device === "tablet" ? "bg-white/10 text-white" : "text-gray-400"}`}
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`p-2 rounded ${device === "mobile" ? "bg-white/10 text-white" : "text-gray-400"}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => window.open(`/landing/${page.slug}`, "_blank")}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
              >
                <Eye className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              
              <button
                onClick={handleSend}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">BLOCKS</h3>
          <div className="space-y-2">
            {BLOCK_TYPES.map(block => (
              <button
                key={block.type}
                onClick={() => handleAddBlock(block.type)}
                className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-left text-white transition-colors"
              >
                <span>{block.icon}</span>
                <span className="text-sm">{block.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-auto">
          <div className="mx-auto" style={{ maxWidth: deviceWidths[device] }}>
            <div className="bg-white rounded-lg min-h-[600px] p-8">
              {page.blocks?.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Layout className="w-12 h-12 mx-auto mb-4" />
                  <p>No blocks yet. Add blocks from the sidebar.</p>
                </div>
              ) : (
                page.blocks?.map((block, index) => (
                  <motion.div
                    key={block._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative mb-4 border-2 border-transparent hover:border-purple-500/30 rounded-lg"
                  >
                    <button
                      onClick={() => setEditingBlock(block)}
                      className="absolute top-2 right-2 z-10 p-2 bg-white shadow-lg rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Settings className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block._id)}
                      className="absolute top-2 right-12 z-10 p-2 bg-red-50 shadow-lg rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <BlockPreview block={block} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </main>

        {showSeoPanel && (
          <aside className="w-80 border-l border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">SEO SETTINGS</h3>
            <SeoForm seo={page.seo} onSave={handleSeoSave} />
          </aside>
        )}
      </div>

      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={(data) => {
            handleUpdateBlockData(editingBlock._id, data);
            setEditingBlock(null);
          }}
        />
      )}
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  const { data, block_type } = block;
  
  switch (block_type) {
    case "hero":
      return (
        <div className="text-center py-16 bg-gradient-to-b from-purple-50 to-white">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{data.headline || "Your Headline Here"}</h1>
          <p className="text-xl text-gray-600 mb-8">{data.subheadline || "Add your subheadline"}</p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg">{data.cta_primary || "CTA"}</button>
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg">{data.cta_secondary || "Secondary"}</button>
          </div>
        </div>
      );
    case "features":
      return (
        <div className="py-16 px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.title || "Features"}</h2>
          <div className="grid grid-cols-3 gap-8">
            {(data.features || []).map((f: any, i: number) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center text-2xl">{f.icon}</div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-gray-600 text-sm mt-2">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "pricing":
      return (
        <div className="py-16 px-8 bg-gray-50">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.title || "Pricing"}</h2>
          <div className="grid grid-cols-3 gap-8">
            {(data.plans || []).map((plan: any, i: number) => (
              <div key={i} className={`bg-white p-6 rounded-xl ${plan.popular ? "ring-2 ring-purple-500" : ""}`}>
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mt-2">${plan.price}<span className="text-sm font-normal text-gray-500">/{plan.period}</span></div>
                <ul className="mt-4 space-y-2">
                  {(plan.features || []).map((f: string, j: number) => (
                    <li key={j} className="text-gray-600 text-sm">✓ {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="py-16 px-8 text-center" style={{ backgroundColor: data.background_color || "#7c3aed" }}>
          <h2 className="text-3xl font-bold text-white mb-4">{data.headline || "Call to Action"}</h2>
          <p className="text-white/80 mb-8">{data.subheadline || ""}</p>
          <button className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold">{data.cta_text || "Get Started"}</button>
        </div>
      );
    case "footer":
      return (
        <div className="py-12 px-8 bg-gray-900 text-white">
          <div className="flex justify-between">
            <div>
              <h3 className="font-bold text-lg">{data.logo_text || "Logo"}</h3>
              <p className="text-gray-400 text-sm mt-2">{data.description || ""}</p>
            </div>
            <div className="flex gap-8">
              {(data.columns || []).map((col: any, i: number) => (
                <div key={i}>
                  <h4 className="font-semibold mb-2">{col.title}</h4>
                  {col.links.map((l: any, j: number) => (
                    <a key={j} href={l.href} className="block text-gray-400 text-sm">{l.text}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            {data.copyright || "© 2024 Company. All rights reserved."}
          </div>
        </div>
      );
    default:
      return (
        <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <p>{block_type} block preview</p>
        </div>
      );
  }
}

function BlockEditor({ block, onClose, onSave }: { block: Block; onClose: () => void; onSave: (data: any) => void }) {
  const [data, setData] = useState(block.data || {});

  const handleChange = (key: string, value: any) => {
    setData({ ...data, [key]: value });
  };

  const renderFields = () => {
    const fields = Object.keys(data);
    return fields.map(key => {
      if (typeof data[key] === "string") {
        if (key.includes("image") || key.includes("logo") || key.includes("url")) {
          return (
            <div key={key} className="space-y-1">
              <label className="text-xs text-gray-500 uppercase">{key}</label>
              <input
                type="text"
                value={data[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Enter URL"
              />
            </div>
          );
        }
        return (
          <div key={key} className="space-y-1">
            <label className="text-xs text-gray-500 uppercase">{key}</label>
            <input
              type="text"
              value={data[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        );
      }
      if (key === "features" || key === "plans" || key === "testimonials" || key === "faqs") {
        return (
          <div key={key} className="space-y-2">
            <label className="text-xs text-gray-500 uppercase">{key}</label>
            <textarea
              value={JSON.stringify(data[key], null, 2)}
              onChange={(e) => {
                try { handleChange(key, JSON.parse(e.target.value)); } catch {}
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              rows={6}
            />
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Edit {block.block_type}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {renderFields()}
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancel</button>
          <button onClick={() => onSave(data)} className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
}

function SeoForm({ seo, onSave }: { seo?: any; onSave: (data: any) => void }) {
  const [title, setTitle] = useState(seo?.title || "");
  const [description, setDescription] = useState(seo?.description || "");
  const [keywords, setKeywords] = useState(seo?.keywords?.join(", ") || "");
  const [noIndex, setNoIndex] = useState(seo?.no_index || false);

  const handleSubmit = () => {
    onSave({
      title,
      description,
      keywords: keywords.split(",").map((k: string) => k.trim()).filter(Boolean),
      no_index: noIndex
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 uppercase">Page Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          placeholder="SEO Title"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 uppercase">Meta Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          rows={3}
          placeholder="Meta description"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 uppercase">Keywords</label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          placeholder="comma, separated, keywords"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={noIndex}
          onChange={(e) => setNoIndex(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-gray-300">No Index (hide from search)</span>
      </label>
      <button
        onClick={handleSubmit}
        className="w-full py-2 bg-purple-600 text-white rounded-lg"
      >
        Save SEO
      </button>
    </div>
  );
}