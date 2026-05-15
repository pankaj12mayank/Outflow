"use client";

import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "purple" | "green" | "orange" | "red" | "blue" | "outline";
  size?: "sm" | "md" | "lg";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", children, ...props }, ref) => {
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
      outline: `
        bg-transparent text-[var(--color-text-secondary)]
        border border-[var(--color-border)]
      `,
    };

    const sizes = {
      sm: "px-2.5 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-1.5 text-base",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps };