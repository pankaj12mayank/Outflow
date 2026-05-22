"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  Download,
  Plus,
  Check,
  Zap,
  ArrowRight,
  Receipt,
  Clock,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { toast } from "@/app/components/toast";
import api, { billingAPI } from "@/app/lib/api";
import { useAuth } from "@/app/hooks/useAuth";

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Usage {
  name: string;
  used: number;
  limit: number;
  percentage: number;
}

type LandingPlan = {
  id?: string;
  name: string;
  price: string;
  price_monthly?: number;
  features: string[];
  popular?: boolean;
};

export default function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [plans, setPlans] = useState<LandingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionRes, invoicesRes, plansRes] = await Promise.all([
        billingAPI.subscriptions(),
        billingAPI.invoices(),
        billingAPI.landingPlans(),
      ]);

      const pricing = plansRes.data?.pricing || plansRes.data?.plans || [];
      if (Array.isArray(pricing) && pricing.length > 0) {
        setPlans(pricing);
      }

      if (subscriptionRes.data) {
        const data = subscriptionRes.data;
        const sub = Array.isArray(data) 
          ? data.find((s: any) => s.status === "active") 
          : data;
        setSubscription(sub || null);
        if (sub?.plan_name) {
          setSelectedPlan(sub.plan_name);
        }
      } else {
        setSubscription(null);
      }

      const invoiceData = invoicesRes.data;
      if (Array.isArray(invoiceData)) {
        setInvoices(invoiceData.slice(0, 5).map((inv: any) => ({
          id: inv._id || inv.id,
          invoice_number: inv.invoice_number || inv.id,
          amount: inv.amount || 0,
          status: inv.status || "pending",
          created_at: inv.created_at || inv.date,
        })));
      } else {
        setInvoices([]);
      }

      setUsage([
        { name: "Emails Sent", used: 0, limit: 25000, percentage: 0 },
        { name: "Lead Enrichments", used: 0, limit: 10000, percentage: 0 },
        { name: "Team Members", used: 1, limit: 10, percentage: 10 },
      ]);

    } catch (err: any) {
      console.error("Failed to fetch billing data:", err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to load billing data. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const res = await api.get(`/api/v1/billing/invoices/${invoice.id}/pdf`);
      if (res.data?.pdf_base64) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${res.data.pdf_base64}`;
        link.download = `${invoice.invoice_number}.pdf`;
        link.click();
        toast.success("Invoice downloaded");
      }
    } catch (err) {
      toast.error("Failed to download invoice");
    }
  };

  const handleDownloadAllInvoices = () => {
    toast.info("Preparing invoice download...");
  };

  const handleUpdatePayment = () => {
    if (!cardNumber || !expiry || !cvc) {
      toast.error("Card details required", "Please fill all card details");
      return;
    }
    setShowPaymentModal(false);
    setCardNumber("");
    setExpiry("");
    setCvc("");
    toast.success("Payment method updated");
  };

  const handleSubscribe = async (plan: LandingPlan) => {
    const orgId = user?.organization?.id;
    if (!plan.id || !orgId) {
      toast.error("Cannot subscribe", "Plan or organization context is missing.");
      return;
    }
    setSubscribing(true);
    try {
      await billingAPI.createSubscription({
        organization_id: String(orgId),
        plan_id: plan.id,
        plan_name: plan.name,
        price_amount: plan.price_monthly ?? Number(plan.price) ?? 0,
        billing_interval: "monthly",
        trial_days: 0,
      });
      setSelectedPlan(plan.name);
      setShowSubscriptionModal(false);
      toast.success("Subscription updated", `Subscribed to ${plan.name}`);
      await fetchBillingData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error("Subscription failed", detail || "Could not create subscription");
    } finally {
      setSubscribing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchBillingData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const hasSubscription = subscription !== null;
  const planName = subscription?.plan_name || null;
  const planPrice = subscription?.amount || null;
  const nextBilling = subscription?.current_period_end || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing</h1>
          <p className="text-gray-400">Manage your subscription and payment methods</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownloadAllInvoices}>
          <Download className="w-4 h-4" />
          Download Invoices
        </Button>
      </div>

      <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {hasSubscription ? (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                  <Zap className="w-3 h-3 mr-1" />
                  {planName} Plan
                </Badge>
              ) : (
                <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                  No Active Plan
                </Badge>
              )}
            </div>
            {hasSubscription ? (
              <div className="text-4xl font-bold">
                ${planPrice}
                <span className="text-lg text-gray-400">/month</span>
              </div>
            ) : (
              <div className="text-4xl font-bold text-gray-400">
                No active subscription
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Next billing date</div>
            <div className="text-lg font-medium">
              {nextBilling ? formatDate(nextBilling) : "N/A"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2" onClick={() => setShowPaymentModal(true)}>
            <CreditCard className="w-4 h-4" />
            Update Payment Method
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowSubscriptionModal(true)}>
            Manage Subscription
          </Button>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-xl font-bold mb-6">Current Usage</h2>
        <div className="space-y-6">
          {usage.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm text-gray-400">
                  {item.used.toLocaleString()} / {item.limit.toLocaleString()}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={cn(
                    "h-full rounded-full",
                    item.percentage > 100
                      ? "bg-red-500"
                      : item.percentage > 80
                      ? "bg-yellow-500"
                      : "bg-purple-500"
                  )}
                />
              </div>
              {item.percentage > 100 && (
                <p className="text-xs text-red-400 mt-1">
                  Usage exceeded. Consider upgrading your plan.
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-xl font-bold mb-6">Payment Method</h2>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium">No payment method on file</div>
            <div className="text-sm text-gray-400">Add a payment method to continue</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)}>Add</Button>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-xl font-bold mb-6">Billing History</h2>
        {invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice, i) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-gray-400">{formatDate(invoice.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">${invoice.amount ? invoice.amount.toFixed(2) : "0.00"}</span>
                  <Badge className={cn(
                    "bg-green-500/10 text-green-400 border-green-500/20",
                    invoice.status === "pending" && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                    invoice.status === "failed" && "bg-red-500/10 text-red-400 border-red-500/20"
                  )}>
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet</p>
          </div>
        )}
      </div>

      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl p-6 rounded-2xl border border-white/10 bg-[#0a0a0f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Choose a plan</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSubscriptionModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {plans.length === 0 ? (
              <p className="text-gray-400 text-sm">No plans available. Ask your administrator to configure pricing plans.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id || plan.name}
                    className={cn(
                      "p-5 rounded-xl border",
                      plan.popular ? "border-purple-500/40 bg-purple-500/5" : "border-white/10 bg-white/5"
                    )}
                  >
                    {plan.popular && (
                      <Badge className="mb-2 bg-purple-500/10 text-purple-400 border-purple-500/20">Popular</Badge>
                    )}
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="text-3xl font-bold my-2">
                      ${plan.price_monthly ?? plan.price}
                      <span className="text-sm text-gray-400 font-normal">/mo</span>
                    </div>
                    <ul className="text-sm text-gray-400 space-y-1 mb-4">
                      {plan.features.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={subscribing}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0a0a0f]">
            <h2 className="text-xl font-bold mb-4">Update payment method</h2>
            <p className="text-sm text-gray-400 mb-4">
              Payment gateway integration is pending. Card details are not stored yet.
            </p>
            <Input placeholder="Card number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              <Input placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button onClick={handleUpdatePayment}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}