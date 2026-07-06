import { cn } from "@/lib/cn";

type Props = {
  /** 0.0 – 1.0 volatility. */
  value: number;
  className?: string;
};

const LEVELS = [
  { max: 0.01, label: "Very Low", color: "bg-profit" },
  { max: 0.02, label: "Low", color: "bg-profit/70" },
  { max: 0.03, label: "Moderate", color: "bg-warning" },
  { max: 0.05, label: "High", color: "bg-loss/70" },
  { max: 1, label: "Very High", color: "bg-loss" },
];

export function RiskMeter({ value, className }: Props) {
  const level = LEVELS.find((l) => value <= l.max) ?? LEVELS[LEVELS.length - 1];
  const pct = Math.min(value * 100, 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className={cn("h-full rounded-full transition-all", level.color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-text-muted">{level.label}</span>
    </div>
  );
}
