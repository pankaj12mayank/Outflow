"use client";

import { useState } from "react";
import api from "@/app/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FileText, Globe, MessageSquare, Star, Search, Plus, Pencil, Trash2, Eye, EyeOff, Save, ChevronDown, ChevronRight } from "lucide-react";

type TabKey = "landing" | "pricing" | "faqs" | "testimonials" | "seo" | "integrations";

export default function CMSPage() {
  const [tab, setTab] = useState<TabKey>("landing");

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "landing", label: "Landing Page", icon: Globe },
    { key: "pricing", label: "Pricing", icon: FileText },
    { key: "faqs", label: "FAQs", icon: MessageSquare },
    { key: "testimonials", label: "Testimonials", icon: Star },
    { key: "seo", label: "SEO", icon: Search },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Content Management</h1>
        <p className="text-gray-400">Manage landing page, pricing, FAQs, and more</p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "landing" && <LandingSection />}
      {tab === "pricing" && <PricingSection />}
      {tab === "faqs" && <FAQsSection />}
      {tab === "testimonials" && <TestimonialsSection />}
      {tab === "seo" && <SEOSection />}
    </div>
  );
}

function LandingSection() {
  const { data } = useQuery({
    queryKey: ["cms", "landing"],
    queryFn: () => api.get("/api/v1/cms/landing-page").then((r) => r.data),
  });

  const sections = [
    { key: "hero", name: "Hero Section", title: "Hero Title", subtitle: "Hero Subtitle" },
    { key: "features", name: "Features", title: "Features Title", subtitle: "Features Subtitle" },
    { key: "pricing_overview", name: "Pricing Overview", title: "Section Title", subtitle: "Section Subtitle" },
    { key: "cta", name: "Call to Action", title: "CTA Title", subtitle: "CTA Subtitle" },
    { key: "footer", name: "Footer", title: "Footer Title", subtitle: "Footer Subtitle" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Landing Page Sections</h3>
      </div>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.key} className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">{s.name}</h4>
              <div className="flex items-center gap-2">
                <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">Edit Content</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Title</label>
                <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={s.title} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subtitle</label>
                <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={s.subtitle} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection() {
  interface PricingPlan {
    key: string;
    name: string;
    description: string;
    monthly_price: number;
    is_highlighted: boolean;
  }

  const { data: plans } = useQuery<{ plans: PricingPlan[] }>({
    queryKey: ["cms", "pricing"],
    queryFn: () => api.get("/api/v1/cms/pricing").then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Pricing Plans (Public)</h3>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
          <Plus className="w-4 h-4" /> Add Plan
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.plans?.map((plan: PricingPlan) => (
          <div key={plan.key} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">{plan.name}</h4>
              {plan.is_highlighted && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">Highlighted</span>}
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-white">${plan.monthly_price}</span>
              <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">{plan.description}</p>
            <div className="flex items-center gap-2">
              <button className="text-xs text-gray-400 hover:text-white"><Pencil className="w-3 h-3 inline" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQsSection() {
  const { data } = useQuery({
    queryKey: ["cms", "faqs"],
    queryFn: () => api.get("/api/v1/cms/faqs").then((r) => r.data),
  });

  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Frequently Asked Questions</h3>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>
      <div className="space-y-2">
        {data?.faqs?.map((faq: { id: number; question: string; answer: string; category: string }) => (
          <div key={faq.id} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
            <button onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between p-4 text-left">
              <span className="text-white text-sm">{faq.question}</span>
              {expanded === faq.id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {expanded === faq.id && (
              <div className="px-4 pb-4">
                <p className="text-gray-400 text-sm">{faq.answer}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500">{faq.category}</span>
                  <button className="text-xs text-gray-500 hover:text-white"><Pencil className="w-3 h-3 inline" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection() {
  interface Testimonial {
    id: number;
    quote: string;
    author_name: string;
    author_title: string;
    author_company: string;
    rating: number;
  }

  const { data } = useQuery<{ testimonials: Testimonial[] }>({
    queryKey: ["cms", "testimonials"],
    queryFn: () => api.get("/api/v1/cms/testimonials").then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Customer Testimonials</h3>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
          <Plus className="w-4 h-4" /> Add Testimonial
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.testimonials?.map((t: Testimonial) => (
          <div key={t.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <p className="text-gray-300 text-sm mb-4">"{t.quote}"</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{t.author_name}</p>
                <p className="text-xs text-gray-500">{t.author_title} at {t.author_company}</p>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: t.rating || 5 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SEOSection() {
  const pages = ["home", "pricing", "login", "register", "features", "about"];
  const [selectedPage, setSelectedPage] = useState("home");

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {pages.map((p) => (
          <button key={p} onClick={() => setSelectedPage(p)}
            className={`px-4 py-2 rounded-xl text-sm capitalize ${selectedPage === p ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h3 className="text-white font-semibold mb-4 capitalize">{selectedPage} - SEO Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Page Title</label>
            <input className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="Page title for SEO" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Meta Description</label>
            <textarea className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white h-24" placeholder="Meta description for search engines" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Keywords</label>
            <input className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" placeholder="keyword1, keyword2, keyword3" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">OG Title</label>
            <input className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">OG Description</label>
            <input className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" />
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mt-4">
          <Save className="w-4 h-4" /> Save SEO Config
        </button>
      </div>
    </div>
  );
}