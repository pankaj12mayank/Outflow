"use client";

import { useState, useEffect } from "react";
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
  CreditCard,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { notificationsAPI } from "@/app/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  created_at: string;
}

function normalizeNotification(raw: Record<string, unknown>): Notification {
  const id = String(raw.id ?? raw._id ?? "");
  return {
    id,
    type: String(raw.type ?? "system"),
    title: String(raw.title ?? ""),
    message: String(raw.message ?? ""),
    priority: String(raw.priority ?? "normal"),
    is_read: Boolean(raw.is_read ?? raw.read ?? false),
    action_url: raw.action_url as string | undefined,
    action_label: raw.action_label as string | undefined,
    metadata: raw.metadata,
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const typeIconMap: Record<string, any> = {
    campaign: Target,
    ai: Zap,
    scraping: Users,
    email: Mail,
    meeting: Calendar,
    lead: Users,
    system: Bell,
    security: AlertTriangle,
    billing_alert: CreditCard,
    smtp_failure: Mail,
    subscription_expiry: AlertCircle,
    ai_usage_alert: Zap,
    scraping_failure: Search,
  };

  const typeColorMap: Record<string, string> = {
    campaign: "purple",
    ai: "cyan",
    scraping: "green",
    email: "blue",
    meeting: "yellow",
    lead: "pink",
    system: "gray",
    security: "red",
    billing_alert: "yellow",
    smtp_failure: "green",
    subscription_expiry: "red",
    ai_usage_alert: "cyan",
    scraping_failure: "green",
  };

  const Icon = typeIconMap[notification.type] || Bell;
  const color = typeColorMap[notification.type] || "gray";

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
            <span className="text-xs text-gray-500">
              {new Date(notification.created_at).toLocaleString()}
            </span>
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
      className={cn("p-4 rounded-xl border backdrop-blur-xl flex items-start gap-3 min-w-[280px] max-w-[90vw] sm:max-w-[400px]", colors[toast.type])}
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
  onMarkAllRead: externalMarkAllRead,
  onSettings,
}: {
  onMarkAllRead?: () => void;
  onSettings?: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.list({ limit: 50 });
      const items = (Array.isArray(data) ? data : []).map((n) =>
        normalizeNotification(n as Record<string, unknown>)
      );
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (externalMarkAllRead) {
      externalMarkAllRead();
      return;
    }
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter !== "all" && n.type !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const notifTypes = ["all", "campaign", "ai", "scraping", "email", "meeting", "billing_alert", "smtp_failure"];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-all"
        aria-label="Toggle notifications"
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
            className="fixed sm:absolute right-0 top-full mt-2 w-[90vw] sm:w-[420px] rounded-2xl border border-white/10 bg-gradient-to-b from-black/90 to-black/60 backdrop-blur-xl shadow-2xl overflow-hidden z-50 sm:right-0 left-4 sm:left-auto"
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                  <button
                    onClick={onSettings}
                    className="p-1.5 rounded-lg hover:bg-white/5"
                    aria-label="Notification settings"
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

              <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-thin">
                {notifTypes.map((f) => (
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
                    {f === "all" ? "All" : f === "ai" ? "AI" : f.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                  <div>Loading...</div>
                </div>
              ) : (
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
              )}

              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>No notifications</div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
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
