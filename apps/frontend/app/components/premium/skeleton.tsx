"use client";

import { cn } from "@/app/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = "text", width, height }: SkeletonProps) {
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[var(--color-bg-tertiary)]",
        "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent",
        "after:animate-shimmer",
        variants[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

interface SkeletonGroupProps {
  count?: number;
  spacing?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
}

export function SkeletonGroup({ count = 3, spacing = "md", children }: SkeletonGroupProps) {
  const spacingSizes = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  if (children) {
    return <div className={cn(spacingSizes[spacing])}>{children}</div>;
  }

  return (
    <div className={cn(spacingSizes[spacing])}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="80%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 space-y-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={80} variant="rectangular" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rectangular" />
        <Skeleton width={80} height={32} variant="rectangular" />
      </div>
    </div>
  );
}