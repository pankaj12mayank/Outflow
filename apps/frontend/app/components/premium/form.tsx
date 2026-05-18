"use client";

import { forwardRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

function FormField({ children, className }: FormFieldProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

function FormLabel({ children, required, className }: FormLabelProps) {
  return (
    <label className={cn("text-sm font-medium text-[var(--color-text-secondary)]", className)}>
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

function FormDescription({ children, className }: FormDescriptionProps) {
  return <p className={cn("text-xs text-[var(--color-text-tertiary)]", className)}>{children}</p>;
}

interface FormErrorProps {
  children: React.ReactNode;
  className?: string;
}

function FormError({ children, className }: FormErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-1.5 text-xs text-red-400", className)}
    >
      <AlertCircle className="w-3.5 h-3.5" />
      {children}
    </motion.div>
  );
}

interface FormSuccessProps {
  children: React.ReactNode;
  className?: string;
}

function FormSuccess({ children, className }: FormSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-1.5 text-xs text-green-400", className)}
    >
      <CheckCircle className="w-3.5 h-3.5" />
      {children}
    </motion.div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, leftIcon, rightIcon, ...props }, ref) => {
    const id = useId();
    
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full h-11 px-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "transition-all duration-200",
            "focus:outline-none focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple-dim)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            success && "border-green-500/50 focus:border-green-500 focus:ring-green-500/20",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const id = useId();
    
    return (
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "w-full min-h-[100px] px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
          "transition-all duration-200 resize-none",
          "focus:outline-none focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple-dim)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = "FormTextarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    const id = useId();
    
    return (
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full h-11 px-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl",
            "text-[var(--color-text-primary)]",
            "transition-all duration-200 appearance-none cursor-pointer",
            "focus:outline-none focus:border-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple-dim)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-[var(--color-text-muted)]">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    
    return (
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              "sr-only peer",
              className
            )}
            {...props}
          />
          <div className={cn(
            "w-5 h-5 border-2 rounded-md transition-all duration-200",
            "border-[var(--color-border)] group-hover:border-[var(--color-purple)]",
            "peer-checked:bg-[var(--color-purple)] peer-checked:border-[var(--color-purple)]",
            "peer-focus:ring-2 peer-focus:ring-[var(--color-purple-dim)] peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--color-bg-primary)]"
          )}>
            <svg 
              className="w-full h-full text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        {label && <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{label}</span>}
      </label>
    );
  }
);
FormCheckbox.displayName = "FormCheckbox";

interface RadioGroupProps {
  name: string;
  options: { value: string; label: string; description?: string }[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

function RadioGroup({ name, options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
            "border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
            value === option.value && "border-[var(--color-purple)] bg-[var(--color-purple-dim)]"
          )}
        >
          <div className="relative mt-0.5">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              className="sr-only"
            />
            <div className={cn(
              "w-4 h-4 rounded-full border-2 transition-all duration-200",
              value === option.value 
                ? "border-[var(--color-purple)] bg-[var(--color-purple)]" 
                : "border-[var(--color-border)]"
            )}>
              {value === option.value && (
                <div className="absolute inset-1 m-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">{option.label}</div>
            {option.description && (
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{option.description}</div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  const id = useId();
  
  return (
    <label htmlFor={id} className={cn("flex items-center gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed", className)}>
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={cn(
          "w-11 h-6 rounded-full transition-all duration-300",
          checked 
            ? "bg-[var(--color-purple)]" 
            : "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]"
        )}>
          <div className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
            checked ? "translate-x-5" : "translate-x-0.5"
          )} />
        </div>
      </div>
      {label && <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>}
    </label>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>}
          {description && <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn("flex items-center gap-3 pt-4", className)}>
      {children}
    </div>
  );
}

export { 
  FormField, 
  FormLabel, 
  FormDescription, 
  FormError, 
  FormSuccess,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  RadioGroup,
  Switch,
  FormSection,
  FormActions
};