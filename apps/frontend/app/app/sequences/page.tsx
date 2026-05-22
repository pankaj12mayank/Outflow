"use client";

import { useState, useMemo } from "react";
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
import { toast } from "@/app/components/toast";
import { Can } from "@/app/components/Can";
import { PageError, PageLoading } from "@/app/components/page-state";
import {
  useSequences,
  useCreateSequence,
  useUpdateSequence,
  useDeleteSequence,
  useDuplicateSequence,
} from "@/app/hooks/use-sequences";

interface SequenceStep {
  id: string;
  type: "email" | "delay" | "condition";
  title: string;
  description: string;
  config?: Record<string, unknown>;
}

interface Sequence {
  id: string;
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

function mapApiSequence(row: Record<string, unknown>): Sequence {
  const status =
    (row.status as Sequence["status"]) ||
    (row.is_active ? "active" : "paused");
  return {
    id: String(row.id),
    name: String(row.name || "Untitled"),
    description: String(row.description || ""),
    steps: (row.steps as SequenceStep[]) || [],
    active: Number(row.active_enrolled ?? row.total_enrolled ?? 0),
    completed: Number(row.completed ?? 0),
    avgResponseRate: Number(row.avg_response_rate ?? 0),
    avgTimeToResponse: String(row.avg_time_to_response || "-"),
    status,
    lastUsed: row.updated_at
      ? String(row.updated_at).slice(0, 10)
      : "Never",
    channels: (row.channels as string[]) || ["email"],
  };
}

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
  const { data, isLoading, isError, error, refetch } = useSequences();
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();
  const deleteSequence = useDeleteSequence();
  const duplicateSequence = useDuplicateSequence();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStepModal, setShowStepModal] = useState(false);
  const [showNewSequenceModal, setShowNewSequenceModal] = useState(false);
  const [selectedStepType, setSelectedStepType] = useState<string>("email");
  const [newSequenceName, setNewSequenceName] = useState("");
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepConfig, setStepConfig] = useState<Record<string, unknown>>({});

  const sequenceList = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => mapApiSequence(row as Record<string, unknown>));
  }, [data]);

  if (isLoading && sequenceList.length === 0) {
    return <PageLoading label="Loading sequences..." />;
  }

  const filteredSequences = sequenceList.filter((seq) => {
    const matchesSearch = 
      seq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seq.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || seq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSequenceStatus = (seq: Sequence) => {
    const nextStatus = seq.status === "active" ? "paused" : "active";
    updateSequence.mutate(
      { id: seq.id, status: nextStatus, is_active: nextStatus === "active" },
      {
        onError: () => toast.error("Failed to update sequence status"),
      }
    );
  };

  const handleDeleteSequence = (id: string) => {
    if (!confirm("Are you sure you want to delete this sequence?")) return;
    deleteSequence.mutate(id, {
      onSuccess: () => toast.delete("Sequence"),
      onError: () => toast.error("Failed to delete sequence"),
    });
  };

  const handleDuplicateSequence = (seq: Sequence) => {
    duplicateSequence.mutate(seq.id, {
      onSuccess: () => toast.duplicate(seq.name),
      onError: () => toast.error("Failed to duplicate sequence"),
    });
  };

  const handleCreateSequence = () => {
    if (!newSequenceName.trim()) {
      toast.required("sequence name");
      return;
    }
    createSequence.mutate(
      {
        name: newSequenceName.trim(),
        description: "New sequence",
        steps: defaultSteps,
        status: "draft",
        is_active: false,
        channels: ["email"],
      },
      {
        onSuccess: () => {
          setNewSequenceName("");
          setShowNewSequenceModal(false);
          toast.success("Sequence created");
        },
        onError: () => toast.error("Failed to create sequence"),
      }
    );
  };

  const openStepModal = (sequenceId: string) => {
    setEditingSequenceId(sequenceId);
    setSelectedStepType("email");
    setStepTitle("");
    setStepDescription("");
    setStepConfig({});
    setShowStepModal(true);
  };

  const handleAddStep = () => {
    if (!editingSequenceId || !stepTitle.trim()) {
      toast.required("step name");
      return;
    }
    const seq = sequenceList.find((s) => s.id === editingSequenceId);
    if (!seq) return;
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      type: selectedStepType as SequenceStep["type"],
      title: stepTitle.trim(),
      description: stepDescription.trim() || stepTitle.trim(),
      config: stepConfig,
    };
    updateSequence.mutate(
      { id: editingSequenceId, steps: [...seq.steps, newStep] },
      {
        onSuccess: () => {
          setShowStepModal(false);
          setEditingSequenceId(null);
          toast.success("Step saved");
        },
        onError: () => toast.error("Failed to save step"),
      }
    );
  };

  const avgResponseRate =
    sequenceList.length > 0
      ? (
          sequenceList.reduce((sum, s) => sum + s.avgResponseRate, 0) / sequenceList.length
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {isError && (
        <PageError
          message={(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Could not load sequences."}
          onRetry={() => refetch()}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Email Sequences</h1>
          <p className="text-gray-400">
            Create multi-step outreach sequences for your campaigns
          </p>
        </div>
        <Can permission="sequences:create">
          <Button className="gap-2" onClick={() => setShowNewSequenceModal(true)}>
            <Plus className="w-4 h-4" />
            New Sequence
          </Button>
        </Can>
      </div>

      {/* New Sequence Modal */}
      {showNewSequenceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl border border-white/10 w-96">
            <h3 className="text-lg font-bold mb-4">Create New Sequence</h3>
            <Input
              value={newSequenceName}
              onChange={(e) => setNewSequenceName(e.target.value)}
              placeholder="Sequence name"
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewSequenceModal(false)}>Cancel</Button>
              <Button onClick={handleCreateSequence}>Create</Button>
            </div>
          </div>
        </div>
      )}

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
            <div className="text-3xl font-bold">{avgResponseRate}%</div>
          </div>
          <div className="text-gray-400 text-sm">Avg Response Rate</div>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search sequences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "active", "paused", "draft"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                statusFilter === status
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {status}
            </button>
          ))}
        </div>
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
                    <Can permission="sequences:update">
                      <Button
                        size="sm"
                        variant={sequence.status === "active" ? "outline" : "default"}
                        className="gap-2"
                        onClick={() => toggleSequenceStatus(sequence)}
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
                    </Can>
                    <Can permission="sequences:create">
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicateSequence(sequence)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </Can>
                    <Can permission="sequences:delete">
                      <Button variant="ghost" size="icon" className="text-red-400" onClick={() => handleDeleteSequence(sequence.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Can>
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
                    <Can permission="sequences:update">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-gray-400 hover:text-white"
                        onClick={() => openStepModal(sequence.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </Can>
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
          <Can permission="sequences:create">
            <Button className="gap-2" onClick={() => setShowNewSequenceModal(true)}>
              <Plus className="w-4 h-4" />
              Create Sequence
            </Button>
          </Can>
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
                    value={stepTitle}
                    onChange={(e) => setStepTitle(e.target.value)}
                    placeholder="e.g., Follow-up Email"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <Input
                    value={stepDescription}
                    onChange={(e) => setStepDescription(e.target.value)}
                    placeholder="Brief description"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                {selectedStepType === "email" && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Subject Line</label>
                      <Input
                        value={String(stepConfig.subject || "")}
                        onChange={(e) => setStepConfig({ ...stepConfig, subject: e.target.value })}
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
                      value={String(stepConfig.days ?? "")}
                      onChange={(e) => setStepConfig({ ...stepConfig, days: Number(e.target.value) || 0 })}
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
                <Button className="gap-2" onClick={handleAddStep} disabled={updateSequence.isPending}>
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