"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Clock,
  Users,
  Play,
  Pause,
  Copy,
  Trash2,
  ArrowRight,
  Zap,
  Calendar,
  MessageSquare,
  GitBranch,
  X,
  ChevronDown,
  GripVertical,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

interface SequenceStep {
  id: string;
  type: "email" | "delay" | "condition";
  title: string;
  description: string;
  config?: Record<string, unknown>;
}

interface Sequence {
  id: number;
  name: string;
  description: string;
  steps: SequenceStep[];
  active: number;
  completed: number;
  avgResponseRate: number;
  avgTimeToResponse: string;
  status: "active" | "paused" | "draft";
  lastUsed: string;
  channels: string[];
}

const defaultSteps: SequenceStep[] = [
  {
    id: "step-1",
    type: "email",
    title: "Initial Outreach",
    description: "Send personalized introduction email",
    config: { subject: "Quick question about {{company}}" },
  },
  {
    id: "step-2",
    type: "delay",
    title: "Wait 2 Days",
    description: "Delay before follow-up",
    config: { days: 2 },
  },
  {
    id: "step-3",
    type: "email",
    title: "Follow-up Email",
    description: "Gentle reminder about previous email",
    config: { subject: "Following up on my last email" },
  },
  {
    id: "step-4",
    type: "condition",
    title: "If No Reply",
    description: "Check if lead has replied",
    config: { condition: "no_reply" },
  },
  {
    id: "step-5",
    type: "delay",
    title: "Wait 3 Days",
    description: "Additional wait time",
    config: { days: 3 },
  },
  {
    id: "step-6",
    type: "email",
    title: "Final Follow-up",
    description: "Last attempt with additional value",
    config: { subject: "One more thing..." },
  },
];

const sequences: Sequence[] = [
  {
    id: 1,
    name: "Initial Outreach",
    description: "First contact sequence with discovery questions",
    steps: defaultSteps,
    active: 1247,
    completed: 3420,
    avgResponseRate: 34.2,
    avgTimeToResponse: "2.4 days",
    status: "active",
    lastUsed: "2026-05-13",
    channels: ["email"],
  },
  {
    id: 2,
    name: "Demo Follow-up",
    description: "Post-demo nurturing sequence",
    steps: [
      { id: "s1", type: "email", title: "Thank You Email", description: "Thank them for their time" },
      { id: "s2", type: "delay", title: "Wait 1 Day", description: "Delay before resources" },
      { id: "s3", type: "email", title: "Send Resources", description: "Share relevant case studies" },
    ],
    active: 423,
    completed: 1876,
    avgResponseRate: 52.8,
    avgTimeToResponse: "1.8 days",
    status: "active",
    lastUsed: "2026-05-12",
    channels: ["email", "linkedin"],
  },
  {
    id: 3,
    name: "Re-engagement",
    description: "Win back unresponsive leads",
    steps: [
      { id: "s1", type: "email", title: "Check-in", description: "Simple check-in email" },
      { id: "s2", type: "delay", title: "Wait 4 Days", description: "Wait for response" },
      { id: "s3", type: "condition", title: "If No Reply", description: "Check reply status" },
    ],
    active: 892,
    completed: 1245,
    avgResponseRate: 18.5,
    avgTimeToResponse: "4.2 days",
    status: "active",
    lastUsed: "2026-05-11",
    channels: ["email"],
  },
  {
    id: 4,
    name: "Cold to Warm",
    description: "Convert cold leads to warm prospects",
    steps: [
      { id: "s1", type: "email", title: "Cold Outreach", description: "Initial cold email" },
    ],
    active: 234,
    completed: 567,
    avgResponseRate: 28.9,
    avgTimeToResponse: "3.1 days",
    status: "draft",
    lastUsed: "2026-05-10",
    channels: ["email", "linkedin", "sms"],
  },
  {
    id: 5,
    name: "Champion Building",
    description: "Help champions within accounts",
    steps: [
      { id: "s1", type: "email", title: "Value Add", description: "Share relevant content" },
      { id: "s2", type: "delay", title: "Wait 1 Week", description: "Weekly check-in" },
    ],
    active: 156,
    completed: 423,
    avgResponseRate: 67.4,
    avgTimeToResponse: "1.2 days",
    status: "active",
    lastUsed: "2026-05-13",
    channels: ["email", "linkedin"],
  },
];

const statusColors = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const stepTypeIcons = {
  email: Mail,
  delay: Clock,
  condition: GitBranch,
};

const stepTypeColors = {
  email: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  delay: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  condition: "bg-green-500/10 border-green-500/20 text-green-400",
};

export default function SequencesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showStepModal, setShowStepModal] = useState(false);
  const [selectedStepType, setSelectedStepType] = useState<string>("email");
  const [sequenceList, setSequenceList] = useState(sequences);

  const filteredSequences = sequenceList.filter((seq) =>
    seq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seq.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSequenceStatus = (id: number) => {
    setSequenceList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, status: s.status === "active" ? "paused" as const : "active" as const };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Email Sequences</h1>
          <p className="text-gray-400">
            Create multi-step outreach sequences for your campaigns
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Sequence
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold">{sequenceList.length}</div>
          </div>
          <div className="text-gray-400 text-sm">Total Sequences</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-3xl font-bold">
              {sequenceList.reduce((sum, s) => sum + s.active, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-gray-400 text-sm">Active Contacts</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold">
              {sequenceList.reduce((sum, s) => sum + s.completed, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-gray-400 text-sm">Completed Steps</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold">38.4%</div>
          </div>
          <div className="text-gray-400 text-sm">Avg Response Rate</div>
        </motion.div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search sequences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filteredSequences.map((sequence, i) => (
          <motion.div
            key={sequence.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-white/10 transition-all"
          >
            <div className="flex items-start gap-6">
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  sequence.status === "active"
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-gray-500/10 border border-gray-500/20"
                )}
              >
                <Zap
                  className={cn(
                    "w-6 h-6",
                    sequence.status === "active" ? "text-green-400" : "text-gray-400"
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{sequence.name}</h3>
                      <Badge
                        className={cn(
                          "capitalize",
                          statusColors[sequence.status as keyof typeof statusColors]
                        )}
                      >
                        {sequence.status}
                      </Badge>
                    </div>
                    <p className="text-gray-400">{sequence.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={sequence.status === "active" ? "outline" : "default"}
                      className="gap-2"
                      onClick={() => toggleSequenceStatus(sequence.id)}
                    >
                      {sequence.status === "active" ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-8 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{sequence.steps.length} steps</span>
                    <div className="flex items-center -space-x-1">
                      {sequence.channels.map((channel) => (
                        <div
                          key={channel}
                          className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs"
                          title={channel}
                        >
                          {channel === "email" && <Mail className="w-3 h-3" />}
                          {channel === "linkedin" && <MessageSquare className="w-3 h-3" />}
                          {channel === "sms" && <MessageSquare className="w-3 h-3" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">Active: </span>
                      <span className="font-semibold">{sequence.active.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Completed: </span>
                      <span className="font-semibold">{sequence.completed.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Response: </span>
                      <span className="font-semibold text-green-400">{sequence.avgResponseRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Time: </span>
                      <span className="font-semibold">{sequence.avgTimeToResponse}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {sequence.steps.map((step, stepIndex) => {
                        const Icon = stepTypeIcons[step.type];
                        return (
                          <div key={step.id} className="flex items-center">
                            {stepIndex > 0 && (
                              <div className="w-8 h-px bg-white/10" />
                            )}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className={cn(
                                "w-12 h-12 rounded-lg border flex items-center justify-center cursor-pointer",
                                stepTypeColors[step.type]
                              )}
                              title={step.title}
                            >
                              <Icon className="w-5 h-5" />
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-gray-400 hover:text-white"
                      onClick={() => setShowStepModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <span>Last used: {sequence.lastUsed}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSequences.length === 0 && (
        <div className="text-center py-16">
          <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No sequences found</h3>
          <p className="text-gray-400 mb-6">Create your first email sequence to get started</p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Sequence
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showStepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowStepModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Add Step</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowStepModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {(["email", "delay", "condition"] as const).map((type) => {
                  const Icon = stepTypeIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedStepType(type)}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all",
                        selectedStepType === type
                          ? stepTypeColors[type]
                          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Step Name</label>
                  <Input
                    placeholder="e.g., Follow-up Email"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <Input
                    placeholder="Brief description"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                {selectedStepType === "email" && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Subject Line</label>
                      <Input
                        placeholder="e.g., Quick question about {{company}}"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </>
                )}
                {selectedStepType === "delay" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Delay (days)</label>
                    <Input
                      type="number"
                      placeholder="2"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                )}
                {selectedStepType === "condition" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Condition</label>
                    <select className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white">
                      <option>If no reply</option>
                      <option>If opened email</option>
                      <option>If clicked link</option>
                      <option>If replied</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowStepModal(false)}>
                  Cancel
                </Button>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}