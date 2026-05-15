"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "glow" | "glow-green";
  size?: "sm" | "md" | "lg" | "xl" | "icon";
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-[var(--color-purple)] text-white
        hover:bg-[var(--color-purple-muted)]
        active:scale-[0.98]
      `,
      secondary: `
        bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]
        hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-hover)]
        active:scale-[0.98]
      `,
      ghost: `
        bg-transparent text-[var(--color-text-secondary)]
        hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--color-text-primary)]
        active:scale-[0.98]
      `,
      outline: `
        bg-transparent border border-[var(--color-border)] text-[var(--color-text-primary)]
        hover:bg-[rgba(255,255,255,0.03)] hover:border-[var(--color-border-hover)]
        active:scale-[0.98]
      `,
      glow: `
        bg-gradient-to-r from-[var(--color-purple-muted)] to-[var(--color-purple)] text-white
        shadow-[0_0_30px_rgba(167,139,250,0.4)]
        hover:shadow-[0_0_50px_rgba(167,139,250,0.5)]
        hover:-translate-y-0.5
        active:scale-[0.98] active:shadow-[0_0_20px_rgba(167,139,250,0.3)]
      `,
      "glow-green": `
        bg-gradient-to-r from-[var(--color-green-muted)] to-[var(--color-green)] text-white
        shadow-[0_0_30px_rgba(74,222,128,0.4)]
        hover:shadow-[0_0_50px_rgba(74,222,128,0.5)]
        hover:-translate-y-0.5
        active:scale-[0.98] active:shadow-[0_0_20px_rgba(74,222,128,0.3)]
      `,
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-10 px-4 text-sm rounded-lg gap-2",
      lg: "h-12 px-6 text-base rounded-lg gap-2",
      xl: "h-14 px-8 text-lg rounded-xl gap-3",
      icon: "h-10 w-10 rounded-lg",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };