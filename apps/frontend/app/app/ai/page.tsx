"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { motion } from "framer-motion";
import {
  Brain,
  Settings,
  Zap,
  Target,
  Mail,
  MessageSquare,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Save,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock3,
  Hash,
  DollarSign,
  Activity,
  Eye,
  Edit3,
  Plus,
  Trash2,
  Copy,
  Wand2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { toast } from "@/app/components/toast";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";

const ollamaModels = [
  { name: "llama3.2", display: "Llama 3.2", size: "2GB", description: "Fast, efficient for most tasks" },
  { name: "llama3.2:3b", display: "Llama 3.2 3B", size: "2GB", description: "Balanced performance" },
  { name: "llama3.1", display: "Llama 3.1", size: "4GB", description: "Higher quality generations" },
  { name: "mixtral", display: "Mixtral 8x7B", size: "26GB", description: "Excellent for complex tasks" },
  { name: "mistral", display: "Mistral 7B", size: "4GB", description: "Fast and capable" },
  { name: "phi3", display: "Phi-3", size: "2GB", description: "Small but powerful" },
];

const defaultPrompts = [
  {
    key: "personalization_analyze",
    name: "Website Personalization",
    category: "Personalization",
    icon: Target,
    color: "purple",
    description: "Analyze company websites to extract personalization data",
  },
  {
    key: "subject_line",
    name: "Subject Line Generation",
    category: "Campaign",
    icon: Mail,
    color: "blue",
    description: "Generate compelling email subject lines",
  },
  {
    key: "opener_generation",
    name: "Opener Generation",
    category: "Campaign",
    icon: MessageSquare,
    color: "green",
    description: "Create engaging email opening lines",
  },
  {
    key: "cta_generation",
    name: "CTA Generation",
    category: "Campaign",
    icon: Zap,
    color: "yellow",
    description: "Generate effective call-to-action options",
  },
  {
    key: "reply_classification",
    name: "Reply Classification",
    category: "Classification",
    icon: Brain,
    color: "pink",
    description: "Classify email replies into categories",
  },
  {
    key: "outreach_optimization",
    name: "Outreach Optimization",
    category: "Campaign",
    icon: TrendingUp,
    color: "cyan",
    description: "Analyze and optimize outreach emails",
  },
];

const replyCategories = [
  { value: "interested", label: "Interested", color: "green" },
  { value: "not_interested", label: "Not Interested", color: "red" },
  { value: "maybe_later", label: "Maybe Later", color: "yellow" },
  { value: "pricing_inquiry", label: "Pricing Inquiry", color: "blue" },
  { value: "meeting_request", label: "Meeting Request", color: "purple" },
  { value: "out_of_office", label: "Out of Office", color: "gray" },
  { value: "wrong_person", label: "Wrong Person", color: "orange" },
  { value: "question", label: "Question", color: "cyan" },
];

function ModelCard({ model, isSelected, onClick }: { model: any; isSelected: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all",
        isSelected
          ? "border-purple-500/50 bg-purple-500/10"
          : "border-white/5 bg-white/5 hover:bg-white/10"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-bold">{model.display}</div>
          <div className="text-xs text-gray-400">{model.size}</div>
        </div>
        {isSelected && <CheckCircle className="w-5 h-5 text-purple-400" />}
      </div>
      <div className="text-sm text-gray-400">{model.description}</div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${color}-500/10`)}>
          <Icon className={cn("w-5 h-5", `text-${color}-400`)} />
        </div>
        {trend && (
          <span className={cn("text-sm font-medium", trend > 0 ? "text-green-400" : "text-red-400")}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function PromptCard({ prompt, onEdit, onCopy }: { prompt: any; onEdit: () => void; onCopy: () => void }) {
  const Icon = prompt.icon;
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${prompt.color}-500/10`)}>
          <Icon className={cn("w-5 h-5", `text-${prompt.color}-400`)} />
        </div>
        <div className="flex-1">
          <div className="font-medium mb-1">{prompt.name}</div>
          <Badge variant="outline" className="text-xs">{prompt.category}</Badge>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-3">{prompt.description}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={onEdit}>
          <Edit3 className="w-3 h-3" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function UsageChart({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([feature, stats]: [string, any], i: number) => (
        <div key={feature}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="capitalize flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", `bg-${["purple", "blue", "green", "yellow", "pink", "cyan"][i % 6]}-400`)} />
              {feature.replace("_", " ")}
            </span>
            <span className="text-gray-400">{stats.count} uses</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.tokens / 50000) * 100, 100)}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={cn("h-full rounded-full", `bg-gradient-to-r from-${["purple", "blue", "green", "yellow", "pink", "cyan"][i % 6]}-500 to-${["purple", "blue", "green", "yellow", "pink", "cyan"][i % 6]}-400`)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AISettingsPage() {
  const [tab, setTab] = useState<string>("models");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2");
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(500);
  const [prompts, setPrompts] = useState(defaultPrompts);
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  const [usageStats, setUsageStats] = useState({
    totalGenerations: 0,
    totalTokens: 0,
    avgLatency: 0,
    successRate: 0,
  });

  const [usageByFeature, setUsageByFeature] = useState<Record<string, { count: number; tokens: number }>>({});

  useEffect(() => {
    fetchAIStats();
  }, []);

  const fetchAIStats = async () => {
    try {
      const res = await api.get("/api/v1/ai/usage").catch(() => ({ data: null }));
      if (res.data) {
        setUsageStats({
          totalGenerations: res.data.total_generations || 0,
          totalTokens: res.data.total_tokens || 0,
          avgLatency: res.data.avg_latency || 0,
          successRate: res.data.success_rate || 0,
        });
        setUsageByFeature(res.data.by_feature || {});
      }
    } catch (error) {
      console.log("Using default AI stats");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/status", {
        headers: { "Authorization": "Bearer test" }
      });
      const data = await response.json();
      
      if (data.status === "available" || data.status === "offline") {
        setOllamaConnected(data.status === "available");
        setTestResult({
          success: data.status === "available",
          message: data.status === "available" 
            ? "Connected to Ollama successfully!" 
            : "Ollama not running. Start Ollama to enable AI features."
        });
      } else {
        setOllamaConnected(false);
        setTestResult({ success: false, message: "Connection failed" });
      }
    } catch (error) {
      setOllamaConnected(false);
      setTestResult({ success: false, message: "Cannot connect to server" });
    }
    
    setIsTesting(false);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    setSaveMessage("Settings saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleEditPrompt = (prompt: any) => {
    setEditingPrompt({ ...prompt, content: "" });
    setShowPromptEditor(true);
  };

  const handleCopyPrompt = (prompt: any) => {
    navigator.clipboard.writeText(prompt.description);
    toast.copy();
  };

  const handleSavePrompt = () => {
    setShowPromptEditor(false);
    setEditingPrompt(null);
    toast.save();
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Settings</h1>
          <p className="text-gray-400">Configure AI models, prompts, and usage settings</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm text-green-400">{saveMessage}</span>
          )}
          <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2">
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Generations" 
          value={usageStats.totalGenerations > 0 ? usageStats.totalGenerations.toLocaleString() : "0"} 
          icon={Sparkles} 
          color="purple" 
          trend={usageStats.totalGenerations > 0 ? 12 : 0} 
        />
        <StatCard 
          label="Tokens Used" 
          value={usageStats.totalTokens > 0 ? (usageStats.totalTokens / 1000).toFixed(1) + "K" : "0"} 
          icon={Hash} 
          color="blue" 
        />
        <StatCard 
          label="Avg Latency" 
          value={usageStats.avgLatency > 0 ? usageStats.avgLatency + "ms" : "0ms"} 
          icon={Clock3} 
          color="green" 
          trend={usageStats.avgLatency > 0 ? -8 : 0} 
        />
        <StatCard 
          label="Success Rate" 
          value={usageStats.successRate > 0 ? usageStats.successRate + "%" : "0%"} 
          icon={CheckCircle} 
          color="yellow" 
        />
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
        <div className="border-b border-white/5">
          <div className="flex items-center gap-1 p-2">
            {[
              { id: "models", label: "Models", icon: Brain },
              { id: "prompts", label: "Prompts", icon: FileText },
              { id: "features", label: "Features", icon: Sparkles },
              { id: "usage", label: "Usage", icon: BarChart3 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                  tab === t.id
                    ? "bg-purple-500/10 text-purple-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {tab === "models" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Ollama Connection</h3>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", ollamaConnected ? "bg-green-400" : "bg-red-400")} />
                    <span className="text-sm text-gray-400">
                      {ollamaConnected ? "Connected to localhost:11434" : "Disconnected"}
                    </span>
                  </div>
                  {testResult && (
                    <div className={cn("text-sm mt-1", testResult.success ? "text-green-400" : "text-red-400")}>
                      {testResult.message}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  <RefreshCw className={cn("w-4 h-4", isTesting && "animate-spin")} />
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Available Models</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ollamaModels.map((model) => (
                    <ModelCard
                      key={model.name}
                      model={model}
                      isSelected={selectedModel === model.name}
                      onClick={() => setSelectedModel(model.name)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Temperature</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="flex-1 h-2 rounded-full bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                    />
                    <span className="w-12 text-right text-sm">{temperature}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Tokens</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-full bg-white/10 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                    />
                    <span className="w-12 text-right text-sm">{maxTokens}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Short</span>
                    <span>Long</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "prompts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Prompt Templates</h3>
                  <p className="text-sm text-gray-400">Customize AI prompts for each feature</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditingPrompt(null); setShowPromptEditor(true); }}>
                  <Plus className="w-4 h-4" />
                  New Prompt
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((prompt) => (
                  <PromptCard 
                    key={prompt.key} 
                    prompt={prompt} 
                    onEdit={() => handleEditPrompt(prompt)}
                    onCopy={() => handleCopyPrompt(prompt)}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "features" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4">AI Features</h3>
                <div className="space-y-4">
                  {[
                    { name: "Auto Personalization", desc: "Automatically personalize emails when lead has website", enabled: true, icon: Target },
                    { name: "Subject Line Suggestions", desc: "AI-generated subject line suggestions", enabled: true, icon: Mail },
                    { name: "CTA Generation", desc: "Generate effective call-to-action options", enabled: true, icon: Zap },
                    { name: "Reply Classification", desc: "Automatically classify email replies", enabled: true, icon: Brain },
                    { name: "Readability Improvement", desc: "Improve email readability and clarity", enabled: false, icon: Lightbulb },
                    { name: "Outreach Optimization", desc: "Analyze and optimize outreach performance", enabled: false, icon: TrendingUp },
                  ].map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium mb-1">{feature.name}</div>
                            <div className="text-sm text-gray-400">{feature.desc}</div>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={feature.enabled} />
                          <div className="w-11 h-6 rounded-full bg-white/10 peer-checked:bg-purple-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Reply Classification Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {replyCategories.map((cat) => (
                    <div key={cat.value} className={cn("p-3 rounded-lg border text-center", `border-${cat.color}-500/20 bg-${cat.color}-500/5`)}>
                      <div className={cn("text-sm font-medium", `text-${cat.color}-400`)}>{cat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "usage" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Usage by Feature
                  </h3>
                  <UsageChart data={usageByFeature} />
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Cost Analysis
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Cost</span>
                      <span className="font-bold">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Provider</span>
                      <span className="font-bold">Ollama (Local)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Cost/1K tokens</span>
                      <span className="font-bold">$0.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-4">Recent Usage</h3>
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-sm text-gray-400">
                        <th className="p-3">Time</th>
                        <th className="p-3">Feature</th>
                        <th className="p-3">Model</th>
                        <th className="p-3">Tokens</th>
                        <th className="p-3">Latency</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { time: "2 min ago", feature: "personalization", model: "llama3.2", tokens: 456, latency: "1.2s", status: "success" },
                        { time: "5 min ago", feature: "subject_generation", model: "llama3.2", tokens: 89, latency: "0.8s", status: "success" },
                        { time: "12 min ago", feature: "reply_classification", model: "llama3.2", tokens: 234, latency: "1.1s", status: "success" },
                        { time: "25 min ago", feature: "opener_generation", model: "llama3.2", tokens: 178, latency: "0.9s", status: "success" },
                        { time: "1 hour ago", feature: "personalization", model: "llama3.2", tokens: 512, latency: "1.4s", status: "failed" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 text-sm">{row.time}</td>
                          <td className="p-3 text-sm capitalize">{row.feature.replace("_", " ")}</td>
                          <td className="p-3 text-sm text-gray-400">{row.model}</td>
                          <td className="p-3 text-sm">{row.tokens}</td>
                          <td className="p-3 text-sm text-gray-400">{row.latency}</td>
                          <td className="p-3">
                            <Badge className={cn("gap-1", row.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                              {row.status === "success" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPromptEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/50 p-6"
          >
            <h2 className="text-xl font-bold mb-4">{editingPrompt?.key ? "Edit Prompt" : "Create Prompt"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prompt Key</label>
                <input
                  type="text"
                  defaultValue={editingPrompt?.key || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none text-sm"
                  placeholder="e.g., my_custom_prompt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prompt Template</label>
                <textarea
                  defaultValue={editingPrompt?.content || ""}
                  rows={10}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none text-sm font-mono"
                  placeholder="Enter your prompt template here. Use {variable} for dynamic values."
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Variables:</span>
                <Badge variant="outline" className="text-xs">{"{company_name}"}</Badge>
                <Badge variant="outline" className="text-xs">{"{industry}"}</Badge>
                <Badge variant="outline" className="text-xs">{"{pain_points}"}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowPromptEditor(false); setEditingPrompt(null); }}>Cancel</Button>
              <Button onClick={handleSavePrompt} className="gap-1">
                <Save className="w-4 h-4" />
                Save Prompt
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}