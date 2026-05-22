"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { ArrowLeft } from "lucide-react";
import { getAuthHeaders } from "@/app/lib/auth";

type Member = {
  user_id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
};

type OrgDetail = {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean;
  members?: Member[];
  subscription?: {
    plan_name?: string;
    status?: string;
    current_period_end?: string;
    team_limit?: number;
    billing_cycle?: string;
  };
};


export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/organizations/${id}`, { headers: getAuthHeaders() });
      setOrg(res.data);
    } catch {
      toast.error("Organization not found");
      router.push("/system-owner/organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const toggleMember = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(
        `/api/v1/organizations/${id}/members/${userId}/status`,
        { is_active: isActive },
        { headers: getAuthHeaders() }
      );
      toast.success(isActive ? "User activated" : "User deactivated", "Access updated");
      load();
    } catch {
      toast.error("Could not update user");
    }
  };

  if (loading || !org) {
    return <SoPageLayout title="Organization"><p className="text-gray-500">Loading…</p></SoPageLayout>;
  }

  const sub = org.subscription;

  return (
    <SoPageLayout
      title={org.name}
      description="Plan, expiry, and team members"
      actions={
        <Link href="/system-owner/organizations" className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card label="Plan" value={sub?.plan_name || "Free"} />
        <Card
          label="Expires"
          value={
            sub?.current_period_end
              ? new Date(sub.current_period_end).toLocaleString()
              : "No subscription"
          }
        />
        <Card label="Team limit" value={String(sub?.team_limit ?? "—")} />
        <Card label="Status" value={sub?.status || (org.is_active ? "active" : "inactive")} />
        <Card label="Billing" value={sub?.billing_cycle || "—"} />
        <Card label="Members" value={String(org.members?.length ?? 0)} />
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Team</h2>
      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead className="bg-white/5 text-gray-400 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(org.members || []).map((m) => (
              <tr key={m.user_id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{m.full_name || "—"}</td>
                <td className="px-4 py-3 text-gray-400">{m.email}</td>
                <td className="px-4 py-3 capitalize">{m.role || "member"}</td>
                <td className="px-4 py-3">
                  <span className={m.is_active !== false ? "text-green-400" : "text-red-400"}>
                    {m.is_active !== false ? "Active" : "Blocked"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleMember(m.user_id, m.is_active === false)}
                    className="text-xs text-purple-400 hover:underline"
                  >
                    {m.is_active !== false ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SoPageLayout>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-white font-semibold mt-1 truncate">{value}</p>
    </div>
  );
}
