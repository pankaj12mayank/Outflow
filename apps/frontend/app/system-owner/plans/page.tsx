"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Edit2, Trash2, Check, X, DollarSign, 
  Users, Zap, Mail, Target, Search, Globe,
  Shield, Layers, Star, Save, RotateCcw
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";
import { Button } from "@/app/components/premium";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/app/components/premium/card";
import { Modal, ModalHeader, ModalContent, ModalFooter, ModalTitle, ModalDescription } from "@/app/components/premium/modal";
import { FormField, FormLabel, FormInput, FormCheckbox, FormSection, FormActions } from "@/app/components/premium/form";
import { Badge } from "@/app/components/premium/badge";
import { PageSkeleton } from "@/app/components/premium/skeleton";
import { toast } from "@/app/components/toast";

interface Plan {
  _id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  is_default: boolean;
  is_popular: boolean;
  features: any[];
  limits: any[];
  status: string;
}

interface Feature {
  key: string;
  name: string;
  description: string;
  type: string;
}

const AVAILABLE_FEATURES: Feature[] = [
  { key: "ai_credits", name: "AI Credits", description: "Monthly AI generation credits", type: "limit" },
  { key: "leads_limit", name: "Lead Limit", description: "Maximum number of leads", type: "limit" },
  { key: "campaigns", name: "Campaigns", description: "Email campaigns", type: "boolean" },
  { key: "crm_access", name: "CRM Access", description: "CRM functionality", type: "boolean" },
  { key: "exports", name: "Data Exports", description: "Export data", type: "boolean" },
  { key: "analytics", name: "Analytics", description: "Analytics dashboard", type: "boolean" },
  { key: "linkedin_enrichment", name: "LinkedIn Enrichment", description: "LinkedIn data enrichment", type: "boolean" },
  { key: "white_label", name: "White Label", description: "Custom branding", type: "boolean" },
  { key: "smtp_access", name: "SMTP Access", description: "Custom SMTP configuration", type: "boolean" },
  { key: "api_access", name: "API Access", description: "API access", type: "boolean" },
  { key: "team_members", name: "Team Members", description: "Number of team members", type: "limit" },
  { key: "email_templates", name: "Email Templates", description: "Custom email templates", type: "limit" },
  { key: "sequences", name: "Sequences", description: "Email sequences", type: "limit" },
  { key: "scraping_credits", name: "Scraping Credits", description: "Web scraping credits", type: "limit" },
];

export default function PlanBuilderPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("plans");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const [plansRes, templatesRes] = await Promise.all([
        api.get("/api/v1/plans", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/api/v1/plans/templates", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPlans(plansRes.data.plans || []);
      setTemplates(templatesRes.data.templates || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to archive this plan?")) return;
    
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.delete(`/api/v1/plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      toast.error("Cannot delete plan", "Cannot delete default plan");
    }
  };

  const handleSetDefault = async (planId: string) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post(`/api/v1/plans/${planId}/set-default`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  const createFromTemplate = async (template: any) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post("/api/v1/plans", template, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
      setActiveTab("plans");
    } catch (error) {
      console.error("Failed to create plan:", error);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] p-8">
        <PageSkeleton stats={0} chart={false} table={true} tableRows={3} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const tabs = [
    { id: "plans", label: "Manage Plans", icon: Layers },
    { id: "templates", label: "Templates", icon: Star },
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
                <Layers className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Plan Management</h1>
                <p className="text-xs text-[var(--color-text-tertiary)]">Configure pricing and features</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            {tabs.map((tab, i) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[var(--color-purple-dim)] text-[var(--color-purple)] border border-[var(--color-purple)]/30"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] border border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "plans" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Your Plans</h2>
                <Button 
                  variant="glow" 
                  onClick={() => { setEditingPlan(null); setIsModalOpen(true); }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Plan
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan, i) => (
                  <motion.div
                    key={plan._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`bg-[var(--color-bg-secondary)] border rounded-2xl p-6 hover:border-[var(--color-border-hover)] transition-all duration-300 ${
                      plan.is_default ? "border-[var(--color-purple)]/50" : "border-[var(--color-border)]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{plan.name}</h3>
                          {plan.is_default && (
                            <Badge variant="purple">Default</Badge>
                          )}
                          {plan.is_popular && (
                            <Badge variant="green">Popular</Badge>
                          )}
                        </div>
                        <p className="text-[var(--color-text-tertiary)] text-sm mt-1">{plan.description}</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-bold text-[var(--color-text-primary)]">${plan.price_monthly}</span>
                      <span className="text-[var(--color-text-tertiary)]">/month</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      {(plan.features || []).slice(0, 6).map((feature: any, j: number) => (
                        <motion.div 
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.05 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          {feature.enabled ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                          <span className={feature.enabled ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"}>
                            {AVAILABLE_FEATURES.find(f => f.key === feature.feature_key)?.name || feature.feature_key}
                            {feature.limit && feature.limit > 0 && ` (${feature.limit})`}
                            {feature.limit === -1 && ` (Unlimited)`}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-[var(--color-border)]">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setEditingPlan(plan); setIsModalOpen(true); }}
                        leftIcon={<Edit2 className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      {!plan.is_default && (
                        <>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleSetDefault(plan._id)}
                            leftIcon={<Star className="w-4 h-4" />}
                          >
                            Set Default
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(plan._id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "templates" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Plan Templates</h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">Create a new plan from a template</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {templates.map((template, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-border-hover)] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{template.name}</h3>
                      {template.is_popular && (
                        <Badge variant="green">Popular</Badge>
                      )}
                    </div>
                    <p className="text-[var(--color-text-tertiary)] text-sm mb-4">{template.description}</p>
                    
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">${template.price_monthly}</span>
                      <span className="text-[var(--color-text-tertiary)]">/mo</span>
                    </div>

                    <Button 
                      variant="glow" 
                      className="w-full"
                      onClick={() => createFromTemplate(template)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Plan
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PlanModal
        plan={editingPlan}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingPlan(null); }}
        onSave={() => { setIsModalOpen(false); fetchData(); }}
      />
    </div>
  );
}

function PlanModal({ plan, isOpen, onClose, onSave }: { plan: Plan | null; isOpen: boolean; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    is_default: plan?.is_default || false,
    is_popular: plan?.is_popular || false,
    features: plan?.features || [],
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        is_default: plan.is_default,
        is_popular: plan.is_popular,
        features: plan.features || [],
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price_monthly: 0,
        price_yearly: 0,
        is_default: false,
        is_popular: false,
        features: [],
      });
    }
  }, [plan]);

  const toggleFeature = (featureKey: string, isLimit: boolean) => {
    const existing = formData.features.find((f: any) => f.feature_key === featureKey);
    
    if (existing) {
      setFormData({
        ...formData,
        features: formData.features.filter((f: any) => f.feature_key !== featureKey)
      });
    } else {
      const newFeature: any = { feature_key: featureKey, enabled: true };
      if (isLimit) {
        newFeature.limit = 100;
      }
      setFormData({
        ...formData,
        features: [...formData.features, newFeature]
      });
    }
  };

  const updateFeature = (featureKey: string, field: string, value: any) => {
    setFormData({
      ...formData,
      features: formData.features.map((f: any) => 
        f.feature_key === featureKey ? { ...f, [field]: value } : f
      )
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      
      const featuresWithLimits = formData.features.map((f: any) => {
        const featureDef = AVAILABLE_FEATURES.find(fd => fd.key === f.feature_key);
        if (featureDef?.type === "limit" && !f.limit) {
          return { ...f, limit: 100 };
        }
        return f;
      });
      
      const payload = {
        ...formData,
        features: featuresWithLimits,
        limits: featuresWithLimits
          .filter((f: any) => f.limit)
          .map((f: any) => ({
            resource: f.feature_key,
            limit: f.limit,
            unit: "units"
          }))
      };

      if (plan?._id) {
        await api.put(`/api/v1/plans/${plan._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.post("/api/v1/plans", payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSave();
    } catch (error) {
      console.error("Failed to save plan:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{plan ? "Edit Plan" : "Create Plan"}</ModalTitle>
        <ModalDescription>
          {plan ? "Update the plan details below" : "Create a new pricing plan"}
        </ModalDescription>
      </ModalHeader>
      
      <ModalContent>
        <div className="space-y-6">
          <FormSection title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Plan Name</FormLabel>
                <FormInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pro"
                />
              </FormField>
              <FormField>
                <FormLabel>Monthly Price ($)</FormLabel>
                <FormInput
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            </div>
            
            <FormField>
              <FormLabel>Description</FormLabel>
              <FormInput
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan description"
              />
            </FormField>
          </FormSection>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel>Yearly Price ($)</FormLabel>
                <FormInput
                  type="number"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
              <div className="flex flex-col gap-4 pt-6">
                <FormCheckbox
                  label="Set as Default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                />
                <FormCheckbox
                  label="Mark as Popular"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Features">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_FEATURES.map((feature) => {
                const isEnabled = formData.features.some((f: any) => f.feature_key === feature.key);
                const isLimit = feature.type === "limit";
                const featureData = formData.features.find((f: any) => f.feature_key === feature.key);
                
                return (
                  <motion.div
                    key={feature.key}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isEnabled 
                        ? "bg-[var(--color-purple-dim)] border-[var(--color-purple)]/30" 
                        : "bg-[var(--color-bg-tertiary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                    }`}
                    onClick={() => toggleFeature(feature.key, isLimit)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[var(--color-text-primary)] font-medium">{feature.name}</div>
                        <div className="text-[var(--color-text-muted)] text-xs">{feature.description}</div>
                      </div>
                      {isEnabled && <Check className="w-5 h-5 text-[var(--color-purple)]" />}
                    </div>
                    
                    {isEnabled && isLimit && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                        <FormInput
                          type="number"
                          value={featureData?.limit || 100}
                          onChange={(e) => updateFeature(feature.key, "limit", parseInt(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Limit"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </FormSection>
        </div>
      </ModalContent>
      
      <ModalFooter>
        <FormActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="glow" onClick={handleSubmit} leftIcon={<Save className="w-4 h-4" />}>
            Save Plan
          </Button>
        </FormActions>
      </ModalFooter>
    </Modal>
  );
}