"use client";

import { useToastStore } from "./toast-store";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/app/lib/utils";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: {
    bg: "bg-green-500/10 border-green-500/30",
    icon: "text-green-400",
    iconBg: "bg-green-500/20",
  },
  error: {
    bg: "bg-red-500/10 border-red-500/30",
    icon: "text-red-400",
    iconBg: "bg-red-500/20",
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/30",
    icon: "text-yellow-400",
    iconBg: "bg-yellow-500/20",
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: "text-blue-400",
    iconBg: "bg-blue-500/20",
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        const s = styles[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "relative flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-sm animate-fade-up",
              s.bg
            )}
          >
            <div className={cn("p-2 rounded-lg shrink-0", s.iconBg)}>
              <Icon className={cn("w-5 h-5", s.icon)} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{t.title}</h4>
              {t.message ? (
                <p className="text-sm text-gray-300 mt-0.5">{t.message}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
