"use client";

import { forwardRef, HTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Check, AlertCircle } from "lucide-react";
import { useState } from "react";

type SortDirection = "asc" | "desc" | null;

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  hoverable?: boolean;
  striped?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  hoverable = true,
  striped = false,
  emptyMessage = "No data available",
  loading = false,
  className,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedRows.has(String(row.id)));

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    if (sortDirection === "asc") return <ChevronUp className="w-4 h-4 text-[var(--color-purple)]" />;
    return <ChevronDown className="w-4 h-4 text-[var(--color-purple)]" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("w-full overflow-hidden rounded-xl border border-[var(--color-border)]", className)}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <div className="flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onSelectAll}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                        allSelected
                          ? "bg-[var(--color-purple)] border-[var(--color-purple)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-purple)]"
                      )}
                    >
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </motion.button>
                  </div>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-[var(--color-text-secondary)]"
                  )}
                  onClick={() => col.sortable && onSort?.(String(col.key))}
                >
                  <div className={cn("flex items-center gap-2", col.align === "center" && "justify-center", col.align === "right" && "justify-end")}>
                    {col.header}
                    {col.sortable && <SortIcon column={String(col.key)} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]">
                  {selectable && (
                    <td className="px-4 py-4">
                      <div className="w-5 h-5 bg-[var(--color-bg-tertiary)] rounded-md animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-4">
                      <div className="h-4 bg-[var(--color-bg-tertiary)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isSelected = selectedRows.has(String(row.id));
                return (
                  <motion.tr
                    key={String(row.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.03 }}
                    className={cn(
                      "border-b border-[var(--color-border)]",
                      "transition-all duration-200",
                      striped && rowIndex % 2 === 1 && "bg-[rgba(255,255,255,0.02)]",
                      hoverable && "hover:bg-[rgba(255,255,255,0.03)]",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-[var(--color-purple-dim)]"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRow?.(String(row.id));
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                              isSelected
                                ? "bg-[var(--color-purple)] border-[var(--color-purple)]"
                                : "border-[var(--color-border)] hover:border-[var(--color-purple)]"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </motion.button>
                        </div>
                      </td>
                    )}
                    {columns.map((col) => {
                      const rawValue = row[col.key as keyof T] as T[keyof T];
                      const value: React.ReactNode = col.render
                        ? col.render(rawValue, row) as React.ReactNode
                        : (rawValue as React.ReactNode);
                      return (
                        <td
                          key={String(col.key)}
                          className={cn(
                            "px-4 py-4 text-sm text-[var(--color-text-primary)]",
                            col.align === "center" && "text-center",
                            col.align === "right" && "text-right"
                          )}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

interface TableActionsProps {
  items: { label: string; onClick: () => void; icon?: React.ReactNode; danger?: boolean }[];
  align?: "left" | "right";
}

function TableActions({ items, align = "right" }: TableActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-20 mt-2 min-w-[160px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl overflow-hidden",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              {items.map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                    item.danger
                      ? "text-red-400 hover:bg-red-400/10"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] font-medium", className)} {...props} />
  )
);
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors duration-150 hover:bg-[rgba(255,255,255,0.02)]",
        "border-b border-[var(--color-border)]",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium uppercase tracking-wider text-xs text-[var(--color-text-tertiary)]",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle text-[var(--color-text-primary)]", "[&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-[var(--color-text-tertiary)]", className)} {...props} />
  )
);
TableCaption.displayName = "TableCaption";

export {
  DataTable,
  TableActions,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
export type { Column };