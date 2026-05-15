"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  position?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const Drawer = ({
  isOpen,
  onClose,
  children,
  className,
  position = "right",
  size = "md",
}: DrawerProps) => {
  const positions = {
    left: "left-0 top-0 h-full",
    right: "right-0 top-0 h-full",
    top: "top-0 left-0 w-full",
    bottom: "bottom-0 left-0 w-full",
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
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
    },
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
    },
    top: {
      initial: { y: "-100%" },
      animate: { y: 0 },
      exit: { y: "-100%" },
    },
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={slideVariants[position].initial}
            animate={slideVariants[position].animate}
            exit={slideVariants[position].exit}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed z-[var(--z-modal)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
              "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]",
              positions[position],
              sizes[size],
              className
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-4 top-4 z-10"
            >
              <X className="w-4 h-4" />
            </Button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { Drawer };
export type { DrawerProps };