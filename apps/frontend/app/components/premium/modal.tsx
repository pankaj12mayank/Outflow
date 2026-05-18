"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "compact";
  showClose?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  animation?: "scale" | "slide" | "fade" | "flip";
  type?: "default" | "success" | "warning" | "error" | "info";
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  scale: {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
  },
  slide: {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  flip: {
    hidden: { opacity: 0, rotateX: 90, transformOrigin: "center bottom" },
    visible: { opacity: 1, rotateX: 0 },
    exit: { opacity: 0, rotateX: 90 },
  },
};

const Modal = ({
  isOpen,
  onClose,
  children,
  className,
  size = "md",
  showClose = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  animation = "scale",
  type = "default",
}: ModalProps) => {
  const sizes = {
    compact: "max-w-sm",
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-4xl",
  };

  const typeStyles = {
    default: "",
    success: "border-green-500/30 shadow-[0_0_60px_rgba(74,222,128,0.15)]",
    warning: "border-yellow-500/30 shadow-[0_0_60px_rgba(251,191,36,0.15)]",
    error: "border-red-500/30 shadow-[0_0_60px_rgba(248,113,113,0.15)]",
    info: "border-blue-500/30 shadow-[0_0_60px_rgba(96,165,250,0.15)]",
  };

  const typeIcons = {
    default: null,
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={closeOnOverlay ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            variants={modalVariants[animation]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full"
          >
            <div
              className={cn(
                "relative mx-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
                "rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]",
                "overflow-hidden",
                sizes[size],
                typeStyles[type],
                className
              )}
            >
              {type !== "default" && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />
              )}
              
              {showClose && (
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute right-4 top-4 z-10 p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-all"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
              
              {typeIcons[type] && (
                <div className="absolute right-12 top-4 z-10">
                  {typeIcons[type]}
                </div>
              )}
              
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, icon, badge, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 pt-6 pb-4", className)}
      {...props}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="p-2.5 rounded-xl bg-[var(--color-purple-dim)] text-[var(--color-purple)]">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {badge && <div>{badge}</div>}
      </div>
    </div>
  )
);
ModalHeader.displayName = "ModalHeader";

interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, scrollable = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-6 pb-4",
        scrollable && "max-h-[60vh] overflow-y-auto scrollbar-thin",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ModalContent.displayName = "ModalContent";

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  layout?: "left" | "center" | "right" | "between";
  sticky?: boolean;
}

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, layout = "right", sticky = false, children, ...props }, ref) => {
    const layouts = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "px-6 py-4 border-t border-[var(--color-border)] flex gap-3",
          layouts[layout],
          sticky && "sticky bottom-0 bg-[var(--color-bg-secondary)] backdrop-blur-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ModalFooter.displayName = "ModalFooter";

interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
  description?: string;
}

const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, as = "h2", description, children, ...props }, ref) => {
    const Tag = as;
    return (
      <>
        <Tag ref={ref} className={cn("text-xl font-semibold text-[var(--color-text-primary)]", className)} {...props}>
          {children}
        </Tag>
        {description && <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>}
      </>
    );
  }
);
ModalTitle.displayName = "ModalTitle";

interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--color-text-secondary)] mt-1", className)} {...props} />
  )
);
ModalDescription.displayName = "ModalDescription";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
  isLoading?: boolean;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  const variants = {
    default: {
      button: "primary",
      icon: null,
    },
    danger: {
      button: "bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(248,113,113,0.3)]",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    warning: {
      button: "bg-yellow-500 hover:bg-yellow-600 shadow-[0_0_30px_rgba(251,191,36,0.3)]",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="compact" type={variant === "danger" ? "error" : variant === "warning" ? "warning" : "default"}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        {description && <ModalDescription>{description}</ModalDescription>}
      </ModalHeader>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          className={variants[variant].button}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

import { useEffect } from "react";

export {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ConfirmModal,
};

export const Dialog = Modal;
export const DialogContent = ModalContent;
export const DialogHeader = ModalHeader;
export const DialogTitle = ModalTitle;
export const DialogFooter = ModalFooter;
export type {
  ModalProps,
  ModalHeaderProps,
  ModalContentProps,
  ModalFooterProps,
  ModalTitleProps,
  ModalDescriptionProps,
};