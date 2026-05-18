"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, MoreVertical, Building2, Users,
  CheckCircle, XCircle, Pause, Play, Eye, Trash2,
  ArrowUpDown, Calendar, ChevronLeft, ChevronRight
} from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import api from "@/app/lib/api";
import { Button } from "@/app/components/premium";
import { FormInput, FormSelect } from "@/app/components/premium/form";
import { Badge } from "@/app/components/premium/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/app/components/premium/table";
import { PageSkeleton } from "@/app/components/premium/skeleton";

interface Organization {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
  subscription?: {
    status: string;
    plan: string;
    billing_cycle: string;
  };
}

const statusVariants: Record<string, "green" | "red" | "yellow" | "default"> = {
  active: "green",
  suspended: "red",
  trial: "yellow",
  paused: "default",
};

export default function OrganizationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSystemOwnerAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/system-owner/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    }
  }, [isAuthenticated, page, search, statusFilter, sortBy, sortOrder]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const params: any = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      
      if (search) params.query = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/api/v1/organizations", {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setOrganizations(response.data.organizations || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (orgId: string) => {
    if (!confirm("Are you sure you want to suspend this organization?")) return;
    
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post(`/api/v1/organizations/${orgId}/suspend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrganizations();
    } catch (error) {
      console.error("Failed to suspend:", error);
    }
  };

  const handleActivate = async (orgId: string) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      await api.post(`/api/v1/organizations/${orgId}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrganizations();
    } catch (error) {
      console.error("Failed to activate:", error);
    }
  };

  const handleImpersonate = async (orgId: string) => {
    try {
      const token = localStorage.getItem("system_owner_token");
      const response = await api.post(`/api/v1/impersonate/${orgId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.setItem("impersonation_token", response.data.access_token);
      window.open("/app/dashboard", "_blank");
    } catch (error) {
      console.error("Failed to impersonate:", error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] p-8">
        <PageSkeleton stats={0} chart={false} table={true} tableRows={5} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center shadow-lg shadow-[var(--color-purple-glow)]"
              >
                <Building2 className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Organizations</h1>
                <p className="text-xs text-[var(--color-text-tertiary)]">{total} total organizations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <FormInput
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search organizations..."
              leftIcon={<Search className="w-4 h-4" />}
              className="pl-12"
            />
          </div>
          
          <FormSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "trial", label: "Trial" },
            ]}
            className="w-full sm:w-40"
          />

          <FormSelect
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split("-");
              setSortBy(by);
              setSortOrder(order);
            }}
            options={[
              { value: "created_at-desc", label: "Newest First" },
              { value: "created_at-asc", label: "Oldest First" },
              { value: "name-asc", label: "Name A-Z" },
              { value: "name-desc", label: "Name Z-A" },
            ]}
            className="w-full sm:w-48"
          />
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org, i) => (
                <motion.tr
                  key={org._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <TableCell>
                    <div>
                      <div className="text-[var(--color-text-primary)] font-medium">{org.name}</div>
                      <div className="text-[var(--color-text-tertiary)] text-sm">{org.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[org.status] || "secondary"}>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[var(--color-text-secondary)]">
                      {org.subscription?.plan || "Free"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <Users className="w-4 h-4" />
                      {org.member_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-[var(--color-text-tertiary)] text-sm">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/system-owner/organizations/${org._id}`)}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleImpersonate(org._id)}
                        title="Impersonate"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      {org.status === "active" ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSuspend(org._id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          title="Suspend"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleActivate(org._id)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                          title="Activate"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-6"
          >
            <div className="text-[var(--color-text-tertiary)] text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Prev
              </Button>
              <span className="px-4 text-[var(--color-text-primary)] font-medium">
                Page {page} of {totalPages}
              </span>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}