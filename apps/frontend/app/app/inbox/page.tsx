"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  Mail,
  Send,
  Trash2,
  Archive,
  MoreHorizontal,
  Reply,
  Forward,
  Check,
  CheckCheck,
  Clock,
  Tag,
  AlertCircle,
  Sparkles,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

interface Email {
  id: number;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  body: string;
  date: string;
  time: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "starred" | "unread";
  classification: "lead" | "opportunity" | "customer" | "spam" | null;
  labels: string[];
}

const emails: Email[] = [
  {
    id: 1,
    from: {
      name: "Sarah Chen",
      email: "sarah.chen@techscale.io",
      avatar: "SC",
    },
    subject: "Re: Question about your outreach platform",
    preview: "Hi! Thanks for reaching out. I'd love to learn more about how you handle...",
    body: `Hi there!

Thanks for reaching out. I'd love to learn more about how you handle personalization at scale.

We've been looking for a solution that can help us automate our outbound campaigns while still maintaining that human touch. Our current process is quite manual and we're spending too much time on repetitive tasks.

Could you schedule a quick 15-minute call this week? I'm free on Thursday or Friday afternoon.

Best regards,
Sarah Chen
VP of Sales at TechScale Inc.`,
    date: "2026-05-14",
    time: "10:32 AM",
    read: false,
    starred: true,
    folder: "inbox",
    classification: "lead",
    labels: ["enterprise", "high-priority"],
  },
  {
    id: 2,
    from: {
      name: "Michael Torres",
      email: "m.torres@dataflow.com",
      avatar: "MT",
    },
    subject: "Demo request - DataFlow Systems",
    preview: "Thanks for your interest in Outflo! I'd be happy to schedule a demo...",
    body: `Hello!

Thanks for your interest in Outflo! I'd be happy to schedule a demo for your team.

At DataFlow, we're currently evaluating different outreach platforms to streamline our sales pipeline. We send about 5000 emails per month and need better tracking and analytics.

What times work for you this week?

Best,
Michael Torres
Head of Growth`,
    date: "2026-05-14",
    time: "09:15 AM",
    read: false,
    starred: false,
    folder: "unread",
    classification: "opportunity",
    labels: ["demo-request"],
  },
  {
    id: 3,
    from: {
      name: "Emma Williams",
      email: "emma.w@cloudnine.co",
      avatar: "EW",
    },
    subject: "Following up on our conversation",
    preview: "Just wanted to bump this to the top of your inbox. Would love to chat about...",
    body: `Hi!

Just wanted to bump this to the top of your inbox. Would love to chat about how we might be able to work together.

I saw your case study with Acme Corp and was impressed by the results. We're looking for something similar for our team of 20 SDRs.

Let me know if you're free for a quick call this week.

Thanks,
Emma Williams
CRO at CloudNine Solutions`,
    date: "2026-05-13",
    time: "4:45 PM",
    read: true,
    starred: false,
    folder: "inbox",
    classification: "opportunity",
    labels: ["follow-up"],
  },
  {
    id: 4,
    from: {
      name: "James Miller",
      email: "james@nexusai.io",
      avatar: "JM",
    },
    subject: "Not interested, but thanks",
    preview: "Appreciate the outreach but we're currently not in the market for...",
    body: `Hi,

Appreciate the outreach but we're currently not in the market for this type of solution. We're working with another vendor already.

Thanks for your time though.

James
CEO at Nexus AI`,
    date: "2026-05-13",
    time: "2:20 PM",
    read: true,
    starred: false,
    folder: "inbox",
    classification: "spam",
    labels: ["rejection"],
  },
  {
    id: 5,
    from: {
      name: "Lisa Park",
      email: "lisa.park@synthetix.com",
      avatar: "LP",
    },
    subject: "Integration question",
    preview: "We use Salesforce and HubSpot - can Outflo integrate with both?",
    body: `Hey!

Quick question - we use both Salesforce and HubSpot in our tech stack. Can Outflo integrate with both?

We're currently manually syncing data between the two which is a pain. Would love to find a solution that handles this automatically.

Let me know!

Lisa Park
Director of Marketing`,
    date: "2026-05-12",
    time: "11:08 AM",
    read: true,
    starred: true,
    folder: "starred",
    classification: "lead",
    labels: ["technical", "integration"],
  },
  {
    id: 6,
    from: {
      name: "David Kim",
      email: "d.kim@brightstack.io",
      avatar: "DK",
    },
    subject: "Pricing inquiry",
    preview: "Hi there! I'm interested in the Enterprise plan. Could you share more details...",
    body: `Hi there!

I'm interested in the Enterprise plan. Could you share more details about volume discounts and annual commitment options?

We're a team of 50 and looking to scale our outbound efforts significantly over the next quarter.

Thanks!
David Kim
VP of Sales`,
    date: "2026-05-12",
    time: "10:30 AM",
    read: true,
    starred: false,
    folder: "inbox",
    classification: "lead",
    labels: ["pricing", "enterprise"],
  },
  {
    id: 7,
    from: {
      name: "Alex Johnson",
      email: "alex@startupxyz.com",
      avatar: "AJ",
    },
    subject: "Re: Quick question",
    preview: "Thanks for the quick response! Actually, I have one more question about...",
    body: `Thanks for the quick response!

Actually, I have one more question about the personalization features. Can we use dynamic variables not just in the subject line and body, but also in attachments?

That would be a game changer for us.

Cheers,
Alex`,
    date: "2026-05-11",
    time: "3:15 PM",
    read: true,
    starred: false,
    folder: "inbox",
    classification: "lead",
    labels: ["technical"],
  },
  {
    id: 8,
    from: {
      name: "You",
      email: "you@outflo.com",
      avatar: "YO",
    },
    subject: "Initial outreach - TechScale Inc",
    preview: "Hi Sarah, I came across your profile and wanted to reach out about...",
    body: `Hi Sarah,

I came across your profile and wanted to reach out about how Outflo can help TechScale scale your outreach efforts.

We've helped companies like yours increase reply rates by an average of 3x through intelligent personalization and automation.

Would you be open to a quick 15-minute call this week?

Best regards`,
    date: "2026-05-10",
    time: "9:00 AM",
    read: true,
    starred: false,
    folder: "sent",
    classification: null,
    labels: ["outbound"],
  },
];

const tabs = [
  { id: "all", label: "All", icon: Mail, count: 0 },
  { id: "unread", label: "Unread", icon: Clock, count: 2 },
  { id: "starred", label: "Starred", icon: Star, count: 2 },
  { id: "sent", label: "Sent", icon: Send, count: 1 },
];

const classificationColors = {
  lead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  opportunity: "bg-green-500/10 text-green-400 border-green-500/20",
  customer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  spam: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function InboxPage() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(emails[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailList, setEmailList] = useState(emails);

  const filteredEmails = emailList.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      selectedTab === "all" ||
      (selectedTab === "unread" && !email.read) ||
      (selectedTab === "starred" && email.starred) ||
      email.folder === selectedTab;
    return matchesSearch && matchesTab;
  });

  const toggleRead = (id: number) => {
    setEmailList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: !e.read } : e))
    );
  };

  const toggleStar = (id: number) => {
    setEmailList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="w-80 flex flex-col border-r border-white/5">
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-sm"
            />
          </div>
        </div>

        <div className="px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                  selectedTab === tab.id
                    ? "bg-purple-500/10 text-purple-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
          {filteredEmails.map((email) => (
            <motion.button
              key={email.id}
              onClick={() => {
                setSelectedEmail(email);
                if (!email.read) toggleRead(email.id);
              }}
              whileHover={{ x: 2 }}
              className={cn(
                "w-full p-3 rounded-xl text-left transition-all",
                selectedEmail?.id === email.id
                  ? "bg-purple-500/10 border border-purple-500/20"
                  : "hover:bg-white/5 border border-transparent",
                !email.read && "bg-white/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    email.read ? "bg-white/10 text-gray-400" : "bg-purple-500/20 text-purple-400"
                  )}
                >
                  {email.from.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "font-medium truncate",
                        !email.read ? "text-white" : "text-gray-300"
                      )}
                    >
                      {email.from.name}
                    </span>
                    {email.starred && (
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-sm truncate",
                      !email.read ? "text-white font-medium" : "text-gray-400"
                    )}
                  >
                    {email.subject}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {email.preview}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{email.time}</div>
                </div>
                {!email.read && (
                  <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />
                )}
              </div>
            </motion.button>
          ))}

          {filteredEmails.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No emails found</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white/5 rounded-2xl border border-white/5">
        {selectedEmail ? (
          <>
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400">
                    {selectedEmail.from.avatar}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedEmail.from.name}</h2>
                    <p className="text-sm text-gray-400">{selectedEmail.from.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{selectedEmail.date}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-400">{selectedEmail.time}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{selectedEmail.subject}</h3>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedEmail.classification && (
                  <Badge
                    className={cn(
                      "capitalize",
                      classificationColors[selectedEmail.classification as keyof typeof classificationColors]
                    )}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {selectedEmail.classification}
                  </Badge>
                )}
                {selectedEmail.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <Button size="sm" variant="outline" className="gap-2">
                  <Reply className="w-4 h-4" />
                  Reply
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <Forward className="w-4 h-4" />
                  Forward
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={selectedEmail.starred ? "text-yellow-400" : ""}
                  onClick={() => toggleStar(selectedEmail.id)}
                >
                  <Star className={cn("w-4 h-4", selectedEmail.starred && "fill-yellow-400")} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={selectedEmail.read ? "" : "text-purple-400"}
                  onClick={() => toggleRead(selectedEmail.id)}
                >
                  {selectedEmail.read ? (
                    <CheckCheck className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400">
                  <Archive className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                  {selectedEmail.body}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an email to read</p>
              <p className="text-sm">Choose from your inbox on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}