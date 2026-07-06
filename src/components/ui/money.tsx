import { cn } from "@/lib/cn";
import { formatMoney } from "@/config/game";

type Props = {
  value: number;
  compact?: boolean;
  className?: string;
  /** Force a sign (+/-) prefix. */
  signed?: boolean;
};

/** Currency figure with tabular-nums and optional compact notation. */
export function Money({ value, compact, className, signed }: Props) {
  const text = formatMoney(value, { compact });
  const sign = signed && value > 0 ? "+" : "";
  return <span className={cn("tnum", className)}>{sign}{text}</span>;
}
