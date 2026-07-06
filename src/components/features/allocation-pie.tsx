"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";

// ponytail: color blind friendly palette – Wong (2011) + Tufte minimalism.
const COLORS = ["#0072B2", "#D55E00", "#009E73", "#F0E442", "#CC79A7", "#56B4E9"];
const TYPE_LABELS: Record<string, string> = {
  STOCK: "Stocks",
  CRYPTO: "Crypto",
  BOND: "Bonds",
  MUTUAL_FUND: "Mutual Funds",
  PROPERTY: "Property",
};

type AllocationItem = {
  type: string;
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
};

type Props = {
  allocation: AllocationItem[];
  className?: string;
};

export function AllocationPie({ allocation, className }: Props) {
  const total = allocation.reduce((s, a) => s + a.value, 0);
  const hasAssets = total > 0;

  return (
    <div className={cn("card-compact", className)}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Asset Allocation
      </h3>
      {!hasAssets ? (
        <div className="flex flex-col items-center justify-center py-8 text-xs text-text-faint">
          <p>No assets yet.</p>
          <p className="mt-1">
            <a href="/market" className="text-accent hover:underline">
              Start your first investment →
            </a>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={58}
                  minAngle={3}
                >
                  {allocation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => [val?.toLocaleString?.("en-US") ?? val, "Value"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            {allocation.map((a, i) => (
              <div key={a.type} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                  aria-hidden
                />
                <span className="w-16 text-text-muted">{TYPE_LABELS[a.type] ?? a.type}</span>
                <span className="tnum w-20 text-right font-medium text-text">
                  <Money value={a.value} compact />
                </span>
                <span
                  className={cn(
                    "tnum w-14 text-right",
                    a.pnl >= 0 ? "text-profit" : "text-loss",
                  )}
                >
                  {a.pnl >= 0 ? "+" : ""}
                  {a.pnlPct.toFixed(1)}%
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-2 border-t border-border pt-1.5 font-medium text-text">
              <span className="w-[58px]" />
              <span className="w-16">Total</span>
              <span className="tnum w-20 text-right">
                <Money value={total} compact />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
