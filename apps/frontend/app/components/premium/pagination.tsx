"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblings?: number;
  boundaries?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  showFirstLast = true,
  showPrevNext = true,
  className,
}: PaginationProps) {
  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const paginationRange = usePagination({
    currentPage,
    totalPages,
    siblingsCount: siblings,
    boundariesCount: boundaries,
  });

  if (totalPages <= 1) return null;

  const firstPage = 1;
  const lastPage = totalPages;

  return (
    <nav
      aria-label="pagination"
      className={cn("flex items-center gap-2", className)}
    >
      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(firstPage)}
          disabled={currentPage === firstPage}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </PaginationButton>
      )}

      {showPrevNext && (
        <PaginationButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === firstPage}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </PaginationButton>
      )}

      <div className="flex items-center gap-1">
        {paginationRange.map((page, index) => {
          if (page === -1) {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-[var(--color-text-muted)]"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }

          return (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPageChange(page as number)}
              className={cn(
                "min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                currentPage === page
                  ? "bg-[var(--color-purple)] text-white shadow-[0_0_20px_rgba(167,139,250,0.3)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              )}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </motion.button>
          );
        })}
      </div>

      {showPrevNext && (
        <PaginationButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </PaginationButton>
      )}

      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(lastPage)}
          disabled={currentPage === lastPage}
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </PaginationButton>
      )}
    </nav>
  );
}

interface PaginationButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

function PaginationButton({
  children,
  onClick,
  disabled,
  className,
  "aria-label": ariaLabel,
}: PaginationButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "p-2 rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-tertiary)]",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

function usePagination({
  currentPage,
  totalPages,
  siblingsCount = 1,
  boundariesCount = 1,
}: {
  currentPage: number;
  totalPages: number;
  siblingsCount?: number;
  boundariesCount?: number;
}) {
  const generateRange = (start: number, end: number) => {
    return range(start, end);
  };

  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const getPaginationRange = () => {
    const totalPageNumbers = siblingsCount * 2 + boundariesCount * 2 + 3;

    if (totalPageNumbers >= totalPages) {
      return generateRange(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingsCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingsCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > boundariesCount + 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - (boundariesCount + 1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = generateRange(1, boundariesCount + siblingsCount + 1);
      return [...leftRange, -1, ...generateRange(totalPages - boundariesCount, totalPages)];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = generateRange(totalPages - (boundariesCount + siblingsCount + 1) + 1, totalPages);
      return [...generateRange(1, boundariesCount), -1, ...rightRange];
    }

    const middleRange = generateRange(leftSiblingIndex, rightSiblingIndex);
    return [
      ...generateRange(1, boundariesCount),
      -1,
      ...middleRange,
      -1,
      ...generateRange(totalPages - boundariesCount + 1, totalPages),
    ];
  };

  return getPaginationRange();
}

export { Pagination };
export type { PaginationProps };