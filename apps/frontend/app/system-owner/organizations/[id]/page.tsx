"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Building2, Users, Mail, Bot, Search, Target, 
  Calendar, DollarSign, Activity, Play, Pause,
  ArrowLeft, CreditCard, Clock, BarChart3
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";

interface Analytics {
  organization: any;
  users: { total: number; active_30d: number };
  leads: { total: number };
  campaigns: { total: number; active: number };
  emails: { sent_30d: number; failed_30d: number; delivery_rate: number };
  ai: { generations_30d: number };
  scraping: { credits_30d: number };
  subscription: { plan: string; status: string; billing_cycle: string };
}

interface Member {
  _id: string;
  user: any;
  role: string;
  joined_at: string;
}

interface Activity {
  _id: string;
  action: string;
  user_id: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  suspended: "bg-red-500/20 text-red-400",
  trial: "bg-yellow-500/20 text-yellow-400",
};

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;
  
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && orgId) {
      fetchData();
    }
  }, [isAuthenticated, orgId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [analyticsRes, membersRes, activityRes] = await Promise.all([
        api.get(`/api/v1/organizations/${orgId}/analytics`, { headers }),
        api.get(`/api/v1/organizations/${orgId}/members`, { headers }),
        api.get(`/api/v1/organizations/${orgId}/activity?limit=20`, { headers })
      ]);
      
      setAnalytics(analyticsRes.data);
      setMembers(membersRes.data.members || []);
      setActivities(activityRes.data.activities || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.post(`/api/v1/impersonate/${orgId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.setItem("impersonation_token", response.data.access_token);
      window.open("/app/dashboard", "_blank");
    } catch (error) {
      console.error("Failed to impersonate:", error);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !analytics) return null;

  const MetricCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/20`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </motion.div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "members", label: "Members", icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/system-owner/organizations")}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white">{analytics.organization.name}</h1>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[analytics.organization.status]}`}>
                    {analytics.organization.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{analytics.organization.slug}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleImpersonate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
              >
                <Play className="w-4 h-4" />
                Impersonate
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-4 gap-4">
              <MetricCard title="Total Users" value={analytics.users.total} icon={Users} color="blue" subtitle={`${analytics.users.active_30d} active (30d)`} />
              <MetricCard title="Total Leads" value={analytics.leads.total} icon={Target} color="yellow" />
              <MetricCard title="Campaigns" value={analytics.campaigns.total} icon={Mail} color="orange" subtitle={`${analytics.campaigns.active} active`} />
              <MetricCard title="Plan" value={analytics.subscription.plan} icon={DollarSign} color="purple" />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <MetricCard title="Emails Sent (30d)" value={analytics.emails.sent_30d} icon={Mail} color="pink" subtitle={`${analytics.emails.failed_30d} failed`} />
              <MetricCard title="Delivery Rate" value={analytics.emails.delivery_rate + "%"} icon={Target} color="green" />
              <MetricCard title="AI Generations (30d)" value={analytics.ai.generations_30d} icon={Bot} color="indigo" />
              <MetricCard title="Scraping Credits (30d)" value={analytics.scraping.credits_30d} icon={Search} color="amber" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Subscription Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white">{analytics.subscription.plan}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Status</span>
                    <span className={`${statusColors[analytics.subscription.status]}`}>{analytics.subscription.status}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Billing Cycle</span>
                    <span className="text-white capitalize">{analytics.subscription.billing_cycle}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Created</span>
                    <span className="text-white">{new Date(analytics.organization.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Email Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Sent (30d)</span>
                    <span className="text-white">{analytics.emails.sent_30d}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Failed (30d)</span>
                    <span className="text-red-400">{analytics.emails.failed_30d}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-400">Delivery Rate</span>
                    <span className="text-green-400">{analytics.emails.delivery_rate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "members" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Team Members ({members.length})</h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{member.user?.full_name || "Unknown"}</div>
                        <div className="text-gray-400 text-sm">{member.user?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        member.role === "owner" ? "bg-purple-500/20 text-purple-400" :
                        member.role === "admin" ? "bg-blue-500/20 text-blue-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {member.role}
                      </span>
                      <span className="text-gray-500 text-sm">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "activity" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity._id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="flex-1">
                      <div className="text-white">{activity.action.replace(/_/g, " ")}</div>
                      <div className="text-gray-500 text-sm">User: {activity.user_id}</div>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-gray-500 text-center py-8">No recent activity</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}