"use client";

import { forwardRef, HTMLAttributes, ReactNode, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  return (
    <div className={cn("w-full", className)} role="tablist">
      {children}
    </div>
  );
};

interface TabTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  isActive?: boolean;
  icon?: ReactNode;
}

const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(
  ({ className, value: triggerValue, isActive, icon, children, ...props }, ref) => {
    const tabsContext = useTabsContext();
    const isSelected = tabsContext?.value === triggerValue;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isSelected}
        data-state={isSelected ? "active" : "inactive"}
        className={cn(
          `relative px-4 py-2.5 text-sm font-medium transition-all duration-200
          text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
          after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5
          after:bg-transparent after:rounded-full`,
          isSelected && "text-[var(--color-text-primary)]",
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2">
          {icon}
          {children}
        </span>
        {isSelected && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-purple)]"
            transition={{ duration: 0.2 }}
          />
        )}
      </button>
    );
  }
);

TabTrigger.displayName = "TabTrigger";

interface TabContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
  ({ className, value: contentValue, children, ...props }, ref) => {
    const tabsContext = useTabsContext();
    if (tabsContext?.value !== contentValue) return null;

    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;

    return (
      <motion.div
        ref={ref}
        role="tabpanel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={cn("pt-4", className)}
        {...restProps}
      >
        {children}
      </motion.div>
    );
  }
);

TabContent.displayName = "TabContent";

export { Tabs, TabTrigger, TabContent };

// Context for tabs state
interface TabsContextType {
  value: string;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  return useContext(TabsContext);
}

export type { TabsProps, TabTriggerProps, TabContentProps };