"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Building2, RefreshCw, ChevronRight, Shield, UserCheck, UserX } from "lucide-react";
import { SYSTEM_OWNER_EMAIL } from "@/app/lib/auth-constants";

type Org = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  plan?: string;
  is_active?: boolean;
  member_count?: number;
  created_at?: string;
  admin?: { email?: string; full_name?: string; is_active?: boolean; role?: string };
  subscription?: {
    plan?: string;
    plan_name?: string;
    status?: string;
    current_period_end?: string;
  };
  members?: Array<{ email: string; full_name?: string; role?: string; is_active?: boolean }>;
};

const SYSTEM_OWNER_EMAIL_LOWER = SYSTEM_OWNER_EMAIL.toLowerCase();

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

function isSystemOwnerEmail(email: string): boolean {
  return email?.toLowerCase().trim() === SYSTEM_OWNER_EMAIL_LOWER;
}

export default function SystemOwnerOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/organizations", {
        headers: authHeaders(),
        params: { page: 1, page_size: 50 },
      });
      
      let organizations = res.data.organizations || [];
      
      organizations = organizations.map((org: Org) => {
        const filteredMembers = (org.members || []).filter(
          (m) => !isSystemOwnerEmail(m.email || "")
        );
        
        const regularAdmins = filteredMembers.filter((m) => m.role === "admin" || m.role === "owner");
        
        return {
          ...org,
          members: filteredMembers,
          member_count: filteredMembers.length,
          admin: regularAdmins.length > 0 ? regularAdmins[0] : null,
        };
      });

      if (filter === "active") {
        organizations = organizations.filter((o: Org) => o.is_active !== false);
      } else if (filter === "suspended") {
        organizations = organizations.filter((o: Org) => o.is_active === false);
      }

      setOrgs(organizations);
      setTotal(res.data.total ?? 0);
    } catch {
      toast.error("Could not load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const getStatusBadge = (org: Org) => {
    if (org.is_active === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs">
          <UserX className="w-3 h-3" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-xs">
        <UserCheck className="w-3 h-3" />
        Active
      </span>
    );
  };

  return (
    <SoPageLayout
      title="Organizations"
      description={`${total} registered company${total !== 1 ? "ies" : ""}. System owner hidden for privacy.`}
      actions={
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
            style={{backgroundColor: 'rgba(255,255,255,0.05)'}}
          >
            <option value="all" style={{backgroundColor: '#0a0a0f'}}>All</option>
            <option value="active" style={{backgroundColor: '#0a0a0f'}}>Active</option>
            <option value="suspended" style={{backgroundColor: '#0a0a0f'}}>Suspended</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No organizations found{filter !== "all" ? ` (${filter})` : ""}.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-white/5 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{org.name}</div>
                    {org.slug && <div className="text-xs text-gray-500">{org.slug}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {org.admin ? (
                      <div>
                        <div className="text-gray-300">{org.admin.full_name || org.admin.email}</div>
                        <div className="text-xs text-gray-500">{org.admin.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(org)}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">
                      {org.subscription?.plan_name || org.plan || "Free"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {org.subscription?.current_period_end
                      ? new Date(org.subscription.current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{org.member_count ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/system-owner/organizations/${org.id}`}
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      Details <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SoPageLayout>
  );
}
