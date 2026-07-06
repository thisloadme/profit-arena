import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  /** Already-in-percentage value, e.g. 1.45 means +1.45%. */
  value: number;
  className?: string;
};

/** Colored percent with directional arrow. Profit green, loss red, neutral gray. */
export function PercentChange({ value, className }: Props) {
  const up = value > 0;
  const down = value < 0;
  const color = up ? "text-profit" : down ? "text-loss" : "text-muted-2";
  const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : null;
  const sign = up ? "+" : "";
  return (
    <span className={cn("tnum inline-flex items-center gap-0.5 font-medium", color, className)}>
      {Arrow && <Arrow className="h-3 w-3" strokeWidth={2.5} />}
      {sign}
      {value.toFixed(2)}%
    </span>
  );
}
