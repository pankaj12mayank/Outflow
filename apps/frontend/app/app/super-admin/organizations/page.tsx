"use client";

import { useState } from "react";
import { useAdminOrgs, useSuspendOrg, useReactivateOrg } from "@/app/hooks/use-admin";
import { Search, XCircle, CheckCircle, ChevronLeft, ChevronRight, Building2, ShieldAlert } from "lucide-react";

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrgs({ search, status, page, limit: 20 });
  const suspendMutation = useSuspendOrg();
  const reactivateMutation = useReactivateOrg();

  const orgs = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-gray-400">Manage all organizations on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 w-64"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Organization</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Plan</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Users</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Subscription</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Joined</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading...</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No organizations found
              </td></tr>
            ) : orgs.map((org: { id: number; name: string; slug: string; is_active: boolean; plan_name: string | null; user_count: number; subscription_status: string | null; created_at: string }) => (
              <tr key={org.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-4 px-6">
                  <div>
                    <p className="text-white font-medium">{org.name}</p>
                    <p className="text-xs text-gray-500">/{org.slug}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xs px-2 py-1 rounded-full ${org.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {org.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-400">{org.plan_name || "—"}</td>
                <td className="py-4 px-6 text-gray-400">{org.user_count}</td>
                <td className="py-4 px-6">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    org.subscription_status === "active" ? "bg-violet-500/20 text-violet-400" :
                    org.subscription_status === "trial" ? "bg-amber-500/20 text-amber-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>{org.subscription_status || "none"}</span>
                </td>
                <td className="py-4 px-6 text-gray-500">{new Date(org.created_at).toLocaleDateString()}</td>
                <td className="py-4 px-6">
                  {org.is_active ? (
                    <button
                      onClick={() => suspendMutation.mutate({ orgId: org.id })}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"
                    >
                      <XCircle className="w-3 h-3" /> Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivateMutation.mutate(org.id)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <CheckCircle className="w-3 h-3" /> Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={orgs.length < 20}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}