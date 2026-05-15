"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Settings,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Target,
  Mail,
  MessageSquare,
  Users,
  Zap,
  Calendar,
  ChevronDown,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  created_at: string;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "campaign", title: "Campaign Completed", message: "Your Q1 Outreach campaign has finished sending.", priority: "high", is_read: false, action_url: "/campaigns/1", created_at: "2 min ago" },
  { id: "2", type: "ai", title: "AI Personalization Complete", message: "125 emails have been personalized using website analysis.", priority: "normal", is_read: false, action_url: "/campaigns/1", created_at: "15 min ago" },
  { id: "3", type: "scraping", title: "Scraping Job Finished", message: "Google Maps scrape found 234 leads in San Francisco.", priority: "normal", is_read: true, action_url: "/leads", created_at: "1 hour ago" },
  { id: "4", type: "email", title: "New Reply Received", message: "Sarah Chen from Acme Corp replied to your email.", priority: "high", is_read: true, action_url: "/inbox", created_at: "2 hours ago" },
  { id: "5", type: "meeting", title: "Meeting Reminder", message: "Demo call with John in 30 minutes.", priority: "urgent", is_read: true, action_url: "/calendar", created_at: "3 hours ago" },
  { id: "6", type: "system", title: "Email Account Warmup", message: "sales@acme.com completed day 15 of warmup.", priority: "low", is_read: true, created_at: "5 hours ago" },
];

const typeIcons: Record<string, any> = {
  campaign: Target,
  ai: Zap,
  scraping: Users,
  email: Mail,
  meeting: Calendar,
  lead: Users,
  system: Bell,
  security: AlertTriangle,
};

const typeColors: Record<string, string> = {
  campaign: "purple",
  ai: "cyan",
  scraping: "green",
  email: "blue",
  meeting: "yellow",
  lead: "pink",
  system: "gray",
  security: "red",
};

const priorityColors: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  normal: "text-gray-400 bg-white/5 border-white/10",
  low: "text-gray-500 bg-white/5 border-white/5",
};

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;
  const color = typeColors[notification.type] || "gray";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-4 rounded-xl border transition-all",
        notification.is_read
          ? "border-white/5 bg-white/5"
          : "border-purple-500/20 bg-purple-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", `bg-${color}-500/10`)}>
          <Icon className={cn("w-5 h-5", `text-${color}-400`)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={cn("font-medium", !notification.is_read && "text-white")}>
                {notification.title}
              </div>
              {notification.message && (
                <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {notification.message}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-purple-500" />
              )}
              <button
                onClick={onDismiss}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{notification.created_at}</span>
            <div className="flex items-center gap-2">
              {notification.action_url && (
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  View
                </Button>
              )}
              {!notification.is_read && (
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={onMarkRead}>
                  <CheckCheck className="w-3 h-3" />
                  Mark Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const colors = {
    success: "border-green-500/30 bg-green-500/10",
    error: "border-red-500/30 bg-red-500/10",
    warning: "border-yellow-500/30 bg-yellow-500/10",
    info: "border-blue-500/30 bg-blue-500/10",
  };
  const iconColors = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn("p-4 rounded-xl border backdrop-blur-xl flex items-start gap-3 min-w-[320px] max-w-[400px]", colors[toast.type])}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColors[toast.type])} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{toast.title}</div>
        {toast.message && <div className="text-xs text-gray-400 mt-0.5">{toast.message}</div>}
      </div>
      <button onClick={onDismiss} className="p-1 hover:bg-white/10 rounded">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function NotificationCenter({
  notifications = mockNotifications,
  unreadCount = 2,
  onMarkAllRead,
  onSettings,
}: {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onSettings?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [notifList, setNotifList] = useState(notifications);

  const filtered = notifList.filter((n) => {
    if (filter !== "all" && n.type !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleMarkRead = (id: string) => {
    setNotifList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleDismiss = (id: string) => {
    setNotifList((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-[420px] rounded-2xl border border-white/10 bg-gradient-to-b from-black/90 to-black/60 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onMarkAllRead}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                  <button
                    onClick={onSettings}
                    className="p-1.5 rounded-lg hover:bg-white/5"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 overflow-x-auto">
                {["all", "campaign", "ai", "scraping", "email", "meeting"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap",
                      filter === f
                        ? "bg-purple-500/10 text-purple-400"
                        : "text-gray-400 hover:bg-white/5"
                    )}
                  >
                    {f === "all" ? "All" : f === "ai" ? "AI" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {filtered.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkRead={() => handleMarkRead(notif.id)}
                    onDismiss={() => handleDismiss(notif.id)}
                  />
                ))}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>No notifications</div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 text-center">
              <button className="text-sm text-purple-400 hover:text-purple-300">
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NotificationBadge({ count }: { count: number }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <span className="flex h-2 w-2">
        {count > 0 && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
        )}
        {count > 0 && (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
        )}
      </span>
    </div>
  );
}

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration || 5000);
    }
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}