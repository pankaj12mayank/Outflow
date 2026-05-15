"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "bordered";
  glow?: "none" | "purple" | "green" | "sm";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", glow = "none", hover = false, children, ...props }, ref) => {
    const baseStyles = `
      relative overflow-hidden
      rounded-xl
      transition-all duration-300
    `;

    const variants = {
      default: `
        bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
      `,
      glass: `
        bg-[rgba(24,24,27,0.8)] backdrop-blur-xl
        border border-[var(--color-border)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
      `,
      elevated: `
        bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]
      `,
      bordered: `
        bg-transparent border border-[var(--color-border-strong)]
      `,
    };

    const glows = {
      none: "",
      purple: "shadow-[0_0_60px_rgba(167,139,250,0.3)]",
      green: "shadow-[0_0_60px_rgba(74,222,128,0.3)]",
      sm: "shadow-[0_0_30px_rgba(167,139,250,0.2)]",
    };

    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], glows[glow], className)}
        whileHover={hover ? { y: -4, scale: 1.01 } : {}}
        transition={{ duration: 0.2 }}
        {...restProps}
      >
        {variant === "glass" && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
          </div>
        )}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-5 border-b border-[var(--color-border)]", className)}
      {...props}
    />
  )
);

CardHeader.displayName = "CardHeader";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
  )
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4 border-t border-[var(--color-border)]", className)}
      {...props}
    />
  )
);

CardFooter.displayName = "CardFooter";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as = "h3", children, ...props }, ref) => {
    const Tag = as;
    return (
      <Tag
        ref={ref}
        className={cn("text-lg font-semibold text-[var(--color-text-primary)]", className)}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-[var(--color-text-secondary)] mt-1", className)}
      {...props}
    />
  )
);

CardDescription.displayName = "CardDescription";

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps, CardTitleProps, CardDescriptionProps };