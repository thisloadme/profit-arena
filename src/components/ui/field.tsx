import { cn } from "@/lib/cn";
import { useId, type ReactNode } from "react";

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
  // Stable id for the error/hint text so the input can announce it.
  const generatedId = useId();
  const describedById = error || hint ? `${generatedId}-desc` : undefined;

  // Clone the single input child to inject aria-describedby + aria-invalid,
  // so screen readers announce errors without every caller wiring them up.
  let injected: ReactNode = children;
  if (typeof children === "object" && children !== null && "props" in (children as object)) {
    const c = children as React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
    injected = {
      ...c,
      props: {
        ...c.props,
        ...(htmlFor ? { id: c.props.id ?? htmlFor } : {}),
        ...(describedById ? { "aria-describedby": describedById } : {}),
        ...(error ? { "aria-invalid": true } : {}),
      },
    };
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      {injected}
      {hint && !error && (
        <span id={describedById} className="text-xs text-text-faint">
          {hint}
        </span>
      )}
      {error && (
        <span id={describedById} className="text-xs text-loss" role="alert">
          {error}
        </span>
      )}
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
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel mx-auto w-full max-w-md p-6 sm:p-8", className)}>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-text">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-text-muted">{footer}</div>}
    </div>
  );
}
