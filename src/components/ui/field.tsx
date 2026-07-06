import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-text-faint">{hint}</span>}
      {error && <span className="text-xs text-loss">{error}</span>}
    </div>
  );
}

export function FormCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-compact mx-auto w-full max-w-md p-6", className)}>
      <header className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
      {footer && <div className="mt-4 text-center text-sm text-text-muted">{footer}</div>}
    </div>
  );
}
