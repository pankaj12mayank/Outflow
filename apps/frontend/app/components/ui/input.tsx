import * as React from "react";
import { cn } from "@/app/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-[rgba(0,0,0,0.4)] px-4 py-2 text-sm text-[var(--color-text-primary)] transition-all duration-200",
          "placeholder:text-[var(--color-text-tertiary)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus:outline-none focus:ring-0",
          error
            ? "border-[var(--color-error)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]"
            : "border-[var(--color-border)] focus:border-[var(--color-purple)] focus:shadow-[0_0_0_3px_var(--color-purple-dim),0_0_20px_rgba(167,139,250,0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[rgba(0,0,0,0.2)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };