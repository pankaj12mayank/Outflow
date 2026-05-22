"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Building2, RefreshCw, UserCheck, UserX, Trash2, X, ExternalLink } from "lucide-react";
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
  const [selected, setSelected] = useState<Org | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/organizations", {
        params: { page: 1, page_size: 100 },
      });

      const raw = res.data?.organizations ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      let orgs: Org[] = raw.map((org: Org & { _id?: string }) => ({
        ...org,
        id: org.id || (org as { _id?: string })._id || "",
      }));

      orgs = orgs.map((org) => {
        const filteredMembers = (org.members || []).filter((m) => !isSystemOwnerEmail(m.email));
        const regularAdmins = filteredMembers.filter((m) => m.role === "organization_admin");
        return {
          ...org,
          members: filteredMembers,
          member_count: org.member_count ?? filteredMembers.length,
          admin: org.admin && !isSystemOwnerEmail(org.admin.email) ? org.admin : regularAdmins[0] || null,
        };
      });

      setOrganizations(orgs.filter((o) => o.id));
    } catch (err: unknown) {
      console.error("Organizations load error:", err);
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      if (ax.response?.status === 401 || ax.response?.status === 403) {
        setError("Access denied — log out and sign in again as system owner (admin@outflo.com).");
      } else {
        setError("Failed to load organizations");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Permanently delete "${selected.name}" and all its CRM data? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/api/v1/organizations/${selected.id}`);
      setSelected(null);
      await load();
    } catch {
      setError("Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  };

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
      description="All registered organizations — click a row for details or delete"
      actions={
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button type="button" onClick={load} className="text-sm text-red-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {!loading && organizations.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Organizations appear when users register. You can also purge old CRM demo data from System Health.
          </p>
        </div>
      )}

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
                <tr
                  key={org.id}
                  className="hover:bg-white/[0.04] cursor-pointer"
                  onClick={() => setSelected(org)}
                >
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
                      {org.subscription?.plan_name || org.subscription?.plan || org.plan || "Free"}
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

      {!loading && organizations.length > 0 && (
        <div className="mt-6 text-sm text-gray-500">
          Showing {organizations.length} organization{organizations.length !== 1 ? "s" : ""} — click a row to manage
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-300">
              <p>
                <span className="text-gray-500">ID:</span> {selected.id}
              </p>
              {selected.slug && (
                <p>
                  <span className="text-gray-500">Slug:</span> {selected.slug}
                </p>
              )}
              {selected.admin?.email && (
                <p>
                  <span className="text-gray-500">Admin:</span> {selected.admin.email}
                </p>
              )}
              <p>
                <span className="text-gray-500">Members:</span> {selected.member_count ?? 0}
              </p>
            </div>
            <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/system-owner/organizations/${selected.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-medium hover:bg-purple-500/30"
              >
                <ExternalLink className="w-4 h-4" />
                Open detail
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting…" : "Delete organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SoPageLayout>
  );
}
