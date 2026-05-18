"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { X, Grip, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  position?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showResize?: boolean;
  footer?: ReactNode;
}

const Drawer = ({
  isOpen,
  onClose,
  children,
  className,
  position = "right",
  size = "md",
  title,
  subtitle,
  showHeader = true,
  showResize = false,
  footer,
}: DrawerProps) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const positions = {
    left: "left-0 top-0 h-full rounded-r-2xl",
    right: "right-0 top-0 h-full rounded-l-2xl",
    top: "top-0 left-0 w-full rounded-b-2xl",
    bottom: "bottom-0 left-0 w-full rounded-t-2xl",
  };

  const sizes = {
    sm: position === "left" || position === "right" ? "max-w-sm" : "max-h-64",
    md: position === "left" || position === "right" ? "max-w-md" : "max-h-96",
    lg: position === "left" || position === "right" ? "max-w-lg" : "max-h-[32rem]",
    xl: position === "left" || position === "right" ? "max-w-xl" : "max-h-[42rem]",
    full: "w-full h-full",
  };

  const slideVariants = {
    left: {
      initial: { x: "-100%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "-100%", opacity: 0 },
    },
    right: {
      initial: { x: "100%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 },
    },
    top: {
      initial: { y: "-100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "-100%", opacity: 0 },
    },
    bottom: {
      initial: { y: "100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "100%", opacity: 0 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={slideVariants[position].initial}
            animate={isMaximized ? { x: 0, y: 0 } : slideVariants[position].animate}
            exit={slideVariants[position].exit}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
              "shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7)]",
              isMaximized ? "inset-0 rounded-none" : cn(positions[position], sizes[size]),
              className
            )}
          >
            {showHeader && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-purple-dim)] flex items-center justify-center">
                    <Grip className="w-4 h-4 text-[var(--color-purple)]" />
                  </div>
                  <div>
                    {title && <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>}
                    {subtitle && <p className="text-sm text-[var(--color-text-tertiary)]">{subtitle}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showResize && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}

            <div className="h-[calc(100%-var(--header-height,80px))] overflow-y-auto">
              {children}
            </div>

            {footer && (
              <div className="border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-tertiary)]">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { Drawer };
export type { DrawerProps };