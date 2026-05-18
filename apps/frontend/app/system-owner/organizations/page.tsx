"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Building2, RefreshCw, ChevronRight } from "lucide-react";

type Org = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  plan?: string;
  is_active?: boolean;
  member_count?: number;
  created_at?: string;
  admin?: { email?: string; full_name?: string; is_active?: boolean };
  subscription?: {
    plan?: string;
    status?: string;
    current_period_end?: string;
  };
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function SystemOwnerOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/organizations", {
        headers: authHeaders(),
        params: { page: 1, page_size: 50 },
      });
      setOrgs(res.data.organizations || []);
      setTotal(res.data.total ?? 0);
    } catch {
      toast.error("Could not load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SoPageLayout
      title="Organizations"
      description={`Registered companies only (${total}). Admin and team from real sign-ups.`}
      actions={
        <button type="button" onClick={load} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No organizations yet. They appear when someone registers at /register.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-white/5 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{org.name}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {org.admin?.email || "—"}
                    {org.admin?.is_active === false && (
                      <span className="ml-1 text-xs text-red-400">(inactive)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{org.subscription?.plan || org.plan || "free"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {org.subscription?.current_period_end
                      ? new Date(org.subscription.current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{org.member_count ?? 0}</td>
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
