"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  UserMinus,
  Settings,
  Copy,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Crown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/hooks/useAuth";
import { toast } from "@/app/components/toast";
import { Can } from "@/app/components/Can";
import { PageError, PageLoading } from "@/app/components/page-state";
import {
  useTeamMembers,
  useTeamInvitations,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useCancelInvitation,
  useResendInvitation,
} from "@/app/hooks/use-team";

type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string;
  joinedAt: string;
  lastActive: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  sentAt: string;
};

function normalizeTeamRole(role?: string): string {
  if (role === "member" || role === "admin") {
    return role === "member" ? "team_member" : "organization_admin";
  }
  return role || "team_member";
}

function mapMember(row: Record<string, unknown>): TeamMemberRow {
  const email = String(row.email || "");
  const name = String(row.full_name || email.split("@")[0] || "Unknown");
  const parts = name.split(" ").filter(Boolean);
  const avatar = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
  return {
    id: String(row.id),
    name,
    email,
    role: normalizeTeamRole(String(row.role || "")),
    status: row.is_active === false ? "inactive" : "active",
    avatar,
    joinedAt: String(row.created_at || "").slice(0, 10),
    lastActive: row.updated_at ? String(row.updated_at).slice(0, 10) : null,
  };
}

function mapInvite(row: Record<string, unknown>): InviteRow {
  return {
    id: String(row.id),
    email: String(row.email || ""),
    role: normalizeTeamRole(String(row.role || "")),
    sentAt: String(row.created_at || "").slice(0, 10),
  };
}

const roleLabels: Record<string, string> = {
  organization_admin: "Organization Admin",
  team_member: "Team Member",
};

const roleColors: Record<string, string> = {
  organization_admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  team_member: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const roleIcons: Record<string, any> = {
  organization_admin: Shield,
  team_member: Users,
};

export default function TeamPage() {
  const { user } = useAuth();
  const { data: membersData, isLoading, isError, error, refetch } = useTeamMembers();
  const { data: invitesData, refetch: refetchInvites } = useTeamInvitations();
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  const members: TeamMemberRow[] = (Array.isArray(membersData) ? membersData : []).map((row) =>
    mapMember(row as Record<string, unknown>)
  );
  const pendingInvitesList: InviteRow[] = (Array.isArray(invitesData) ? invitesData : []).map((row) =>
    mapInvite(row as Record<string, unknown>)
  );

  if (isLoading && members.length === 0) {
    return <PageLoading label="Loading team..." />;
  }

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleInvite = () => {
    if (!inviteEmail.includes("@")) {
      toast.error("Invalid email", "Please enter a valid email address");
      return;
    }
    inviteMember.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail("");
          setInviteRole("team_member");
          setShowInviteModal(false);
          toast.invite(inviteEmail);
          refetchInvites();
        },
        onError: (err: unknown) => {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          toast.error("Invite failed", detail || "Could not send invitation");
        },
      }
    );
  };

  const handleResendInvite = (inviteId: string, email: string) => {
    resendInvitation.mutate(inviteId, {
      onSuccess: () => toast.invite(email),
      onError: () => toast.error("Resend failed"),
    });
  };

  const handleDeleteInvite = (inviteId: string, email: string) => {
    cancelInvitation.mutate(inviteId, {
      onSuccess: () => toast.success("Invitation removed", email),
      onError: () => toast.error("Could not cancel invitation"),
    });
  };

  const handleRemoveMember = (id: string) => {
    const member = members.find((m) => m.id === id);
    removeMember.mutate(id, {
      onSuccess: () => {
        setShowRemoveConfirm(null);
        setActiveMenu(null);
        if (member) toast.delete(member.name);
        refetch();
      },
      onError: () => toast.error("Failed to remove member"),
    });
  };

  const handleUpdateRole = (id: string, newRole: string) => {
    updateMemberRole.mutate(
      { id, role: newRole },
      {
        onSuccess: () => {
          setActiveMenu(null);
          toast.update(`Role changed to ${roleLabels[newRole as keyof typeof roleLabels] || newRole}`);
        },
        onError: () => toast.error("Failed to update role"),
      }
    );
  };

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      {isError && (
        <PageError
          message={(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Could not load team."}
          onRetry={() => refetch()}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team</h1>
          <p className="text-gray-400">
            Manage your team members and their permissions
          </p>
        </div>
        <Can permission="teams:create">
          <Button className="gap-2" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4" />
            Invite Member
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold">{members.length}</div>
          </div>
          <div className="text-gray-400 text-sm">Total Members</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-3xl font-bold">
              {activeCount}
            </div>
          </div>
          <div className="text-gray-400 text-sm">Active Members</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold">{pendingInvitesList.length}</div>
          </div>
          <div className="text-gray-400 text-sm">Pending Invites</div>
        </motion.div>
      </div>

      {pendingInvitesList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-yellow-400" />
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitesList.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center font-bold text-sm">
                    {invite.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-xs text-gray-400">Invited {invite.sentAt}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn("capitalize", roleColors[invite.role as keyof typeof roleColors])}>
                    {invite.role}
                  </Badge>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleResendInvite(invite.id, invite.email)}>
                    <RefreshCw className="w-4 h-4" />
                    Resend
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteInvite(invite.id, invite.email)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "organization_admin", "team_member"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                roleFilter === role
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-bold">Team Members</h2>
        </div>
        <div className="divide-y divide-white/5">
          {filteredMembers.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center font-bold">
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  {member.role === "organization_admin" && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <div className="text-sm text-gray-400">{member.email}</div>
              </div>
              <Badge className={cn("capitalize", roleColors[member.role as keyof typeof roleColors])}>
                {member.role === "organization_admin" ? "Admin" : "Member"}
              </Badge>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {member.status === "active" ? "Active" : "Pending"}
                </div>
                <div className="text-xs text-gray-500">
                  {member.lastActive
                    ? `Last active ${member.lastActive}`
                    : `Invited ${member.joinedAt}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {member.role !== "organization_admin" && user?.role === "organization_admin" && (
                  <>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      {activeMenu === member.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-36 p-1 rounded-lg bg-gray-900 border border-white/10 shadow-xl">
                          <button onClick={() => handleUpdateRole(member.id, "organization_admin")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white">Make Admin</button>
                          <button onClick={() => handleUpdateRole(member.id, "team_member")} className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white">Make Member</button>
                          <button onClick={() => { setShowRemoveConfirm(member.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10">Remove</button>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400" onClick={() => setShowRemoveConfirm(member.id)}>
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              {showRemoveConfirm === member.id && (
                <div className="absolute right-4 top-full mt-1 z-50 w-56 p-4 rounded-lg bg-gray-900 border border-red-500/20 shadow-xl">
                  <p className="text-sm text-white mb-3">Remove {member.name} from team?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handleRemoveMember(member.id)}>Remove</Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] backdrop-blur-xl"
          >
            <h2 className="text-xl font-bold mb-6">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full appearance-none px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white"
                  >
                    <option value="team_member">Member - Can manage leads and campaigns</option>
                    <option value="organization_admin">Admin - Full access except billing</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button className="gap-2" onClick={handleInvite} disabled={inviteMember.isPending}>
                <Mail className="w-4 h-4" />
                Send Invite
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}