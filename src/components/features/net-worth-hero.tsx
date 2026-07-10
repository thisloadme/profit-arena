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

/**
 * Net Worth hero — the centerpiece of the dashboard.
 * Glass panel + background sparkline + milestone conic-gradient ring.
 * Stitch dashboard style: taller, generous padding, glow on the chart.
 */
export function NetWorthHero({ netWorth, prevNetWorth, sparkline, className }: Props) {
  const changePct =
    prevNetWorth > 0 ? ((netWorth - prevNetWorth) / prevNetWorth) * 100 : 0;
  const up = changePct >= 0;
  const color = up ? "var(--profit)" : "var(--loss)";

  // ponytail: milestone ring — next power of 10 as "100%", simple visual gauge.
  const nextMilestone = Math.pow(10, Math.floor(Math.log10(Math.abs(netWorth || 1))) + 1);
  const ringPct = Math.min(100, (netWorth / nextMilestone) * 100);

  return (
    <div className={cn("glass-panel relative overflow-hidden p-6", className)}>
      {/* Background sparkline — faint, fills the whole panel */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
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

      {/* Glow halo behind the ring, reuses profit/loss color */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: up ? "var(--glow-primary)" : "rgba(255,180,171,0.2)" }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Milestone ring */}
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${ringPct}%, var(--border) ${ringPct}% 100%)`,
            boxShadow: `0 0 24px ${up ? "var(--glow-primary)" : "rgba(255,180,171,0.25)"}`,
          }}
        >
          <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-card">
            <span className="tnum text-sm font-bold text-text">{ringPct.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Net Worth
          </span>
          <div className="flex items-baseline gap-3">
            <Money value={netWorth} compact className="tnum text-3xl font-black text-text sm:text-4xl" />
            <PercentChange value={changePct} className="text-base" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <span className="tnum">30d · {sparkline.length} pts</span>
            <span>Next milestone: <Money value={nextMilestone} compact className="tnum" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
