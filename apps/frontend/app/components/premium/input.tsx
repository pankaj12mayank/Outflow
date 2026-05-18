"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Eye, EyeOff, Search, X } from "lucide-react";
import { useState } from "react";

interface InputProps extends Omit<HTMLMotionProps<"input">, "children"> {
  variant?: "default" | "filled" | "underline" | "minimal";
  inputSize?: "sm" | "md" | "lg";
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = "default",
      inputSize = "md",
      error = false,
      success = false,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      showPasswordToggle = false,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    const variants = {
      default: `
        bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
        placeholder:text-[var(--color-text-muted)]
      `,
      filled: `
        bg-[rgba(0,0,0,0.3)] border border-transparent
        placeholder:text-[var(--color-text-tertiary)]
      `,
      underline: `
        bg-transparent border-b border-[var(--color-border)] rounded-none
        placeholder:text-[var(--color-text-muted)]
        focus:border-[var(--color-purple)]
      `,
      minimal: `
        bg-transparent border border-transparent
        placeholder:text-[var(--color-text-tertiary)]
        hover:border-[var(--color-border)]
      `,
    };

    const sizes = {
      sm: "h-9 px-3 text-xs rounded-md",
      md: "h-11 px-4 text-sm rounded-xl",
      lg: "h-14 px-5 text-base rounded-xl",
    };

    const stateStyles = error
      ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
      : success
      ? "border-green-500/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
      : "focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple-dim)] focus:shadow-[0_0_0_4px_rgba(167,139,250,0.1)]";

    return (
      <motion.div
        ref={ref as any}
        className="relative"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] z-10">
              {leftIcon}
            </div>
          )}
          
          <motion.input
            type={isPassword && showPassword ? "text" : type}
            className={cn(
              "w-full transition-all duration-200",
              "text-[var(--color-text-primary)]",
              "outline-none disabled:opacity-50 disabled:cursor-not-allowed",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              variants[variant],
              sizes[inputSize],
              stateStyles,
              leftIcon && "pl-10",
              (rightIcon || clearable || (isPassword && showPasswordToggle)) && "pr-10",
              className
            )}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
            {...(props as any)}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {clearable && props.value && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClear}
                className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
            
            {isPassword && showPasswordToggle && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            )}
            
            {!clearable && !isPassword && rightIcon && (
              <span className="text-[var(--color-text-tertiary)]">{rightIcon}</span>
            )}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-400"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "filled" | "minimal";
  autoResize?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = "default", autoResize = false, ...props }, ref) => {
    const variants = {
      default: `
        bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
        placeholder:text-[var(--color-text-muted)]
      `,
      filled: `
        bg-[rgba(0,0,0,0.3)] border border-transparent
        placeholder:text-[var(--color-text-tertiary)]
      `,
      minimal: `
        bg-transparent border border-transparent
        placeholder:text-[var(--color-text-tertiary)]
        focus:border-[var(--color-border)]
      `,
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        e.currentTarget.style.height = "auto";
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
      }
    };

    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...safeProps } = props as any;

    return (
      <motion.textarea
        ref={ref}
        className={cn(
          "w-full min-h-[100px] px-4 py-3 text-sm rounded-xl resize-none",
          "text-[var(--color-text-primary)]",
          "transition-all duration-200",
          "outline-none focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple-dim)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          className
        )}
        whileFocus={{ scale: 1.005 }}
        transition={{ duration: 0.15 }}
        onInput={handleInput}
        {...safeProps}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
export type { InputProps, TextareaProps };