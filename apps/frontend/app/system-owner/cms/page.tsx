"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, Reorder } from "framer-motion";
import { 
  Plus, Save, Eye, Globe, Layout, Trash2, GripVertical,
  Settings, ChevronDown, Monitor, Smartphone, Tablet,
  History, Search, MoreVertical, ArrowLeft, Check
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";
import { Button } from "@/app/components/premium";
import { FormInput } from "@/app/components/premium/form";
import { Badge } from "@/app/components/premium/badge";
import { PageSkeleton } from "@/app/components/premium/skeleton";
import { EmptyState } from "@/app/components/premium/states";

interface Page {
  _id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Block {
  _id: string;
  block_type: string;
  order: number;
  data: any;
}

interface Template {
  type: string;
  name: string;
  description: string;
  default_data: any;
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

export default function CMSPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pages");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPages();
    }
  }, [isAuthenticated]);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.get("/api/v1/cms/landing/pages", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPages(response.data.pages || []);
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    const name = prompt("Enter page name:");
    if (!name) return;
    
    const slug = prompt("Enter URL slug (e.g., home, pricing):", name.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;

    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post("/api/v1/cms/landing/pages", { name, slug }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPages();
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.delete(`/api/v1/cms/landing/pages/${pageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPages();
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] p-8">
        <PageSkeleton stats={0} chart={false} table={false} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const filteredPages = pages.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "pages", label: "Pages" },
    { id: "templates", label: "Templates" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center shadow-lg shadow-[var(--color-purple-glow)]"
              >
                <Layout className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Landing Pages</h1>
                <p className="text-xs text-[var(--color-text-tertiary)]">Manage your CMS content</p>
              </div>
            </div>
            
            <Button 
              variant="glow" 
              onClick={handleCreatePage}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Page
            </Button>
          </div>
          
          <div className="flex gap-2 mt-4">
            {tabs.map((tab, i) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[var(--color-purple-dim)] text-[var(--color-purple)] border border-[var(--color-purple)]/30"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "pages" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
                <FormInput
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPages.map((page, i) => (
                <motion.div
                  key={page._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-border-hover)] transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{page.name}</h3>
                      <p className="text-[var(--color-text-tertiary)] text-sm">/{page.slug}</p>
                    </div>
                    <Badge variant={page.status === "published" ? "green" : "yellow"}>
                      {page.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] text-sm mb-4">
                    <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/system-owner/cms/${page._id}`)}
                      leftIcon={<Settings className="w-4 h-4" />}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => window.open(`/landing/${page.slug}`, "_blank")}
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      Preview
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeletePage(page._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredPages.length === 0 && (
              <EmptyState
                icon={<Layout className="w-12 h-12" />}
                title="No pages found"
                description="Create your first landing page to get started"
                action={
                  <Button variant="glow" onClick={handleCreatePage} leftIcon={<Plus className="w-4 h-4" />}>
                    Create Page
                  </Button>
                }
              />
            )}
          </div>
        )}

        {activeTab === "templates" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BLOCK_TYPES.map((block, i) => (
              <motion.div
                key={block.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-border-hover)] cursor-pointer transition-all duration-300"
              >
                <div className="text-3xl mb-3">{block.icon}</div>
                <h3 className="text-[var(--color-text-primary)] font-medium">{block.name}</h3>
                <p className="text-[var(--color-text-tertiary)] text-sm mt-1">Click to add to page</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}