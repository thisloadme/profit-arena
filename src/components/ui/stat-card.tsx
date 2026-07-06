import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/** Compact stat card for dashboard tiles. */
export function StatCard({ label, value, hint, icon, className }: Props) {
  return (
    <div className={cn("card-compact flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-text-muted">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        {icon && <span className="text-text-faint">{icon}</span>}
      </div>
      <div className="tnum text-xl font-semibold text-text">{value}</div>
      {hint && <div className="text-xs text-text-muted">{hint}</div>}
    </div>
  );
}
