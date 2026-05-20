"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { Building2, RefreshCw, UserCheck, UserX } from "lucide-react";
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
      
      if (organizations.length > 0) {
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
      }
      
      setOrgs(organizations);
      setTotal(organizations.length);
    } catch {
      setOrgs([]);
      setTotal(0);
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
      description="Manage registered organizations on the platform"
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
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-white/10 p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">No Organizations</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Organizations will appear here when users register on the platform.
          </p>
        </div>
      )}
    </SoPageLayout>
  );
}
