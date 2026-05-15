"use client";

import { useBillingStats, usePlatformStats } from "@/app/hooks/use-admin";
import { DollarSign, TrendingUp, CreditCard, Receipt, ArrowUpRight } from "lucide-react";

function BillingCard({ title, value, subtitle, icon: Icon, color = "violet" }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color?: string;
}) {
  const colors = { violet: "text-violet-400 bg-violet-500/10 border-violet-500/20", emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", amber: "text-amber-400 bg-amber-500/10 border-amber-500/20", rose: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { data: billing } = useBillingStats();
  const { data: stats } = usePlatformStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Revenue</h1>
        <p className="text-gray-400">Financial overview and subscription metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <BillingCard title="MRR" value={`$${(billing?.mrr ?? 0).toFixed(2)}`} subtitle="Monthly Recurring Revenue" icon={DollarSign} color="violet" />
        <BillingCard title="ARR" value={`$${(billing?.arr ?? 0).toFixed(2)}`} subtitle="Annual Recurring Revenue" icon={TrendingUp} color="emerald" />
        <BillingCard title="Avg Invoice" value={`$${(billing?.average_invoice_value ?? 0).toFixed(2)}`} subtitle="Per organization" icon={Receipt} color="blue" />
        <BillingCard title="Active Subs" value={`${stats?.active_subscriptions ?? 0}`} subtitle={`of ${stats?.total_subscriptions ?? 0} total`} icon={CreditCard} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-white">Paid Invoices</span>
              </div>
              <span className="text-emerald-400 font-semibold">${(billing?.paid_invoices ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-white">Pending</span>
              </div>
              <span className="text-amber-400 font-semibold">${(billing?.pending_invoices ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-white">Failed</span>
              </div>
              <span className="text-rose-400 font-semibold">${(billing?.failed_invoices ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Organizations</span>
              <span className="text-white font-semibold">{stats?.total_organizations ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Active Organizations</span>
              <span className="text-emerald-400 font-semibold">{stats?.active_organizations ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Users</span>
              <span className="text-white font-semibold">{stats?.total_users ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Churn Rate</span>
              <span className="text-amber-400 font-semibold">{(stats?.churn_rate ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">New Orgs This Month</span>
              <span className="text-violet-400 font-semibold">{stats?.new_orgs_this_month ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">New Orgs Last Month</span>
              <span className="text-gray-400 font-semibold">{stats?.new_orgs_last_month ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}