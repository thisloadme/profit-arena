"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { cn } from "@/lib/cn";

type Props = {
  netWorth: number;
  prevNetWorth: number;
  sparkline: { date: string; value: number }[];
  className?: string;
};

export function NetWorthHero({ netWorth, prevNetWorth, sparkline, className }: Props) {
  const changePct =
    prevNetWorth > 0 ? ((netWorth - prevNetWorth) / prevNetWorth) * 100 : 0;
  const up = changePct >= 0;
  const color = up ? "var(--profit)" : "var(--loss)";

  // ponytail: milestone ring — next million as "100%", simple visual gauge
  const nextMilestone = Math.pow(10, Math.floor(Math.log10(Math.abs(netWorth || 1))) + 1);
  const ringPct = Math.min(100, (netWorth / nextMilestone) * 100);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-4",
        "border-border bg-gradient-to-r from-card to-bg-base",
        className,
      )}
    >
      {/* Semi-transparent sparkline as background */}
      <div className="absolute inset-0 opacity-[0.12]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#heroGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {/* Milestone ring */}
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${ringPct}%, var(--border) ${ringPct}% 100%)`,
          }}
        >
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-card text-[10px] font-bold text-text-muted">
            {ringPct.toFixed(0)}%
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-text-muted">Net Worth</span>
          <div className="flex items-baseline gap-3">
            <Money value={netWorth} compact className="text-3xl font-bold text-text" />
            <PercentChange value={changePct} className="text-base" />
          </div>
          <div className="flex gap-4 text-xs text-text-faint">
            <span>30d · {sparkline.length} points</span>
            <span>Next: <Money value={nextMilestone} compact /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
