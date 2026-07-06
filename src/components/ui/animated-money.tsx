"use client";

import { CountUp } from "./count-up";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/config/game";

type Props = {
  value: number;
  compact?: boolean;
  signed?: boolean;
  duration?: number;
  className?: string;
};

/** Money value with count-up animation. Falls back to static span if value is 0. */
export function AnimatedMoney({ value, compact, signed, duration, className }: Props) {
  if (value === 0) {
    const text = formatMoney(value, { compact });
    return <span className={cn("tabular-nums", className)}>{signed && value > 0 ? "+" : ""}{text}</span>;
  }
  return (
    <CountUp
      from={0}
      to={value}
      duration={duration ?? 0.6}
      className={cn("tabular-nums", className)}
      formatter={(v) => {
        const text = formatMoney(v, { compact });
        return `${signed && v > 0 ? "+" : ""}${text}`;
      }}
    />
  );
}
