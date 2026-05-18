"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  separator?: React.ReactNode;
  children: React.ReactNode;
}

const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, separator = "/", children, ...props }, ref) => (
    <nav ref={ref} aria-label="breadcrumb" className={cn("flex items-center gap-2 text-sm", className)} {...props}>
      {children}
    </nav>
  )
);
Breadcrumb.displayName = "Breadcrumb";

interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
  href?: string;
  isActive?: boolean;
  isCurrentPage?: boolean;
  separator?: React.ReactNode;
}

const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, href, isActive = false, isCurrentPage = false, children, separator = "/", ...props }, ref) => (
    <li ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
      {href && !isActive ? (
        <a
          href={href}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {children}
        </a>
      ) : (
        <span
          className={cn(
            isActive ? "text-[var(--color-text-primary)] font-medium" : "text-[var(--color-text-tertiary)]",
            isCurrentPage && "cursor-default"
          )}
          aria-current={isCurrentPage ? "page" : undefined}
        >
          {children}
        </span>
      )}
      {!isActive && (
        <span className="text-[var(--color-text-muted)]">{separator}</span>
      )}
    </li>
  )
);
BreadcrumbItem.displayName = "BreadcrumbItem";

interface BreadcrumbSeparatorProps extends HTMLAttributes<HTMLSpanElement> {}

const BreadcrumbSeparator = forwardRef<HTMLSpanElement, BreadcrumbSeparatorProps>(
  ({ className, children, ...props }, ref) => (
    <span ref={ref} className={cn("text-[var(--color-text-muted)]", className)} {...props}>
      {children || "/"}
    </span>
  )
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator };
export type { BreadcrumbProps, BreadcrumbItemProps, BreadcrumbSeparatorProps };