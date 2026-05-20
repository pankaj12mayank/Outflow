"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { Save, ExternalLink, Eye, Globe, Upload, X, Check, ChevronRight, AlertCircle, Monitor, Tablet, Smartphone, CheckCircle } from "lucide-react";
import Link from "next/link";

type LandingContent = {
  branding?: { site_name: string; logo_url: string; favicon_url: string; tagline: string };
  hero: Record<string, string>;
  features: { icon: string; title: string; description: string; active: boolean }[];
  stats: { value: string; label: string }[];
  faqs: { question: string; answer: string; active: boolean }[];
  footer: { company: string; email: string; copyright: string };
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

const SECTIONS = [
  { id: "branding", label: "Branding", icon: Globe },
  { id: "hero", label: "Hero", icon: Monitor },
  { id: "features", label: "Features", icon: Tablet },
  { id: "stats", label: "Stats", icon: Smartphone },
  { id: "faqs", label: "FAQs", icon: Globe },
  { id: "footer", label: "Footer", icon: Globe },
];

export default function LandingCmsPage() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [tab, setTab] = useState("branding");
  const [saving, setSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/cms/landing/content", { headers: authHeaders() })
      .then((r) => {
        const c = r.data?.content || {};
        if (!c.branding) {
          c.branding = { site_name: "Outflo", logo_url: "", favicon_url: "", tagline: "" };
        }
        if (!c.hero) {
          c.hero = { badge: "AI-Powered Outreach Platform", title: "Scale Your Outreach", subtitle: "Stop wasting time", cta: "Start Free Trial", ctaSecondary: "Watch Demo", trustText: "No credit card required" };
        }
        if (!c.features) c.features = [];
        if (!c.stats) c.stats = [];
        if (!c.faqs) c.faqs = [];
        if (!c.footer) c.footer = { company: "Outflo Inc.", email: "hello@outflo.com", copyright: `© ${new Date().getFullYear()} Outflo. All rights reserved.` };
        setContent(c);
        setLoading(false);
      })
      .catch((err) => {
        console.error("CMS load error:", err);
        setLoadingError("Failed to load landing content");
        setLoading(false);
      });
  }, []);

  const saveSection = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const sectionData = content[tab as keyof LandingContent];
      if (!sectionData) {
        toast.error("Invalid section");
        return;
      }
      await api.put(
        `/api/v1/cms/landing/content?section=${tab}`,
        sectionData,
        { headers: authHeaders() }
      );
      toast.success("Saved", `${tab} section updated successfully`);
    } catch (err: any) {
      toast.error("Save failed", err.response?.data?.detail || "Could not save section");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading landing editor...</p>
        </div>
      </div>
    );
  }

  if (loadingError && !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c14] border-b border-white/10 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="w-6 h-6 text-purple-400" />
              Landing Page Editor
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage your public landing page content</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/landing"
              target="_blank"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
            >
              <Eye className="w-4 h-4" />
              Preview Live
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar - Section Navigation */}
        <aside className="w-full lg:w-72 bg-[#0c0c14] border-b lg:border-b-0 lg:border-r border-white/10 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Sections</h2>
          <nav className="space-y-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setTab(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    tab === section.id
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                  {tab === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - Editor */}
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">{tab} Section</h2>
                <p className="text-gray-400 text-sm mt-1">Edit content for the {tab} section</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={saveSection}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Editor Cards */}
            <div className="space-y-6">
              {/* Branding Section */}
              {tab === "branding" && content.branding && (
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      Brand Identity
                    </h3>
                    <div className="space-y-5">
                      <Field label="Site Name" value={content.branding.site_name} onChange={(v) => setContent({ ...content, branding: { ...content.branding!, site_name: v } })} />
                      <Field label="Tagline" value={content.branding.tagline} onChange={(v) => setContent({ ...content, branding: { ...content.branding!, tagline: v } })} />
                    </div>
                  </div>

                  <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-purple-400" />
                      Brand Assets
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <BrandingUpload kind="logo" label="Logo" url={content.branding.logo_url} onUploaded={(url) => setContent({ ...content, branding: { ...content.branding!, logo_url: url } })} />
                      <BrandingUpload kind="favicon" label="Favicon" url={content.branding.favicon_url} onUploaded={(url) => setContent({ ...content, branding: { ...content.branding!, favicon_url: url } })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Hero Section */}
              {tab === "hero" && (
                <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-purple-400" />
                    Hero Content
                  </h3>
                  <div className="space-y-5">
                    {[
                      { key: "badge", label: "Badge Text", placeholder: "AI-Powered Outreach Platform" },
                      { key: "title", label: "Headline", placeholder: "Scale Your Outreach" },
                      { key: "subtitle", label: "Subtitle", placeholder: "Stop wasting time on manual outreach..." },
                      { key: "cta", label: "Primary CTA", placeholder: "Start Free Trial" },
                      { key: "ctaSecondary", label: "Secondary CTA", placeholder: "Watch Demo" },
                      { key: "trustText", label: "Trust Text", placeholder: "No credit card required" },
                    ].map((field) => (
                      <Field
                        key={field.key}
                        label={field.label}
                        value={content.hero?.[field.key] || ""}
                        onChange={(v) => setContent({ ...content, hero: { ...content.hero, [field.key]: v } })}
                        placeholder={field.placeholder}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Features Section */}
              {tab === "features" && (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Tablet className="w-5 h-5 text-purple-400" />
                      Feature Cards ({content.features?.length || 0})
                    </h3>
                  </div>
                  {content.features?.map((f, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-purple-400">Feature {i + 1}</span>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.active}
                            onChange={(e) => {
                              const features = [...content.features];
                              features[i] = { ...f, active: e.target.checked };
                              setContent({ ...content, features });
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500"
                          />
                          Active
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Icon Name" value={f.icon} onChange={(v) => {
                          const features = [...content.features];
                          features[i] = { ...f, icon: v };
                          setContent({ ...content, features });
                        }} placeholder="Bot, Target, TrendingUp..." />
                        <Field label="Title" value={f.title} onChange={(v) => {
                          const features = [...content.features];
                          features[i] = { ...f, title: v };
                          setContent({ ...content, features });
                        }} />
                      </div>
                      <div className="mt-4">
                        <Field label="Description" value={f.description} onChange={(v) => {
                          const features = [...content.features];
                          features[i] = { ...f, description: v };
                          setContent({ ...content, features });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Section */}
              {tab === "stats" && (
                <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    Statistics Display
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {content.stats?.map((s, i) => (
                      <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-semibold text-purple-400">Stat {i + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Value" value={s.value} onChange={(v) => {
                            const stats = [...content.stats];
                            stats[i] = { ...s, value: v };
                            setContent({ ...content, stats });
                          }} placeholder="10M+" />
                          <Field label="Label" value={s.label} onChange={(v) => {
                            const stats = [...content.stats];
                            stats[i] = { ...s, label: v };
                            setContent({ ...content, stats });
                          }} placeholder="Emails Sent" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQs Section */}
              {tab === "faqs" && (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      Frequently Asked Questions ({content.faqs?.length || 0})
                    </h3>
                  </div>
                  {content.faqs?.map((f, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/20 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-purple-400">FAQ {i + 1}</span>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.active}
                            onChange={(e) => {
                              const faqs = [...content.faqs];
                              faqs[i] = { ...f, active: e.target.checked };
                              setContent({ ...content, faqs });
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500"
                          />
                          Active
                        </label>
                      </div>
                      <div className="space-y-4">
                        <Field label="Question" value={f.question} onChange={(v) => {
                          const faqs = [...content.faqs];
                          faqs[i] = { ...f, question: v };
                          setContent({ ...content, faqs });
                        }} />
                        <Field label="Answer" value={f.answer} onChange={(v) => {
                          const faqs = [...content.faqs];
                          faqs[i] = { ...f, answer: v };
                          setContent({ ...content, faqs });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Section */}
              {tab === "footer" && (
                <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Footer Information
                  </h3>
                  <div className="space-y-5">
                    <Field label="Company Name" value={content.footer?.company || ""} onChange={(v) => setContent({ ...content, footer: { ...content.footer, company: v } })} />
                    <Field label="Contact Email" value={content.footer?.email || ""} onChange={(v) => setContent({ ...content, footer: { ...content.footer, email: v } })} />
                    <Field label="Copyright Text" value={content.footer?.copyright || ""} onChange={(v) => setContent({ ...content, footer: { ...content.footer, copyright: v } })} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <input
        className="w-full rounded-xl bg-[#0a0a0f] border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function assetUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function BrandingUpload({
  kind,
  label,
  url,
  onUploaded,
}: {
  kind: "logo" | "favicon";
  label: string;
  url: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  
  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(
        `/api/v1/cms/landing/upload/branding?kind=${kind}`,
        fd,
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      onUploaded(res.data.url);
      toast.success("Uploaded", `${label} synced to landing`);
    } catch {
      toast.error("Upload failed", "Could not upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
      <label className="block text-sm font-medium text-gray-300 mb-3">{label}</label>
      <div className="flex items-start gap-4">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*,.ico"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <div className={`p-4 rounded-xl border-2 border-dashed transition-all ${
            uploading ? "border-purple-500/50 bg-purple-500/5" : "border-white/10 hover:border-purple-500/30 hover:bg-white/5"
          }`}>
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-400">
                {uploading ? "Uploading..." : "Click to upload"}
              </span>
            </div>
          </div>
        </label>
        {url && (
          <div className="w-24 h-24 rounded-xl border border-white/10 bg-black/40 p-2">
            <p className="text-[10px] text-gray-500 mb-1">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(url)}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}