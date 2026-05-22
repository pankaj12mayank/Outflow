"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Building2, RefreshCw, UserCheck, UserX, Plus } from "lucide-react";
import { SYSTEM_OWNER_EMAIL } from "@/app/lib/auth-constants";
import { getAuthHeaders } from "@/app/lib/auth";

type Org = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  plan?: string;
  is_active?: boolean;
  member_count?: number;
  created_at?: string;
  admin?: { email?: string; full_name?: string; is_active?: boolean; role?: string } | null;
  subscription?: {
    plan?: string;
    plan_name?: string;
    status?: string;
    current_period_end?: string;
  };
  members?: Array<{ email: string; full_name?: string; role?: string; is_active?: boolean }>;
};

const SYSTEM_OWNER_EMAIL_LOWER = SYSTEM_OWNER_EMAIL.toLowerCase();


function isSystemOwnerEmail(email?: string): boolean {
  return email?.toLowerCase().trim() === SYSTEM_OWNER_EMAIL_LOWER;
}

export default function SystemOwnerOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/organizations", {
        headers: getAuthHeaders(),
        params: { page: 1, page_size: 100 },
      });

      let orgs: Org[] = res.data?.organizations || [];

      // Filter out system owner from members
      orgs = orgs.map((org: Org) => {
        const filteredMembers = (org.members || []).filter(
          (m) => !isSystemOwnerEmail(m.email)
        );
        const regularAdmins = filteredMembers.filter(
          (m) => m.role === "organization_admin"
        );
        return {
          ...org,
          members: filteredMembers,
          member_count: filteredMembers.length,
          admin: regularAdmins.length > 0 ? regularAdmins[0] : null,
        };
      });

      setOrganizations(orgs);
    } catch (err: any) {
      console.error("Organizations load error:", err);
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      description="Manage registered organizations on the platform"
      actions={
        <button
          onClick={load}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <span className="text-red-400">{error}</span>
          <button onClick={load} className="text-sm text-red-400 hover:underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Empty State */}
      {!loading && organizations.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Organizations will appear here when users register on the platform.
          </p>
        </div>
      )}

      {/* Organizations List */}
      {!loading && organizations.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{org.name}</div>
                    {org.slug && <div className="text-xs text-gray-500">{org.slug}</div>}
                  </td>
                  <td className="px-4 py-4">
                    {org.admin ? (
                      <div>
                        <div className="text-gray-300">{org.admin.full_name || org.admin.email}</div>
                        <div className="text-xs text-gray-500">{org.admin.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No admin</span>
                    )}
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(org)}</td>
                  <td className="px-4 py-4">
                    <span className="text-gray-300">
                      {org.subscription?.plan_name || org.plan || "Free"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-300">{org.member_count ?? 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && organizations.length > 0 && (
        <div className="mt-6 text-sm text-gray-500">
          Showing {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
        </div>
      )}
    </SoPageLayout>
  );
}
