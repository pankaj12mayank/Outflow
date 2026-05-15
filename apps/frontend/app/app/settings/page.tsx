"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  Bell,
  Shield,
  Key,
  Palette,
  Globe,
  Mail,
  Phone,
  Save,
  Upload,
  Camera,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useAuth } from "@/app/hooks/useAuth";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and organization settings</p>
      </div>

      <div className="flex gap-8">
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h2 className="text-xl font-bold mb-6">Profile Information</h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
                      {user?.full_name?.charAt(0) || "U"}
                    </div>
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center border-4 border-[var(--color-bg-primary)]">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{user?.full_name || "User"}</h3>
                    <p className="text-gray-400">{user?.email || ""}</p>
                    <Button variant="outline" size="sm" className="mt-2 gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <Input
                      defaultValue={user?.full_name || ""}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      defaultValue={user?.email || ""}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      type="tel"
                      placeholder="+1 555 123 4567"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <select className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white">
                      <option>America/New_York (EST)</option>
                      <option>America/Los_Angeles (PST)</option>
                      <option>Europe/London (GMT)</option>
                      <option>Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white resize-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? "Saving..." : "Save Changes"}
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "organization" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h2 className="text-xl font-bold mb-6">Organization Settings</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Organization Name</label>
                    <Input
                      defaultValue={user?.organization?.name || "My Organization"}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Website</label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSave} className="gap-2">
                    Save Changes
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
            >
              <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                {[
                  { label: "Email notifications", description: "Receive email updates about your campaigns" },
                  { label: "Reply notifications", description: "Get notified when prospects reply" },
                  { label: "Weekly digest", description: "Receive weekly performance summary" },
                  { label: "Team updates", description: "Notifications about team activity" },
                  { label: "Product updates", description: "News about new features and improvements" },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </div>
                    <label className="relative inline-flex cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} className="gap-2">
                  Save Preferences
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h2 className="text-xl font-bold mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Password</label>
                    <Input type="password" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <Input type="password" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                    <Input type="password" className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <Button className="mt-6 gap-2">
                  <Key className="w-4 h-4" />
                  Update Password
                </Button>
              </div>

              <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h2 className="text-xl font-bold mb-4">Two-Factor Authentication</h2>
                <p className="text-gray-400 mb-4">Add an extra layer of security to your account</p>
                <Button variant="outline" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Enable 2FA
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === "api" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
            >
              <h2 className="text-xl font-bold mb-6">API Keys</h2>
              <p className="text-gray-400 mb-6">
                Use API keys to integrate Outflo with your existing tools and systems.
              </p>
              
              <div className="space-y-4">
                {[
                  { name: "Production Key", key: "sk_live_xxxxxxxxxxxxxxxxxxxx", created: "2026-05-01" },
                  { name: "Development Key", key: "sk_test_xxxxxxxxxxxxxxxxxxxx", created: "2026-04-15" },
                ].map((apiKey) => (
                  <div key={apiKey.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{apiKey.name}</span>
                      <Button variant="ghost" size="sm">Regenerate</Button>
                    </div>
                    <div className="font-mono text-sm text-gray-400 mb-2">{apiKey.key}</div>
                    <div className="text-xs text-gray-500">Created {apiKey.created}</div>
                  </div>
                ))}
              </div>

              <Button className="mt-6 gap-2">
                <Key className="w-4 h-4" />
                Create New Key
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}