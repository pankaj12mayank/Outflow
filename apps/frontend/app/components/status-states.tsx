import { Loader2, AlertCircle, RefreshCw, Inbox, Search, FileX, Wifi, Server, Mail, Shield } from "lucide-react";
import Link from "next/link";

export function LoadingSpinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} style={{ width: size, height: size }} />;
}

export function LoadingState({ message = "Loading...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <LoadingSpinner size={32} className="text-[var(--color-purple)] mb-4" />
      <p className="text-[var(--color-text-secondary)] text-sm">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse shadow-[var(--shadow-glow-purple)]">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm">Loading Outflo...</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  className = "",
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`} role="status" aria-live="polite">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-glass)] border border-[var(--color-border)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && <p className="text-[var(--color-text-tertiary)] text-sm mb-4 max-w-sm text-center">{description}</p>}
      {action && actionLabel && (
        <button
          onClick={action}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface-glass)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm hover:bg-[var(--color-surface-glass-hover)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  severity = "default",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  severity?: "default" | "critical" | "warning";
}) {
  const configs = {
    default: { icon: AlertCircle, bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
    critical: { icon: AlertCircle, bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
    warning: { icon: AlertCircle, bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400" },
  };
  const c = configs[severity];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 rounded-2xl ${c.bg} border ${c.border}`} role="alert" aria-live="assertive">
      <c.icon className={`w-8 h-8 ${c.text} mb-3`} />
      <h3 className="text-[var(--color-text-primary)] font-semibold mb-1">{title}</h3>
      {description && <p className="text-[var(--color-text-secondary)] text-sm mb-4 text-center max-w-sm">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-surface-glass)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm hover:bg-[var(--color-surface-glass-hover)]"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function RetryState({ onRetry, message = "Operation failed. Please try again." }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <AlertCircle className="w-6 h-6 text-amber-400 mb-3" />
      <p className="text-gray-400 text-sm mb-3">{message}</p>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
        <RefreshCw className="w-4 h-4" /> Try Again
      </button>
    </div>
  );
}

export function NoResultsState({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Search className="w-10 h-10 text-gray-600 mb-4" />
      <h3 className="text-white font-semibold mb-1">No results found</h3>
      <p className="text-gray-500 text-sm mb-3">
        {query ? `No results for "${query}"` : "No items to display"}
      </p>
      {onClear && (
        <button onClick={onClear} className="text-xs text-violet-400 hover:text-violet-300">
          Clear filters
        </button>
      )}
    </div>
  );
}

export function OfflineState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <Wifi className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="text-white font-semibold mb-1">You're offline</h3>
      <p className="text-gray-500 text-sm mb-3">Check your connection and try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10"
      >
        <RefreshCw className="w-4 h-4" /> Reload Page
      </button>
    </div>
  );
}

export function ServiceUnavailableState({ service }: { service: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
        <Server className="w-8 h-8 text-rose-400" />
      </div>
      <h3 className="text-white font-semibold mb-1">{service} unavailable</h3>
      <p className="text-gray-500 text-sm mb-3">This service is temporarily down. Please try again later.</p>
    </div>
  );
}

export function MaintenanceState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
        <Server className="w-8 h-8 text-violet-400 animate-pulse" />
      </div>
      <h3 className="text-white font-semibold mb-1">Under Maintenance</h3>
      <p className="text-gray-500 text-sm">We're updating the system. Please check back soon.</p>
    </div>
  );
}

export function AuthErrorState({ message = "Authentication failed" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-rose-400" />
      </div>
      <h3 className="text-white font-semibold mb-1">Authentication Error</h3>
      <p className="text-gray-500 text-sm mb-4 text-center">{message}</p>
      <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
        Sign In
      </Link>
    </div>
  );
}

export function DataTableEmpty({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      <td colSpan={columns} className="py-12 text-center">
        <FileX className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No data available</p>
      </td>
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3 px-4">
              <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}