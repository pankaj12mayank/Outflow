"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { toast } from "@/app/components/toast";

const plans = [
  {
    name: "Starter",
    price: 49,
    features: ["5,000 emails/month", "1,000 lead enrichments", "5 campaigns", "Basic analytics"],
  },
  {
    name: "Professional",
    price: 149,
    features: ["25,000 emails/month", "10,000 lead enrichments", "Unlimited campaigns", "Advanced analytics", "AI personalization"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 499,
    features: ["Unlimited emails", "Unlimited enrichments", "Custom AI models", "Dedicated CSM", "SSO & advanced security"],
  },
];

const invoices = [
  { id: "INV-2026-005", amount: "$149.00", date: "2026-05-01", status: "paid" },
  { id: "INV-2026-004", amount: "$149.00", date: "2026-04-01", status: "paid" },
  { id: "INV-2026-003", amount: "$149.00", date: "2026-03-01", status: "paid" },
  { id: "INV-2026-002", amount: "$49.00", date: "2026-02-01", status: "paid" },
  { id: "INV-2026-001", amount: "$49.00", date: "2026-01-01", status: "paid" },
];

const usage = [
  { name: "Emails Sent", used: 89247, limit: 25000, percentage: 357 },
  { name: "Lead Enrichments", used: 12840, limit: 10000, percentage: 128 },
  { name: "Team Members", used: 5, limit: 10, percentage: 50 },
];

export default function BillingPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Professional");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handleDownloadInvoice = (invoice: any) => {
    toast.info("Downloading invoice...", invoice.id);
  };

  const handleDownloadAllInvoices = () => {
    toast.info("Downloading all invoices as ZIP...");
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

  const handleChangePlan = (plan: string) => {
    setSelectedPlan(plan);
    setShowSubscriptionModal(false);
    toast.success("Plan changed", `Switched to ${plan}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing</h1>
          <p className="text-gray-400">Manage your subscription and payment methods</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download Invoices
        </Button>
      </div>

      <div className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                <Zap className="w-3 h-3 mr-1" />
                Professional Plan
              </Badge>
            </div>
            <div className="text-4xl font-bold">$149<span className="text-lg text-gray-400">/month</span></div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Next billing date</div>
            <div className="text-lg font-medium">June 1, 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Update Payment Method
          </Button>
          <Button variant="outline" className="gap-2">
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
            <div className="font-medium">Visa ending in 4242</div>
            <div className="text-sm text-gray-400">Expires 12/2027</div>
          </div>
          <Button variant="outline" size="sm">Update</Button>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="text-xl font-bold mb-6">Billing History</h2>
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
                  <div className="font-medium">{invoice.id}</div>
                  <div className="text-sm text-gray-400">{invoice.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">{invoice.amount}</span>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">{invoice.status}</Badge>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}