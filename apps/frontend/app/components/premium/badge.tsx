"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Check, X, AlertCircle, Clock, Zap, Star } from "lucide-react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "purple" | "green" | "orange" | "red" | "blue" | "yellow" | "cyan" | "outline" | "glow";
  size?: "sm" | "md" | "lg" | "pill";
  animated?: boolean;
  pulse?: boolean;
  icon?: "check" | "x" | "alert" | "clock" | "zap" | "star";
}

const icons = {
  check: Check,
  x: X,
  alert: AlertCircle,
  clock: Clock,
  zap: Zap,
  star: Star,
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", animated = false, pulse = false, icon, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center font-medium rounded-full
      transition-all duration-200
    `;

    const variants = {
      default: `
        bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]
        border border-[var(--color-border)]
      `,
      purple: `
        bg-[var(--color-purple-dim)] text-[var(--color-purple)]
        border border-[rgba(167,139,250,0.2)]
      `,
      green: `
        bg-[var(--color-green-dim)] text-[var(--color-green)]
        border border-[rgba(74,222,128,0.2)]
      `,
      orange: `
        bg-[rgba(251,191,36,0.15)] text-[var(--color-warning)]
        border border-[rgba(251,191,36,0.2)]
      `,
      red: `
        bg-[rgba(248,113,113,0.15)] text-[var(--color-error)]
        border border-[rgba(248,113,113,0.2)]
      `,
      blue: `
        bg-[rgba(96,165,250,0.15)] text-[var(--color-info)]
        border border-[rgba(96,165,250,0.2)]
      `,
      yellow: `
        bg-[rgba(251,191,36,0.15)] text-[#fbbf24]
        border border-[rgba(251,191,36,0.2)]
      `,
      cyan: `
        bg-[rgba(34,211,238,0.15)] text-[#22d3ee]
        border border-[rgba(34,211,238,0.2)]
      `,
      outline: `
        bg-transparent text-[var(--color-text-secondary)]
        border border-[var(--color-border)]
      `,
      glow: `
        bg-[var(--color-purple-dim)] text-[var(--color-purple)]
        border border-[var(--color-purple)]/30
        shadow-[0_0_20px_rgba(167,139,250,0.3)]
      `,
    };

    const sizes = {
      sm: "px-2.5 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-1.5 text-base",
      pill: "px-4 py-1 text-sm rounded-full",
    };

    const IconComponent = icon ? icons[icon] : null;

    const badge = (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {IconComponent && (
          <IconComponent className={cn("w-3 h-3 mr-1.5", size === "lg" && "w-4 h-4")} />
        )}
        {children}
        {pulse && (
          <motion.span
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn(
              "ml-1.5 w-1.5 h-1.5 rounded-full",
              variant === "green" && "bg-green-400",
              variant === "red" && "bg-red-400",
              variant === "purple" && "bg-purple-400",
              variant === "default" && "bg-gray-400"
            )}
          />
        )}
      </span>
    );

    if (animated) {
      return (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn("inline-flex", className)}
        >
          {badge}
        </motion.span>
      );
    }

    return badge;
  }
);

Badge.displayName = "Badge";

interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "processing" | "success" | "error" | "warning";
  label?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

function StatusBadge({ status, label, size = "md", animated = true }: StatusBadgeProps) {
  const statusConfig: Record<string, { variant: "green" | "default" | "yellow" | "blue" | "red" | "orange"; dot: boolean; defaultLabel: string; pulse?: boolean; icon?: "check" | "x" | "alert" }> = {
    active: { variant: "green", dot: true, defaultLabel: "Active" },
    inactive: { variant: "default", dot: true, defaultLabel: "Inactive" },
    pending: { variant: "yellow", dot: true, defaultLabel: "Pending" },
    processing: { variant: "blue", dot: true, defaultLabel: "Processing", pulse: true },
    success: { variant: "green", dot: true, defaultLabel: "Success", icon: "check" },
    error: { variant: "red", dot: true, defaultLabel: "Error", icon: "x" },
    warning: { variant: "orange", dot: true, defaultLabel: "Warning", icon: "alert" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} animated={animated} icon={config.icon} pulse={config.pulse}>
      {label || config.defaultLabel}
    </Badge>
  );
}

interface CountBadgeProps {
  count: number;
  maxCount?: number;
  variant?: "default" | "purple" | "green" | "red" | "blue";
}

function CountBadge({ count, maxCount = 99, variant = "red" }: CountBadgeProps) {
  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      whileHover={{ scale: 1.1 }}
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
        variant === "default" && "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]",
        variant === "purple" && "bg-[var(--color-purple)] text-white",
        variant === "green" && "bg-green-500 text-white",
        variant === "red" && "bg-red-500 text-white",
        variant === "blue" && "bg-blue-500 text-white"
      )}
    >
      {count > maxCount ? `${maxCount}+` : count}
    </motion.span>
  );
}

export { Badge, StatusBadge, CountBadge };
export type { BadgeProps };