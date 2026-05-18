"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { LucideIcon } from "lucide-react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "bordered" | "gradient";
  glow?: "none" | "purple" | "green" | "blue" | "sm";
  hover?: boolean;
  interactive?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", glow = "none", hover = false, interactive = false, icon: Icon, iconColor, badge, footer, children, ...props }, ref) => {
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
      gradient: `
        bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]
        border border-[var(--color-border)]
      `,
    };

    const glows = {
      none: "",
      purple: "shadow-[0_0_60px_rgba(167,139,250,0.3)]",
      green: "shadow-[0_0_60px_rgba(74,222,128,0.3)]",
      blue: "shadow-[0_0_60px_rgba(96,165,250,0.3)]",
      sm: "shadow-[0_0_30px_rgba(167,139,250,0.2)]",
    };

    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], glows[glow], className)}
        whileHover={interactive || hover ? { y: -4, scale: 1.01 } : {}}
        transition={{ duration: 0.2 }}
        {...restProps}
      >
        {variant === "glass" && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
          </div>
        )}
        
        {Icon && (
          <div className={cn(
            "absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center",
            iconColor ? `bg-[${iconColor}]/20` : "bg-[var(--color-purple-dim)]"
          )}>
            <Icon className={cn("w-5 h-5", iconColor || "text-[var(--color-purple)]")} />
          </div>
        )}
        
        {badge && (
          <div className="absolute top-4 right-4">
            {badge}
          </div>
        )}
        
        <div className="relative z-10">{children}</div>
        
        {footer && (
          <div className="border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-tertiary)]">
            {footer}
          </div>
        )}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, icon: Icon, badge, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-5 border-b border-[var(--color-border)]", className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-[var(--color-purple-dim)]">
              <Icon className="w-5 h-5 text-[var(--color-purple)]" />
            </div>
          )}
          <div>{children}</div>
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {action}
        </div>
      </div>
    </div>
  )
);

CardHeader.displayName = "CardHeader";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, scrollable = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6", scrollable && "max-h-[400px] overflow-y-auto scrollbar-thin", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  layout?: "left" | "center" | "right" | "between";
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, layout = "right", children, ...props }, ref) => {
    const layouts = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn("px-6 py-4 border-t border-[var(--color-border)] flex gap-3", layouts[layout], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  description?: string;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as = "h3", description, children, ...props }, ref) => {
    const Tag = as;
    return (
      <>
        <Tag
          ref={ref}
          className={cn("text-lg font-semibold text-[var(--color-text-primary)]", className)}
          {...props}
        >
          {children}
        </Tag>
        {description && <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>}
      </>
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

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  sparklineData?: number[];
  variant?: "default" | "gradient" | "glass";
  className?: string;
}

function StatCard({ label, value, change, changeLabel, icon: Icon, trend, sparklineData, variant = "default", className }: StatCardProps) {
  const isPositive = trend === "up" || (change !== undefined && change > 0);
  const iconColors = {
    purple: "#a78bfa",
    green: "#4ade80",
    blue: "#60a5fa",
    yellow: "#fbbf24",
    red: "#f87171",
  };

  const variantStyles = {
    default: "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
    gradient: "bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] border border-[var(--color-border)]",
    glass: "bg-[rgba(24,24,27,0.8)] backdrop-blur-xl border border-[var(--color-border)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(variantStyles[variant], "rounded-2xl p-5", className)}
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-[var(--color-purple-dim)]">
            <Icon className="w-5 h-5 text-[var(--color-purple)]" />
          </div>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
          )}>
            {trend === "up" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === "down" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{value}</div>
      <div className="text-sm text-[var(--color-text-tertiary)]">{label}</div>
      {change !== undefined && (
        <div className={cn(
          "text-xs mt-2 font-medium",
          isPositive ? "text-green-400" : "text-red-400"
        )}>
          {isPositive ? "+" : ""}{change}%{changeLabel && ` ${changeLabel}`}
        </div>
      )}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-8">
          <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none">
            <path
              d={`M0,32 ${sparklineData.map((v, i) => `L${(i / (sparklineData.length - 1)) * 100},${32 - (v / Math.max(...sparklineData)) * 28}`).join(" ")} L100,32`}
              fill="none"
              stroke={isPositive ? "#4ade80" : "#f87171"}
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription, StatCard };
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps, CardTitleProps, CardDescriptionProps };