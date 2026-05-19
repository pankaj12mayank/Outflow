import * as React from "react";
import { cn } from "@/app/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => (
    <select
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      ref={ref}
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: 'white',
        borderColor: 'rgba(255,255,255,0.1)'
      }}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} style={{backgroundColor: '#0a0a0f', color: 'white'}}>
          {option.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = "Select";

export { Select };