"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { 
  Mail, Send, Clock, AlertCircle, CheckCircle, XCircle, 
  FileText, Zap, RefreshCw, Eye,
  Plus
} from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function EmailEnginePage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, queueRes, templatesRes] = await Promise.all([
        api.get("/api/v1/email-engine/analytics", { headers: authHeaders() }),
        api.get("/api/v1/email-engine/queue/stats", { headers: authHeaders() }),
        api.get("/api/v1/email-engine/templates", { headers: authHeaders() }),
      ]);
      setAnalytics(analyticsRes.data);
      setQueueStats(queueRes.data);
      setTemplates(templatesRes.data?.templates || []);
    } catch (error) {
      console.error("Failed to load email engine data:", error);
      toast.error("Failed to load email engine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value || "0"}</div>
      <div className="text-gray-400 text-sm">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <SoPageLayout
      title="Email Automation"
      description="Event-driven email automation engine"
      actions={
        <button 
          onClick={loadData} 
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Sent" 
          value={analytics?.total_sent || 0} 
          icon={Send} 
          color="bg-purple-500/10 border border-purple-500/20"
          subtitle={`Delivery: ${analytics?.delivery_rate || 0}%`}
        />
        <StatCard 
          title="Delivered" 
          value={analytics?.total_delivered || 0} 
          icon={CheckCircle} 
          color="bg-green-500/10 border border-green-500/20"
        />
        <StatCard 
          title="Opened" 
          value={analytics?.total_opened || 0} 
          icon={Eye} 
          color="bg-blue-500/10 border border-blue-500/20"
          subtitle={`Rate: ${analytics?.open_rate || 0}%`}
        />
        <StatCard 
          title="Clicked" 
          value={analytics?.total_clicked || 0} 
          icon={Zap} 
          color="bg-yellow-500/10 border border-yellow-500/20"
          subtitle={`Rate: ${analytics?.click_rate || 0}%`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Pending" 
          value={queueStats?.pending || 0} 
          icon={Clock} 
          color="bg-orange-500/10 border border-orange-500/20"
        />
        <StatCard 
          title="Processing" 
          value={queueStats?.processing || 0} 
          icon={RefreshCw} 
          color="bg-blue-500/10 border border-blue-500/20"
        />
        <StatCard 
          title="Failed" 
          value={queueStats?.failed || 0} 
          icon={XCircle} 
          color="bg-red-500/10 border border-red-500/20"
        />
        <StatCard 
          title="Scheduled" 
          value={queueStats?.scheduled || 0} 
          icon={AlertCircle} 
          color="bg-gray-500/10 border border-gray-500/20"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Templates</h2>
            <Link 
              href="/system-owner/email/templates" 
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {templates.slice(0, 5).map((template: any) => (
              <div 
                key={template._id || template.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-400">{template.category}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs ${
                  template.status === 'active' 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {template.status}
                </span>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-gray-400 text-sm">No templates yet</p>
                <Link href="/system-owner/email/templates" className="text-purple-400 text-sm hover:underline">Create one →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Triggers</h2>
            <Link 
              href="/system-owner/email/triggers" 
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: "Welcome", desc: "On user signup", count: 0 },
              { label: "Payment Success", desc: "On successful payment", count: 0 },
              { label: "Trial Ending", desc: "3 days before trial ends", count: 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                </div>
                <Link href="/system-owner/email/triggers" className="text-xs text-purple-400 hover:underline">Setup</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SoPageLayout>
  );
}