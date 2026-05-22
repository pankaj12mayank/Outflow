"use client";

import { useState, useEffect, useMemo } from "react";
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
import { PageError, PageLoading } from "@/app/components/page-state";
import { useInbox } from "@/app/hooks/use-inbox";

interface Email {
  id: string;
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

const classificationColors = {
  lead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  opportunity: "bg-green-500/10 text-green-400 border-green-500/20",
  customer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  spam: "bg-red-500/10 text-red-400 border-red-500/20",
};

function mapInboxEmail(row: Record<string, unknown>): Email {
  const from = (row.from as Email["from"]) || {
    name: "Unknown",
    email: "",
    avatar: "?",
  };
  return {
    id: String(row.id),
    from,
    subject: String(row.subject || "(No subject)"),
    preview: String(row.preview || ""),
    body: String(row.body || row.preview || ""),
    date: String(row.date || ""),
    time: String(row.time || ""),
    read: Boolean(row.read),
    starred: Boolean(row.starred),
    folder: (row.folder as Email["folder"]) || "inbox",
    classification: (row.classification as Email["classification"]) || null,
    labels: (row.labels as string[]) || [],
  };
}

export default function InboxPage() {
  const { data, isLoading, isError, error, refetch } = useInbox();
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailList, setEmailList] = useState<Email[]>([]);

  useEffect(() => {
    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map((row) => mapInboxEmail(row as Record<string, unknown>));
    setEmailList(mapped);
    setSelectedEmail((prev) => {
      if (prev && mapped.some((m) => m.id === prev.id)) return prev;
      return mapped[0] ?? null;
    });
  }, [data]);

  const tabCounts = useMemo(
    () => ({
      all: emailList.length,
      unread: emailList.filter((e) => !e.read).length,
      starred: emailList.filter((e) => e.starred).length,
      sent: emailList.filter((e) => e.folder === "sent").length,
    }),
    [emailList]
  );

  const tabs = [
    { id: "all", label: "All", icon: Mail, count: tabCounts.all },
    { id: "unread", label: "Unread", icon: Clock, count: tabCounts.unread },
    { id: "starred", label: "Starred", icon: Star, count: tabCounts.starred },
    { id: "sent", label: "Sent", icon: Send, count: tabCounts.sent },
  ];

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

  const toggleRead = (id: string) => {
    setEmailList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: !e.read } : e))
    );
    setSelectedEmail((prev) => (prev?.id === id ? { ...prev, read: !prev.read } : prev));
  };

  const toggleStar = (id: string) => {
    setEmailList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
    setSelectedEmail((prev) => (prev?.id === id ? { ...prev, starred: !prev.starred } : prev));
  };

  if (isLoading && emailList.length === 0) {
    return <PageLoading label="Loading inbox..." />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {isError && (
        <PageError
          message={(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Could not load inbox."}
          onRetry={() => refetch()}
        />
      )}
    <div className="flex flex-1 gap-6 min-h-0">
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
            <div className="text-center py-8 text-gray-500 px-4">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Sent campaign emails will appear here.</p>
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
    </div>
  );
}
