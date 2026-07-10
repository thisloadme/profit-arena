import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: "compact" | "glass";
  className?: string;
};

/**
 * Stat card for dashboard tiles.
 * - `compact`: legacy bordered card (card-compact).
 * - `glass`: Stitch-style glassmorphism panel with top-edge sheen.
 */
export function StatCard({ label, value, hint, icon, variant = "compact", className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        variant === "glass" ? "glass-panel p-4" : "card-compact",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          {label}
        </span>
        {icon && <span className="text-text-faint">{icon}</span>}
      </div>
      <div className="tnum text-xl font-bold text-text">{value}</div>
      {hint && <div className="text-xs text-text-muted">{hint}</div>}
    </div>
  );
}
