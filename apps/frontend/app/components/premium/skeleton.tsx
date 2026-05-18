"use client";

import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className, variant = "text", width, height }: SkeletonProps) {
  const variants = {
    text: "h-4 rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-2xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "bg-gradient-to-r from-[var(--color-bg-tertiary)] via-[var(--color-bg-elevated)] to-[var(--color-bg-tertiary)] bg-[length:200%_100%]",
        "animate-shimmer",
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
  variant?: "lines" | "cards" | "avatar";
}

export function SkeletonGroup({ count = 3, spacing = "md", children, className, variant = "lines" }: SkeletonGroupProps) {
  const spacingSizes = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  if (children) {
    return <div className={cn(spacingSizes[spacing], className)}>{children}</div>;
  }

  const variants = {
    lines: (
      <div className="space-y-2">
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
      </div>
    ),
    cards: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-32" />
        <Skeleton variant="card" className="h-32" />
      </div>
    ),
    avatar: (
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
    ),
  };

  return (
    <div className={cn(spacingSizes[spacing])}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{variants[variant]}</div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl"
    >
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
    </motion.div>
  );
}

interface PageSkeletonProps {
  title?: boolean;
  description?: boolean;
  stats?: number;
  chart?: boolean;
  table?: boolean;
  tableRows?: number;
  sidebar?: boolean;
}

export function PageSkeleton({
  title = true,
  description = true,
  stats = 4,
  chart = true,
  table = false,
  tableRows = 5,
  sidebar = false,
}: PageSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {sidebar && (
        <div className="fixed left-0 top-0 w-64 h-screen bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] p-4">
          <div className="space-y-6">
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-xl" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={40} variant="rectangular" className="rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={cn(sidebar && "pl-64")}>
        {title && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="space-y-2">
                {description && <Skeleton width={200} height={24} />}
                {description && <Skeleton width={150} height={14} />}
              </div>
            </div>
            <Skeleton width={120} height={40} variant="rectangular" />
          </div>
        )}

        {stats > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: stats }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Skeleton width={60} height={24} variant="rectangular" />
                </div>
                <Skeleton width="60%" height={28} />
                <Skeleton width="40%" height={14} />
              </motion.div>
            ))}
          </div>
        )}

        {chart && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-2 p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl"
            >
              <Skeleton width={200} height={20} className="mb-4" />
              <Skeleton width="100%" height={200} variant="rectangular" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl space-y-4"
            >
              <Skeleton width={150} height={20} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton width={60} height={14} />
                  <div className="flex-1">
                    <Skeleton width="100%" height={24} variant="rectangular" />
                  </div>
                  <Skeleton width={40} height={14} />
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {table && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <Skeleton width={200} height={20} />
              <div className="flex gap-2">
                <Skeleton width={100} height={36} variant="rectangular" />
                <Skeleton width={100} height={36} variant="rectangular" />
              </div>
            </div>
            <div className="border-b border-[var(--color-border)] pb-4 mb-4">
              <div className="flex gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width={100} height={12} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: tableRows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton width="30%" height={14} />
                  <Skeleton width="20%" height={14} />
                  <Skeleton width="15%" height={14} />
                  <Skeleton width={80} height={28} variant="rectangular" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton variant="circular" width={40} height={40} />
          </div>
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={14} />
        </motion.div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={200} height={20} />
        <Skeleton width={80} height={32} variant="rectangular" />
      </div>
      <Skeleton width="100%" height={height} variant="rectangular" />
    </motion.div>
  );
}

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  hasActions?: boolean;
}

export function TableSkeleton({ columns = 5, rows = 5, hasActions = true }: TableSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <Skeleton width={150} height={20} />
          <div className="flex gap-2">
            <Skeleton width={100} height={36} variant="rectangular" />
            <Skeleton width={100} height={36} variant="rectangular" />
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-12 gap-4 mb-4 pb-4 border-b border-[var(--color-border)]">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className={cn("col-span-1", i === 0 && "col-span-2")}>
              <Skeleton width="80%" height={12} />
            </div>
          ))}
          {hasActions && <div className="col-span-1" />}
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-12 gap-4 items-center"
            >
              {Array.from({ length: columns }).map((_, j) => (
                <div key={j} className={cn("col-span-1", j === 0 && "col-span-2")}>
                  {j === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton width="80%" height={14} />
                    </div>
                  ) : (
                    <Skeleton width="80%" height={14} />
                  )}
                </div>
              ))}
              {hasActions && (
                <div className="col-span-1 flex justify-end">
                  <Skeleton width={24} height={24} variant="rectangular" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
        <Skeleton width={200} height={14} />
        <div className="flex items-center gap-2">
          <Skeleton width={80} height={32} variant="rectangular" />
          <Skeleton width={80} height={32} variant="rectangular" />
        </div>
      </div>
    </motion.div>
  );
}

interface FormSkeletonProps {
  fields?: number;
  rows?: number;
}

export function FormSkeleton({ fields = 4, rows = 1 }: FormSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl space-y-4">
          <Skeleton width={200} height={20} className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: fields }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="space-y-2"
              >
                <Skeleton width={100} height={14} />
                <Skeleton width="100%" height={44} variant="rectangular" />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3">
        <Skeleton width={100} height={40} variant="rectangular" />
        <Skeleton width={100} height={40} variant="rectangular" />
      </div>
    </motion.div>
  );
}

interface DashboardSkeletonProps {
  tabs?: boolean;
  sidebar?: boolean;
}

export function DashboardSkeleton({ tabs = true, sidebar = false }: DashboardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--color-bg-primary)]"
    >
      <div className={cn(sidebar && "pl-64")}>
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={40} height={40} className="rounded-xl" />
                <div className="space-y-2">
                  <Skeleton width={200} height={24} />
                  <Skeleton width={150} height={14} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton width={120} height={32} variant="rectangular" />
                <Skeleton width={100} height={32} variant="rectangular" />
              </div>
            </div>
            
            {tabs && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width={100} height={40} variant="rectangular" className="rounded-xl" />
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          <PageSkeleton stats={8} chart={true} />
        </div>
      </div>
    </motion.div>
  );
}