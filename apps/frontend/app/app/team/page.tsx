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
  Crown,
  UserMinus,
  Settings,
  Copy,
  ChevronDown,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/hooks/useAuth";

const teamMembers = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah@techscale.io",
    role: "owner",
    status: "active",
    avatar: "SC",
    joinedAt: "2026-01-15",
    lastActive: "2026-05-13",
  },
  {
    id: 2,
    name: "Michael Torres",
    email: "michael@techscale.io",
    role: "admin",
    status: "active",
    avatar: "MT",
    joinedAt: "2026-02-01",
    lastActive: "2026-05-13",
  },
  {
    id: 3,
    name: "Emma Williams",
    email: "emma@techscale.io",
    role: "admin",
    status: "active",
    avatar: "EW",
    joinedAt: "2026-02-15",
    lastActive: "2026-05-12",
  },
  {
    id: 4,
    name: "James Miller",
    email: "james@techscale.io",
    role: "member",
    status: "active",
    avatar: "JM",
    joinedAt: "2026-03-01",
    lastActive: "2026-05-11",
  },
  {
    id: 5,
    name: "Lisa Park",
    email: "lisa@techscale.io",
    role: "member",
    status: "pending",
    avatar: "LP",
    joinedAt: "2026-05-10",
    lastActive: null,
  },
];

const roleColors = {
  owner: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  member: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  viewer: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Users,
};

const pendingInvites = [
  { email: "david@techscale.io", role: "member", sentAt: "2026-05-12" },
  { email: "rachel@techscale.io", role: "admin", sentAt: "2026-05-13" },
];

export default function TeamPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team</h1>
          <p className="text-gray-400">
            Manage your team members and their permissions
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowInviteModal(true)}>
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
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
            <div className="text-3xl font-bold">{teamMembers.length}</div>
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
              {teamMembers.filter((m) => m.status === "active").length}
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
            <div className="text-3xl font-bold">{pendingInvites.length}</div>
          </div>
          <div className="text-gray-400 text-sm">Pending Invites</div>
        </motion.div>
      </div>

      {pendingInvites.length > 0 && (
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
            {pendingInvites.map((invite) => (
              <div
                key={invite.email}
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
                  <Button variant="ghost" size="sm" className="gap-1">
                    <RefreshCw className="w-4 h-4" />
                    Resend
                  </Button>
                  <Button variant="ghost" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10"
        />
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
                  {member.role === "owner" && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <div className="text-sm text-gray-400">{member.email}</div>
              </div>
              <Badge className={cn("capitalize", roleColors[member.role as keyof typeof roleColors])}>
                {member.role}
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
                {member.role !== "owner" && user?.role === "owner" && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
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
                    <option value="viewer">Viewer - Can view data</option>
                    <option value="member">Member - Can manage leads and campaigns</option>
                    <option value="admin">Admin - Full access except billing</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button className="gap-2">
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