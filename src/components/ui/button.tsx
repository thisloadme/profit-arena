import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:brightness-90 border border-transparent",
  secondary: "bg-card text-text hover:bg-soft active:bg-border border border-border",
  ghost: "bg-transparent text-text hover:bg-soft active:bg-border border border-transparent",
  danger: "bg-loss text-on-primary hover:opacity-90 active:opacity-80 border border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
