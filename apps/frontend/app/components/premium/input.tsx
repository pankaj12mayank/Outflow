"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "default" | "filled" | "ghost";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      w-full h-11 px-4 text-sm transition-all duration-200
      flex items-center gap-3
      border rounded-lg
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]
    `;

    const variants = {
      default: `
        bg-[rgba(0,0,0,0.4)] border-[var(--color-border)]
        placeholder:text-[var(--color-text-tertiary)]
        focus:border-[var(--color-purple)] focus:ring-[var(--color-purple-dim)]
      `,
      filled: `
        bg-[var(--color-bg-tertiary)] border-[var(--color-border)]
        placeholder:text-[var(--color-text-tertiary)]
        focus:border-[var(--color-purple)] focus:ring-[var(--color-purple-dim)]
      `,
      ghost: `
        bg-transparent border-transparent
        placeholder:text-[var(--color-text-tertiary)]
        focus:bg-[rgba(255,255,255,0.03)] focus:border-[var(--color-border)]
      `,
    };

    const errorStyles = error
      ? "border-[var(--color-error)] focus:ring-[rgba(248,113,113,0.15)]"
      : "";

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              baseStyles,
              variants[variant],
              errorStyles,
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            `w-full min-h-[120px] px-4 py-3 text-sm transition-all duration-200
            bg-[rgba(0,0,0,0.4)] border border-[var(--color-border)] rounded-lg
            placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:border-[var(--color-purple)] focus:ring-2
            focus:ring-[var(--color-purple-dim)] focus:ring-offset-2
            focus:ring-offset-[var(--color-bg-primary)]`,
            error && "border-[var(--color-error)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
export type { InputProps, TextareaProps };