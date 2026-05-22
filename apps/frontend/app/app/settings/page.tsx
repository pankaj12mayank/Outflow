"use client";

import { useState, useEffect } from "react";
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
import { toast } from "@/app/components/toast";
import { PageError, PageLoading } from "@/app/components/page-state";
import {
  useSettings,
  useUpdateProfile,
  useUpdateOrganizationSettings,
  useUpdateNotificationPrefs,
} from "@/app/hooks/use-settings";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API Keys", icon: Key },
];

const NOTIFICATION_ITEMS = [
  { key: "email_notifications", label: "Email notifications", description: "Receive email updates about your campaigns" },
  { key: "reply_notifications", label: "Reply notifications", description: "Get notified when prospects reply" },
  { key: "weekly_digest", label: "Weekly digest", description: "Receive weekly performance summary" },
  { key: "team_updates", label: "Team updates", description: "Notifications about team activity" },
  { key: "product_updates", label: "Product updates", description: "News about new features and improvements" },
] as const;

export default function SettingsPage() {
  const { user, changePassword } = useAuth();
  const { data: settingsData, isLoading, isError, error, refetch } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateOrganization = useUpdateOrganizationSettings();
  const updateNotifications = useUpdateNotificationPrefs();

  const [activeTab, setActiveTab] = useState("profile");
  const [saveMessage, setSaveMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    timezone: "America/New_York",
    bio: "",
  });
  const [orgForm, setOrgForm] = useState({ name: "", website: "" });
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!settingsData) return;
    const p = settingsData.profile || {};
    const o = settingsData.organization || {};
    setProfileForm({
      full_name: p.full_name || user?.full_name || "",
      email: p.email || user?.email || "",
      phone: p.phone || "",
      timezone: p.timezone || "America/New_York",
      bio: p.bio || "",
    });
    setOrgForm({
      name: o.name || user?.organization?.name || "",
      website: o.website || "",
    });
    setNotificationPrefs(settingsData.notifications || {});
  }, [settingsData, user]);

  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Production Key", key: "sk_live_xxxxxxxxxxxxxxxxxxxx", created: "2026-05-01", purpose: "Live production integration" },
    { id: 2, name: "Development Key", key: "sk_test_xxxxxxxxxxxxxxxxxxxx", created: "2026-04-15", purpose: "Testing and development" },
  ]);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPurpose, setNewKeyPurpose] = useState("");

  const showSaved = (message: string = "Saved successfully!") => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(""), 3000);
    toast.save();
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        timezone: profileForm.timezone,
        bio: profileForm.bio,
      },
      {
        onSuccess: () => showSaved("Profile saved"),
        onError: () => toast.error("Failed to save profile"),
      }
    );
  };

  const handleSaveOrganization = () => {
    updateOrganization.mutate(
      { name: orgForm.name, website: orgForm.website },
      {
        onSuccess: () => showSaved("Organization saved"),
        onError: () => toast.error("Failed to save organization"),
      }
    );
  };

  const handleSaveNotifications = () => {
    updateNotifications.mutate(notificationPrefs, {
      onSuccess: () => showSaved("Notification preferences saved"),
      onError: () => toast.error("Failed to save preferences"),
    });
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Password mismatch", "New passwords don't match");
      return;
    }
    if (passwordForm.new.length < 6) {
      toast.error("Password too short", "Must be at least 6 characters");
      return;
    }
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: "", new: "", confirm: "" });
      showSaved("Password changed successfully!");
    } catch {
      toast.error("Failed to change password");
    }
  };

  const handleToggle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    toast.info("Two-factor authentication", "Contact support to enable 2FA on your account.");
  };

  const isSaving =
    updateProfile.isPending || updateOrganization.isPending || updateNotifications.isPending;

  if (isLoading && !settingsData) {
    return <PageLoading label="Loading settings..." />;
  }

  const handleCreateAPIKey = () => {
    if (!newKeyName) {
      toast.error("Key name required", "Please enter a key name");
      return;
    }
    const newKey = {
      id: Date.now(),
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substring(2, 18)}`,
      created: new Date().toISOString().split("T")[0],
      purpose: newKeyPurpose || "Custom integration"
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    setNewKeyPurpose("");
    setShowCreateKeyModal(false);
    toast.success("API Key created", "Save it securely - won't be shown again");
  };

  const handleRegenerateKey = (id: number) => {
    if (confirm("Are you sure you want to regenerate this key? The old key will stop working.")) {
      setApiKeys(apiKeys.map(k => k.id === id ? { ...k, key: `sk_${Math.random().toString(36).substring(2, 18)}` } : k));
      toast.success("Key regenerated", "Stored locally until API key management ships.");
    }
  };

  const handleDeleteKey = (id: number) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.delete("API key");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.copy();
  };

  return (
    <div className="space-y-6">
      {isError && (
        <PageError
          message={(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Could not load settings."}
          onRetry={() => refetch()}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and organization settings</p>
        </div>
        {saveMessage && (
          <span className="text-green-400 text-sm bg-green-400/10 px-3 py-1 rounded-lg">{saveMessage}</span>
        )}
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
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      readOnly
                      className="bg-white/5 border-white/10 opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+1 555 123 4567"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white"
                    >
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    rows={4}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white resize-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
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
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Website</label>
                    <Input
                      type="url"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
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
                  <Button onClick={handleSaveOrganization} disabled={isSaving} className="gap-2">
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
                {NOTIFICATION_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </div>
                    <label className="relative inline-flex cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!notificationPrefs[item.key]}
                        onChange={(e) =>
                          setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveNotifications} disabled={isSaving} className="gap-2">
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
                    <Input 
                      type="password" 
                      className="bg-white/5 border-white/10"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <Input 
                      type="password" 
                      className="bg-white/5 border-white/10"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                    <Input 
                      type="password" 
                      className="bg-white/5 border-white/10"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="mt-6 gap-2" onClick={handleChangePassword}>
                  <Key className="w-4 h-4" />
                  Update Password
                </Button>
              </div>

              <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Two-Factor Authentication</h2>
                    <p className="text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={twoFactorEnabled}
                      onChange={handleToggle2FA}
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
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
                Use API keys to integrate Outflo with your existing tools and systems. Each key has a specific purpose for better security and tracking.
              </p>
              
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{apiKey.name}</span>
                        <span className="text-xs text-gray-400 ml-2">• {apiKey.purpose}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyKey(apiKey.key)}>Copy</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRegenerateKey(apiKey.id)}>Regenerate</Button>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteKey(apiKey.id)}>Delete</Button>
                      </div>
                    </div>
                    <div className="font-mono text-sm text-gray-400 mb-2">{apiKey.key}</div>
                    <div className="text-xs text-gray-500">Created {apiKey.created}</div>
                  </div>
                ))}
              </div>

              <Button className="mt-6 gap-2" onClick={() => setShowCreateKeyModal(true)}>
                <Key className="w-4 h-4" />
                Create New Key
              </Button>

              {showCreateKeyModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 mt-32">
                  <div className="bg-gray-900 p-6 rounded-xl border border-white/10 w-96">
                    <h3 className="text-lg font-bold mb-4">Create API Key</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-2">Key Name</label>
                        <Input 
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production Key"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Purpose (optional)</label>
                        <Input 
                          value={newKeyPurpose}
                          onChange={(e) => setNewKeyPurpose(e.target.value)}
                          placeholder="e.g., CRM integration"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowCreateKeyModal(false)}>Cancel</Button>
                      <Button onClick={handleCreateAPIKey}>Create</Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}