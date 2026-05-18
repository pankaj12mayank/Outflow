"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { Save, ExternalLink } from "lucide-react";
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

const SECTIONS = ["branding", "hero", "features", "stats", "faqs", "footer"] as const;

export default function LandingCmsPage() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("branding");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/v1/cms/landing/content")
      .then((r) => {
        const c = r.data.content || {};
        if (!c.branding) {
          c.branding = { site_name: "Outflo", logo_url: "", favicon_url: "", tagline: "" };
        }
        setContent(c);
      })
      .catch(() => toast.error("Failed to load landing content"));
  }, []);

  const saveSection = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await api.put(
        `/api/v1/cms/landing/content?section=${tab}`,
        content[tab as keyof LandingContent],
        { headers: authHeaders() }
      );
      toast.success("Saved", `${tab} updated on landing page`);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!content) {
    return <div className="p-8 text-gray-500">Loading landing editor…</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Landing page</h1>
          <p className="text-gray-400 text-sm mt-1">
            Single-page editor. Pricing comes from Plans — not edited here.
          </p>
        </div>
        <Link
          href="/landing"
          target="_blank"
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
        >
          Preview <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              tab === s ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        {tab === "branding" && content.branding && (
          <>
            <Field label="Site name" value={content.branding.site_name} onChange={(v) => setContent({ ...content, branding: { ...content.branding!, site_name: v } })} />
            <Field label="Tagline" value={content.branding.tagline} onChange={(v) => setContent({ ...content, branding: { ...content.branding!, tagline: v } })} />
            <BrandingUpload
              kind="logo"
              label="Logo"
              url={content.branding.logo_url}
              onUploaded={(url) =>
                setContent({ ...content, branding: { ...content.branding!, logo_url: url } })
              }
            />
            <BrandingUpload
              kind="favicon"
              label="Favicon"
              url={content.branding.favicon_url}
              onUploaded={(url) =>
                setContent({ ...content, branding: { ...content.branding!, favicon_url: url } })
              }
            />
          </>
        )}

        {tab === "hero" && (
          <>
            {Object.entries(content.hero).map(([key, val]) => (
              <Field
                key={key}
                label={key}
                value={String(val)}
                onChange={(v) => setContent({ ...content, hero: { ...content.hero, [key]: v } })}
              />
            ))}
          </>
        )}

        {tab === "features" &&
          content.features.map((f, i) => (
            <div key={i} className="p-4 rounded-lg border border-white/10 space-y-2">
              <Field label="Title" value={f.title} onChange={(v) => {
                const features = [...content.features];
                features[i] = { ...f, title: v };
                setContent({ ...content, features });
              }} />
              <Field label="Description" value={f.description} onChange={(v) => {
                const features = [...content.features];
                features[i] = { ...f, description: v };
                setContent({ ...content, features });
              }} />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) => {
                    const features = [...content.features];
                    features[i] = { ...f, active: e.target.checked };
                    setContent({ ...content, features });
                  }}
                />
                Show on landing
              </label>
            </div>
          ))}

        {tab === "stats" &&
          content.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label="Value" value={s.value} onChange={(v) => {
                const stats = [...content.stats];
                stats[i] = { ...s, value: v };
                setContent({ ...content, stats });
              }} />
              <Field label="Label" value={s.label} onChange={(v) => {
                const stats = [...content.stats];
                stats[i] = { ...s, label: v };
                setContent({ ...content, stats });
              }} />
            </div>
          ))}

        {tab === "faqs" &&
          content.faqs.map((f, i) => (
            <div key={i} className="p-4 rounded-lg border border-white/10 space-y-2">
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
          ))}

        {tab === "footer" && (
          <>
            <Field label="Company" value={content.footer.company} onChange={(v) => setContent({ ...content, footer: { ...content.footer, company: v } })} />
            <Field label="Email" value={content.footer.email} onChange={(v) => setContent({ ...content, footer: { ...content.footer, email: v } })} />
            <Field label="Copyright" value={content.footer.copyright} onChange={(v) => setContent({ ...content, footer: { ...content.footer, copyright: v } })} />
          </>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={saveSection}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save section"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm text-gray-400">
      {label}
      <input
        className="mt-1 w-full rounded-lg bg-[#0a0a0f] border border-white/10 px-3 py-2 text-white text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
  const upload = async (file: File) => {
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
      toast.error("Upload failed");
    }
  };

  return (
    <div className="block text-sm text-gray-400">
      <span>{label}</span>
      <div className="mt-2 flex flex-col sm:flex-row gap-4 items-start">
        <input
          type="file"
          accept="image/*,.ico"
          className="text-xs text-gray-400"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        {url && (
          <div className="rounded-lg border border-white/10 p-2 bg-black/40">
            <p className="text-[10px] text-gray-500 mb-1">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(url)}
              alt={label}
              className={kind === "favicon" ? "w-8 h-8 object-contain" : "h-10 max-w-[160px] object-contain"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
