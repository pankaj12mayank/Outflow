"use client";

import { forwardRef, HTMLAttributes, ReactNode, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  variant?: "default" | "pills" | "underline" | "segmented" | "bordered";
  size?: "sm" | "md" | "lg";
}

const Tabs = ({ value, onValueChange, children, className, variant = "underline", size = "md" }: TabsProps) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange, variant, size }}>
      <div className={cn("w-full", className)} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
  variant: "default" | "pills" | "underline" | "segmented" | "bordered";
  size: "sm" | "md" | "lg";
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  return useContext(TabsContext);
}

interface TabTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(
  ({ className, value: triggerValue, icon, badge, disabled = false, children, ...props }, ref) => {
    const context = useTabsContext();
    const isSelected = context?.value === triggerValue;
    const variant = context?.variant || "underline";
    const size = context?.size || "md";

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const variants = {
      default: `
        relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        transition-colors duration-200
      `,
      pills: `
        rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        hover:bg-[var(--color-bg-tertiary)] transition-all duration-200
      `,
      underline: `
        relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        transition-colors duration-200
      `,
      segmented: `
        rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        transition-all duration-200
      `,
      bordered: `
        rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        border border-transparent hover:border-[var(--color-border)]
        transition-all duration-200
      `,
    };

    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...safeProps } = props as any;

    return (
      <motion.button
        ref={ref}
        role="tab"
        aria-selected={isSelected}
        data-state={isSelected ? "active" : "inactive"}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => !disabled && context?.onValueChange(triggerValue)}
        className={cn(
          "relative inline-flex items-center gap-2 font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          isSelected && "text-[var(--color-text-primary)]",
          className
        )}
        {...safeProps}
      >
        {icon && (
          <span className={cn(
            "transition-colors duration-200",
            isSelected ? "text-[var(--color-purple)]" : "text-[var(--color-text-tertiary)]"
          )}>
            {icon}
          </span>
        )}
        <span>{children}</span>
        
        {badge && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "px-1.5 py-0.5 rounded-full text-xs font-medium",
              isSelected 
                ? "bg-[var(--color-purple)] text-white" 
                : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
            )}
          >
            {badge}
          </motion.span>
        )}

        {variant === "underline" && isSelected && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-purple)]"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          />
        )}

        {variant === "segmented" && isSelected && (
          <motion.div
            layoutId="activeSegment"
            className="absolute inset-0 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-sm"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          />
        )}

        {variant === "pills" && isSelected && (
          <motion.div
            layoutId="activePill"
            className="absolute inset-0 bg-[var(--color-purple-dim)] border border-[var(--color-purple)]/30 rounded-lg"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </motion.button>
    );
  }
);

TabTrigger.displayName = "TabTrigger";

interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  scrollable?: boolean;
}

const TabList = forwardRef<HTMLDivElement, TabListProps>(
  ({ className, children, scrollable = false, ...props }, ref) => {
    const context = useTabsContext();
    const variant = context?.variant || "underline";
    const size = context?.size || "md";

    const variantStyles = {
      default: "border-b border-[var(--color-border)]",
      pills: "bg-[var(--color-bg-tertiary)] p-1 rounded-xl",
      underline: "border-b border-[var(--color-border)]",
      segmented: "bg-[var(--color-bg-tertiary)] p-1 rounded-xl",
      bordered: "",
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "flex items-center gap-1",
          variantStyles[variant],
          scrollable && "overflow-x-auto scrollbar-thin pb-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabList.displayName = "TabList";

interface TabContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  keepAlive?: boolean;
}

const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
  ({ className, value: contentValue, keepAlive = false, children, ...props }, ref) => {
    const context = useTabsContext();
    const isVisible = context?.value === contentValue;

    if (!isVisible && !keepAlive) return null;

    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;

    return (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            ref={ref}
            role="tabpanel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn("outline-none", className)}
            {...restProps}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

TabContent.displayName = "TabContent";

interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className, label, icon, children, ...props }, ref) => {
    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...safeProps } = props as any;
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("py-4", className)}
        {...safeProps}
      >
        {children}
      </motion.div>
    );
  }
);

TabPanel.displayName = "TabPanel";

export { Tabs, TabList, TabTrigger, TabContent, TabPanel };
export type { TabsProps, TabTriggerProps, TabContentProps, TabPanelProps };