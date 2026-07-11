"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/cn";

type Props = {
  netWorth: number;
  prevNetWorth: number;
  sparkline: { date: string; value: number }[];
  className?: string;
};

/**
 * Net Worth velocity — the centerpiece of the dashboard.
 * Prominent area chart fills the panel (not a faint background), with the
 * value + 30d change overlaid top-left. 30d range, theme-aware stroke.
 *
 * Live: subscribes to `user:tick` and refetches `/api/me/stats` (same pattern
 * as the header NetWorthDisplay) so the value + sparkline tail update in real
 * time without a full page refresh.
 */
export function NetWorthHero({ netWorth: initialNetWorth, prevNetWorth: initialPrev, sparkline: initialSpark, className }: Props) {
  const { socket } = useSocket();
  const [netWorth, setNetWorth] = useState(initialNetWorth);
  const [prevNetWorth, setPrevNetWorth] = useState(initialPrev);
  const [sparkline, setSparkline] = useState(initialSpark);

  useEffect(() => {
    if (!socket) return;
    const handler = async () => {
      const res = await fetch(`/api/me/stats?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { netWorth: number; prevNetWorth: number } = await res.json();
      setNetWorth(data.netWorth);
      setPrevNetWorth(data.prevNetWorth || data.netWorth);
      // ponytail: append today's value to the sparkline tail so the chart
      // visually moves. Full 30d refetch is overkill per tick — a single-point
      // push keeps it cheap. Replace with /api/me/sparkline when available.
      setSparkline((prev) => {
        if (prev.length === 0) return prev;
        const todayKey = new Date().toISOString().slice(0, 10);
        const next = prev.slice(-30);
        const last = next[next.length - 1]!;
        if (last.date === todayKey) next[next.length - 1] = { date: todayKey, value: data.netWorth };
        else next.push({ date: todayKey, value: data.netWorth });
        return [...next];
      });
    };
    socket.on("user:tick", handler);
    return () => {
      socket.off("user:tick", handler);
    };
  }, [socket]);

  const changePct = prevNetWorth > 0 ? ((netWorth - prevNetWorth) / prevNetWorth) * 100 : 0;
  const up = changePct >= 0;
  const color = up ? "var(--profit)" : "var(--loss)";

  const peak = sparkline.reduce((m, p) => Math.max(m, p.value), netWorth);
  const floor = sparkline.reduce((m, p) => Math.min(m, p.value), netWorth);
  // ponytail: 8% padding so the line never kisses the panel edge.
  const pad = (peak - floor) * 0.08 || peak * 0.05;
  const yDomain: [number | "auto", number | "auto"] = [
    Math.max(0, Math.floor(floor - pad)),
    Math.ceil(peak + pad),
  ];

  return (
    <div className={cn("glass-panel relative flex flex-col overflow-hidden p-5", className)}>
      {/* Header row — overlaid value, not blocking chart */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Net Worth Velocity · 30d
          </span>
          <div className="flex items-baseline gap-3">
            <Money value={netWorth} compact className="tnum text-3xl font-black text-text sm:text-4xl" />
            <PercentChange value={changePct} className="text-base" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-[10px] uppercase tracking-widest text-text-faint">Range</span>
          <span className="tnum text-xs text-text-muted">
            <Money value={floor} compact /> – <Money value={peak} compact />
          </span>
        </div>
      </div>

      {/* Foreground chart — fills remaining space, full opacity */}
      <div className="relative z-0 mt-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.42} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-faint)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: "var(--text-faint)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) =>
                Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) =>
                new Date(String(d)).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [Intl.NumberFormat("en-US").format(Number(v)), "Net Worth"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill="url(#heroGrad)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
