"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Workflow, Mail, Target, ChevronRight } from "lucide-react";

const workflows = [
  {
    title: "Email sequences",
    description: "Multi-step drip campaigns with delays and conditions.",
    href: "/app/sequences",
    icon: Mail,
  },
  {
    title: "Outreach campaigns",
    description: "Launch and track batch outreach to your lead lists.",
    href: "/app/campaigns",
    icon: Target,
  },
];

export default function AutomationPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Workflow className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold">Automation</h1>
        </div>
        <p className="text-gray-400">
          Use sequences and campaigns to automate outreach. Advanced workflow builder is coming soon.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {workflows.map((item, i) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link
              href={item.href}
              className="block p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
            >
              <item.icon className="w-8 h-8 text-purple-400 mb-4" />
              <h2 className="text-lg font-semibold text-white mb-1">{item.title}</h2>
              <p className="text-sm text-gray-400 mb-4">{item.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-purple-400 group-hover:gap-2 transition-all">
                Open <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
