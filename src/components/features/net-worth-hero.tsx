"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type TimeframeId = "1d" | "1w" | "1M" | "1Y" | "ALL";

const TIMEFRAMES: { id: TimeframeId; label: string }[] = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "1Y", label: "1Y" },
  { id: "ALL", label: "ALL" },
];

/**
 * Net Worth velocity — the centerpiece of the dashboard.
 * Prominent area chart fills the panel (not a faint background), with the
 * value + percent change overlaid top-left. Timeframe pills let the user
 * switch between 1D / 1W / 1M / 1Y / ALL.
 *
 * Default timeframe (1M) is server-rendered for instant first paint;
 * switching pills fetches from the dashboard API.
 */
export function NetWorthHero({ netWorth: initialNetWorth, sparkline: initialSpark, className }: Props) {
  const { socket } = useSocket();
  const [timeframe, setTimeframe] = useState<TimeframeId>("1M");

  // Data state: null means use server-provided initial props (1M default).
  const [data, setData] = useState<{
    netWorth: number;
    sparkline: { date: string; value: number }[];
    loading: boolean;
  } | null>(null);

  // Keep mounted ref so stale setState after unmount doesn't fire.
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Ref for current timeframe so the socket handler doesn't need it in deps.
  // Updated in an effect (not during render) per React 19.
  const timeframeRef = useRef(timeframe);
  useEffect(() => { timeframeRef.current = timeframe; }, [timeframe]);

  const fetchData = useCallback(async (tf: TimeframeId) => {
    // ponytail: loading indicator via shared state; data replaces server props.
    setData({ netWorth: initialNetWorth, sparkline: initialSpark, loading: true });
    const res = await fetch(`/api/dashboard?timeframe=${tf}&t=${Date.now()}`, { cache: "no-store" });
    if (!mountedRef.current) return;
    if (!res.ok) { setData(null); return; }
    const json = await res.json();
    setData({ netWorth: json.netWorth, sparkline: json.sparkline, loading: false });
  }, [initialNetWorth, initialSpark]);

  // Re-fetch on timeframe change. 1M is covered by the server-rendered props,
  // so we just drop the override. All setState is deferred into microtasks so
  // nothing fires synchronously in the effect body (React 19 rule).
  useEffect(() => {
    if (timeframe === "1M") {
      queueMicrotask(() => mountedRef.current && setData(null));
      return;
    }
    queueMicrotask(() => fetchData(timeframe));
  }, [timeframe, fetchData]);

  // Socket: refetch dashboard data for current timeframe on tick.
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      const tf = timeframeRef.current;
      fetch(`/api/dashboard?timeframe=${tf}&t=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((json) => {
          if (!json || !mountedRef.current) return;
          setData({ netWorth: json.netWorth, sparkline: json.sparkline, loading: false });
        });
    };
    socket.on("user:tick", handler);
    return () => { socket.off("user:tick", handler); };
  }, [socket]);

  const activeData = data ?? { netWorth: initialNetWorth, sparkline: initialSpark, loading: false };
  const { netWorth, sparkline, loading } = activeData;

  const firstVal = sparkline[0]?.value ?? netWorth;
  const lastVal = sparkline[sparkline.length - 1]?.value ?? netWorth;
  const changePct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              Net Worth Velocity
            </span>
            {/* Timeframe pills */}
            <div className="flex gap-0.5 rounded-md border border-border bg-surface-lowest/40 p-0.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  disabled={loading}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors",
                    timeframe === tf.id
                      ? "bg-primary text-white"
                      : "text-text-faint hover:text-text hover:bg-soft",
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
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
