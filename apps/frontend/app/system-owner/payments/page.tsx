"use client";

import { useEffect, useState } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { RefreshCw, CreditCard, History, Mail } from "lucide-react";

type Tab = "gateways" | "history" | "templates";

type Gateways = {
  stripe: { enabled: boolean; publishable_key: string; secret_key: string; webhook_secret: string; test_mode: boolean };
  razorpay: { enabled: boolean; key_id: string; key_secret: string; webhook_secret: string; test_mode: boolean };
};

type Tx = {
  id: string;
  provider: string;
  plan_name?: string;
  amount: number;
  currency: string;
  status: string;
  test_mode?: boolean;
  created_at?: string;
};

type HistoryRow = {
  id: string;
  event_type: string;
  organization_name?: string;
  user_email?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
  status?: string;
  email_sent?: boolean;
  failure_reason?: string;
  created_at?: string;
};

type BillingTemplate = {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  is_active?: boolean;
  variables?: string[];
};

type Org = { id: string; name: string };
type Plan = { id: string; name: string };

const EVENT_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  plan_purchased: "Plan purchased",
  plan_renewed: "Plan renewed",
  payment_failed: "Payment failed",
  plan_expired: "Plan expired",
};

const TEMPLATE_LABELS: Record<string, string> = {
  billing_onboarding: "Onboarding",
  billing_plan_purchased: "Plan purchased",
  billing_plan_renewed: "Plan renewed",
  billing_payment_failed: "Payment failed",
  billing_plan_expired: "Plan expired",
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("gateways");
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [templates, setTemplates] = useState<BillingTemplate[]>([]);
  const [editingTpl, setEditingTpl] = useState<BillingTemplate | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [testForm, setTestForm] = useState({
    provider: "stripe",
    organization_id: "",
    plan_id: "",
    amount: 29,
  });
  const [testEmail, setTestEmail] = useState({ template_type: "billing_plan_purchased", recipient_email: "" });

  const load = async () => {
    try {
      const [g, t, o, p, h, tpl] = await Promise.all([
        api.get("/api/v1/system-owner/payments/settings", { headers: authHeaders() }),
        api.get("/api/v1/system-owner/payments/transactions", { headers: authHeaders() }),
        api.get("/api/v1/organizations", { headers: authHeaders(), params: { page_size: 50 } }),
        api.get("/api/v1/plans", { headers: authHeaders() }),
        api.get("/api/v1/system-owner/billing/history", { headers: authHeaders(), params: { limit: 100 } }),
        api.get("/api/v1/system-owner/billing/email-templates", { headers: authHeaders() }),
      ]);
      setGateways(g.data.gateways);
      setTxs(t.data.transactions || []);
      setOrgs((o.data.organizations || []).map((x: Org) => ({ id: x.id, name: x.name })));
      setPlans((p.data.plans || []).map((x: Plan) => ({ id: x.id, name: x.name })));
      setHistory(h.data.history || []);
      setTemplates(tpl.data.templates || []);
    } catch {
      toast.error("Failed to load billing data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    if (!gateways) return;
    setSaving(true);
    try {
      await api.put("/api/v1/system-owner/payments/settings", gateways, { headers: authHeaders() });
      toast.success("Saved", "Gateway settings updated");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runTestPayment = async () => {
    try {
      const res = await api.post("/api/v1/system-owner/payments/test", testForm, { headers: authHeaders() });
      const evt = res.data.event_type === "plan_renewed" ? "renewal" : "purchase";
      toast.success("Payment recorded", `Plan ${evt} + email sent if SMTP configured`);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Test failed", err.response?.data?.detail || "Check org and plan");
    }
  };

  const runTestFailed = async () => {
    try {
      await api.post(
        "/api/v1/system-owner/payments/test-failed",
        {
          ...testForm,
          failure_reason: "Test card declined",
        },
        { headers: authHeaders() }
      );
      toast.success("Failed payment recorded", "History + failure email logged");
      load();
    } catch {
      toast.error("Test failed");
    }
  };

  const syncExpirations = async () => {
    try {
      const res = await api.post("/api/v1/system-owner/payments/sync-expirations", {}, { headers: authHeaders() });
      toast.success("Synced", `${res.data.expired_count} expired — emails sent`);
      load();
    } catch {
      toast.error("Sync failed");
    }
  };

  const seedTemplates = async () => {
    try {
      await api.post("/api/v1/system-owner/billing/email-templates/seed", {}, { headers: authHeaders() });
      toast.success("Templates ready");
      load();
    } catch {
      toast.error("Seed failed");
    }
  };

  const saveTemplate = async () => {
    if (!editingTpl) return;
    try {
      await api.put(
        `/api/v1/system-owner/billing/email-templates/${editingTpl.id}`,
        {
          subject: editingTpl.subject,
          body_text: editingTpl.body_text,
          body_html: editingTpl.body_html,
          is_active: editingTpl.is_active,
        },
        { headers: authHeaders() }
      );
      toast.success("Template saved");
      setEditingTpl(null);
      load();
    } catch {
      toast.error("Save failed");
    }
  };

  const sendTestTemplateEmail = async () => {
    try {
      await api.post("/api/v1/system-owner/billing/email-templates/test", testEmail, { headers: authHeaders() });
      toast.success("Test email sent");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error("Send failed", err.response?.data?.detail || "Configure SMTP first");
    }
  };

  if (!gateways) {
    return (
      <SoPageLayout title="Billing">
        <p className="text-gray-500">Loading…</p>
      </SoPageLayout>
    );
  }

  return (
    <SoPageLayout
      title="Billing & payments"
      description="Plan-based billing, full history, Stripe/Razorpay, and lifecycle emails (purchase, renew, fail, expire, onboarding)."
      actions={
        <button
          type="button"
          onClick={syncExpirations}
          className="text-xs px-3 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white"
        >
          Sync expirations
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-2">
        {(
          [
            { id: "gateways" as Tab, label: "Gateways", icon: CreditCard },
            { id: "history" as Tab, label: "History", icon: History },
            { id: "templates" as Tab, label: "Email templates", icon: Mail },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              tab === id ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-2 text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {tab === "gateways" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 p-5 space-y-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" /> Stripe
              </h2>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={gateways.stripe.enabled}
                  onChange={(e) =>
                    setGateways({ ...gateways, stripe: { ...gateways.stripe, enabled: e.target.checked } })
                  }
                />
                Enabled
              </label>
              <Field
                label="Publishable key"
                value={gateways.stripe.publishable_key}
                onChange={(v) => setGateways({ ...gateways, stripe: { ...gateways.stripe, publishable_key: v } })}
              />
              <Field
                label="Secret key"
                value={gateways.stripe.secret_key}
                onChange={(v) => setGateways({ ...gateways, stripe: { ...gateways.stripe, secret_key: v } })}
                secret
              />
            </section>
            <section className="rounded-xl border border-white/10 p-5 space-y-4">
              <h2 className="font-semibold text-white">Razorpay</h2>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={gateways.razorpay.enabled}
                  onChange={(e) =>
                    setGateways({ ...gateways, razorpay: { ...gateways.razorpay, enabled: e.target.checked } })
                  }
                />
                Enabled
              </label>
              <Field
                label="Key ID"
                value={gateways.razorpay.key_id}
                onChange={(v) => setGateways({ ...gateways, razorpay: { ...gateways.razorpay, key_id: v } })}
              />
              <Field
                label="Key secret"
                value={gateways.razorpay.key_secret}
                onChange={(v) => setGateways({ ...gateways, razorpay: { ...gateways.razorpay, key_secret: v } })}
                secret
              />
            </section>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveSettings}
            className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500"
          >
            {saving ? "Saving…" : "Save gateway settings"}
          </button>

          <section className="mt-8 rounded-xl border border-white/10 p-5">
            <h2 className="font-semibold text-white mb-4">Test billing flow</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testForm.provider}
                onChange={(e) => setTestForm({ ...testForm, provider: e.target.value })}
              >
                <option value="stripe">Stripe</option>
                <option value="razorpay">Razorpay</option>
              </select>
              <select
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testForm.organization_id}
                onChange={(e) => setTestForm({ ...testForm, organization_id: e.target.value })}
              >
                <option value="">Organization</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testForm.plan_id}
                onChange={(e) => setTestForm({ ...testForm, plan_id: e.target.value })}
              >
                <option value="">Plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testForm.amount}
                onChange={(e) => setTestForm({ ...testForm, amount: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <button type="button" onClick={runTestPayment} className="text-sm text-purple-400 underline">
                Test purchase / renew
              </button>
              <button type="button" onClick={runTestFailed} className="text-sm text-red-400 underline">
                Test payment failed
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-white/10 overflow-hidden">
            <h2 className="font-semibold text-white px-4 py-3 border-b border-white/10">Transactions</h2>
            <HistoryTable
              rows={txs.map((tx) => ({
                id: tx.id,
                date: tx.created_at,
                type: tx.status,
                org: "—",
                plan: tx.plan_name,
                amount: `${tx.currency?.toUpperCase()} ${tx.amount}`,
                email: tx.test_mode ? "test" : "—",
              }))}
              empty="No transactions yet"
            />
          </section>
        </>
      )}

      {tab === "history" && (
        <section className="rounded-xl border border-white/10 overflow-hidden">
          <h2 className="font-semibold text-white px-4 py-3 border-b border-white/10">
            Billing history ({history.length})
          </h2>
          <HistoryTable
            rows={history.map((h) => ({
              id: h.id,
              date: h.created_at,
              type: EVENT_LABELS[h.event_type] || h.event_type,
              org: h.organization_name || "—",
              plan: h.plan_name || "—",
              amount: h.amount != null ? `${(h.currency || "USD").toUpperCase()} ${h.amount}` : "—",
              email: h.email_sent ? "sent" : h.status === "failed" ? "—" : "no",
            }))}
            empty="No billing events yet"
          />
        </section>
      )}

      {tab === "templates" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={seedTemplates}
              className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-300"
            >
              Reset default templates
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Variables: {"{{user_name}}"}, {"{{org_name}}"}, {"{{plan_name}}"}, {"{{amount}}"}, {"{{currency}}"},
            {"{{period_end}}"}, {"{{failure_reason}}"}, {"{{billing_url}}"}, {"{{login_url}}"}
          </p>
          <div className="grid gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-white">{tpl.name}</h3>
                    <p className="text-xs text-gray-500">{TEMPLATE_LABELS[tpl.type] || tpl.type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingTpl({ ...tpl })}
                    className="text-sm text-purple-400"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2 truncate">Subject: {tpl.subject}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 rounded-xl border border-white/10 p-4">
            <h3 className="text-sm font-medium text-white mb-3">Send test email</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testEmail.template_type}
                onChange={(e) => setTestEmail({ ...testEmail, template_type: e.target.value })}
              >
                {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="email"
                placeholder="recipient@email.com"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={testEmail.recipient_email}
                onChange={(e) => setTestEmail({ ...testEmail, recipient_email: e.target.value })}
              />
            </div>
            <button type="button" onClick={sendTestTemplateEmail} className="mt-2 text-sm text-purple-400 underline">
              Send test
            </button>
          </section>

          {editingTpl && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#12121a] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Edit {editingTpl.name}</h3>
                <div className="space-y-4">
                  <Field
                    label="Subject"
                    value={editingTpl.subject}
                    onChange={(v) => setEditingTpl({ ...editingTpl, subject: v })}
                  />
                  <label className="block text-sm text-gray-400">
                    Plain text
                    <textarea
                      className="mt-1 w-full h-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                      value={editingTpl.body_text || ""}
                      onChange={(e) => setEditingTpl({ ...editingTpl, body_text: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm text-gray-400">
                    HTML
                    <textarea
                      className="mt-1 w-full h-32 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm font-mono"
                      value={editingTpl.body_html || ""}
                      onChange={(e) => setEditingTpl({ ...editingTpl, body_html: e.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={editingTpl.is_active !== false}
                      onChange={(e) => setEditingTpl({ ...editingTpl, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setEditingTpl(null)} className="text-gray-400">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm"
                  >
                    Save template
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SoPageLayout>
  );
}

function HistoryTable({
  rows,
  empty,
}: {
  rows: { id: string; date?: string; type: string; org: string; plan?: string; amount: string; email: string }[];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-white/5 text-gray-400 text-left">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Event</th>
            <th className="px-4 py-2">Organization</th>
            <th className="px-4 py-2">Plan</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-2 text-gray-400">
                  {r.date ? new Date(r.date).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-white">{r.type}</td>
                <td className="px-4 py-2">{r.org}</td>
                <td className="px-4 py-2">{r.plan || "—"}</td>
                <td className="px-4 py-2">{r.amount}</td>
                <td className="px-4 py-2 text-gray-400">{r.email}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
}) {
  return (
    <label className="block text-sm text-gray-400">
      {label}
      <input
        type={secret ? "password" : "text"}
        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
