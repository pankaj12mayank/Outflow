"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  X, 
  ChevronRight,
  LucideIcon
} from "lucide-react";

interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart'> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  title?: string;
  description?: string;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, description, icon: Icon, dismissible = false, onDismiss, action, children, ...props }, ref) => {
    const variants = {
      default: {
        container: "bg-[var(--color-bg-secondary)] border-[var(--color-border)]",
        icon: "text-[var(--color-text-secondary)]",
        title: "text-[var(--color-text-primary)]",
        description: "text-[var(--color-text-secondary)]",
        iconBg: "bg-[var(--color-bg-tertiary)]",
      },
      success: {
        container: "bg-green-500/5 border-green-500/20",
        icon: "text-green-400",
        title: "text-green-400",
        description: "text-green-400/80",
        iconBg: "bg-green-500/10",
      },
      warning: {
        container: "bg-yellow-500/5 border-yellow-500/20",
        icon: "text-yellow-400",
        title: "text-yellow-400",
        description: "text-yellow-400/80",
        iconBg: "bg-yellow-500/10",
      },
      error: {
        container: "bg-red-500/5 border-red-500/20",
        icon: "text-red-400",
        title: "text-red-400",
        description: "text-red-400/80",
        iconBg: "bg-red-500/10",
      },
      info: {
        container: "bg-blue-500/5 border-blue-500/20",
        icon: "text-blue-400",
        title: "text-blue-400",
        description: "text-blue-400/80",
        iconBg: "bg-blue-500/10",
      },
    };

    const icons = {
      default: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: AlertCircle,
      info: Info,
    };

    const IconComponent = Icon || icons[variant];
    const styles = variants[variant];

    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...safeProps } = props as any;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "relative flex items-start gap-4 p-4 rounded-xl border",
          styles.container,
          className
        )}
        {...safeProps}
      >
        <div className={cn("p-2 rounded-lg flex-shrink-0", styles.iconBg)}>
          <IconComponent className={cn("w-5 h-5", styles.icon)} />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn("text-sm font-semibold mb-1", styles.title)}>
              {title}
            </h4>
          )}
          {(description || children) && (
            <div className={cn("text-sm", styles.description)}>
              {description}
              {children}
            </div>
          )}
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}

        {dismissible && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>
    );
  }
);

Alert.displayName = "Alert";

interface AlertBannerProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

function AlertBanner({ 
  variant = "info", 
  title, 
  description, 
  action, 
  dismissible = false, 
  onDismiss, 
  className 
}: AlertBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn("w-full", className)}
      >
        <Alert variant={variant} dismissible={dismissible} onDismiss={onDismiss}>
          <div className="flex items-center justify-between w-full">
            <div>
              {title && <h4 className="font-semibold text-sm">{title}</h4>}
              {description && <p className="text-sm opacity-80">{description}</p>}
            </div>
            {action && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.onClick}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
              >
                {action.label}
              </motion.button>
            )}
          </div>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}

interface ToastProps {
  id: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  title?: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function Toast({ variant = "default", title, description, action }: ToastProps) {
  const variants = {
    default: "border-[var(--color-border)]",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    error: "border-red-500/30 bg-red-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };

  const icons = {
    default: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  };

  const IconComponent = icons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-xl border bg-[var(--color-bg-secondary)] shadow-xl",
        variants[variant]
      )}
    >
      <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)]">
        <IconComponent className="w-5 h-5 text-[var(--color-text-primary)]" />
      </div>
      
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h4>}
        {description && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</p>}
      </div>

      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

export { Alert, AlertBanner, Toast };
export type { AlertProps, AlertBannerProps, ToastProps };