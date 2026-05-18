"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";

export interface PlanFeature {
  enabled: boolean;
  limit?: number;
  value?: any;
}

export interface PlanLimits {
  [resource: string]: {
    current: number;
    limit: number;
    remaining: number;
  };
}

const PLAN_FEATURES: Record<string, { name: string; category: string }> = {
  ai_credits: { name: "AI Credits", category: "AI" },
  leads_limit: { name: "Lead Limit", category: "Leads" },
  campaigns: { name: "Campaigns", category: "Campaigns" },
  crm_access: { name: "CRM Access", category: "CRM" },
  exports: { name: "Data Exports", category: "Exports" },
  analytics: { name: "Analytics", category: "Analytics" },
  linkedin_enrichment: { name: "LinkedIn Enrichment", category: "Enrichment" },
  white_label: { name: "White Label", category: "Branding" },
  smtp_access: { name: "SMTP Access", category: "Email" },
  api_access: { name: "API Access", category: "Developer" },
  team_members: { name: "Team Members", category: "Team" },
  email_templates: { name: "Email Templates", category: "Email" },
  sequences: { name: "Sequences", category: "Email" },
  scraping_credits: { name: "Scraping Credits", category: "Scraping" },
};

export function usePlanFeatures() {
  const [features, setFeatures] = useState<Record<string, PlanFeature>>({});
  const [limits, setLimits] = useState<PlanLimits>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const [featuresRes, limitsRes] = await Promise.all([
        api.get("/api/v1/features", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { features: [] } })),
        api.get("/api/v1/usage/limits/me", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { limits: {} } }))
      ]);

      const featureMap: Record<string, PlanFeature> = {};
      (featuresRes.data.features || []).forEach((f: any) => {
        featureMap[f.key] = { enabled: f.enabled, limit: f.limit };
      });

      setFeatures(featureMap);
      setLimits(limitsRes.data.limits || {});
    } catch (error) {
      console.error("Failed to fetch plan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureKey: string): boolean => {
    const feature = features[featureKey];
    if (!feature) return false;
    return feature.enabled;
  };

  const getLimit = (resourceKey: string): number | null => {
    const feature = features[resourceKey];
    return feature?.limit ?? null;
  };

  const getUsage = (resourceKey: string): { current: number; limit: number; remaining: number } => {
    const limitData = limits[resourceKey];
    if (!limitData) return { current: 0, limit: 0, remaining: 0 };
    return limitData;
  };

  const isWithinLimit = (resourceKey: string, count: number = 1): boolean => {
    const usage = getUsage(resourceKey);
    if (usage.limit === -1) return true;
    return usage.current + count <= usage.limit;
  };

  const canUseFeature = (featureKey: string): { allowed: boolean; reason?: string } => {
    if (!hasFeature(featureKey)) {
      return { allowed: false, reason: "Feature not available on your plan" };
    }

    const usage = getUsage(featureKey);
    if (usage.limit === -1) return { allowed: true };

    if (usage.current >= usage.limit) {
      return { allowed: false, reason: "Limit reached. Upgrade your plan." };
    }

    return { allowed: true };
  };

  const getFeaturesByCategory = (): Record<string, string[]> => {
    const categories: Record<string, string[]> = {};

    Object.entries(features).forEach(([key, feature]) => {
      if (feature.enabled) {
        const meta = PLAN_FEATURES[key];
        const category = meta?.category || "Other";
        if (!categories[category]) categories[category] = [];
        categories[category].push(key);
      }
    });

    return categories;
  };

  return {
    features,
    limits,
    loading,
    hasFeature,
    getLimit,
    getUsage,
    isWithinLimit,
    canUseFeature,
    getFeaturesByCategory,
    refresh: fetchPlanData
  };
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback = null,
  showUpgradePrompt = false 
}: { 
  feature: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}) {
  const { hasFeature, canUseFeature } = usePlanFeatures();

  if (!hasFeature(feature)) {
    if (fallback) return <>{fallback}</>;
    if (showUpgradePrompt) {
      return (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-400 text-sm">
            This feature is not available on your plan. Upgrade to access it.
          </p>
        </div>
      );
    }
    return null;
  }

  const { allowed, reason } = canUseFeature(feature);
  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-400 text-sm">{reason}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function LimitGuard({ 
  resource, 
  count = 1,
  children,
  fallback = null 
}: { 
  resource: string; 
  count?: number;
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { isWithinLimit, getUsage } = usePlanFeatures();

  if (!isWithinLimit(resource, count)) {
    const usage = getUsage(resource);
    if (fallback) return <>{fallback}</>;
    return (
      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
        <p className="text-orange-400 text-sm">
          You've used {usage.current} / {usage.limit === -1 ? "∞" : usage.limit}. Upgrade for more.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}