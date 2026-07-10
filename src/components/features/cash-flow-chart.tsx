"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { cn } from "@/lib/cn";

type CashFlowItem = { date: string; net: number };

type Props = {
  cashFlow: CashFlowItem[];
  className?: string;
};

export function CashFlowChart({ cashFlow, className }: Props) {
  const [mode, setMode] = useState<"daily" | "weekly">("daily");

  const data = useMemo(() => {
    if (mode === "daily") return cashFlow;
    // ponytail: group by ISO week (Monday start).
    const weekly = new Map<string, number>();
    for (const d of cashFlow) {
      const week = getWeekKey(d.date);
      weekly.set(week, (weekly.get(week) ?? 0) + d.net);
    }
    return Array.from(weekly.entries()).map(([date, net]) => ({ date, net }));
  }, [cashFlow, mode]);

  const allPositive = data.every((d) => d.net >= 0);
  const allNegative = data.every((d) => d.net <= 0);
  const getBarFill = (val: number) => {
    if (allPositive) return "var(--profit)";
    if (allNegative) return "var(--loss)";
    return val >= 0 ? "var(--profit)" : "var(--loss)";
  };

  return (
    <div className={cn("glass-panel p-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Cash Flow
        </h3>
        <div className="flex gap-1 rounded border border-border p-0.5">
          <button
            onClick={() => setMode("daily")}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
              mode === "daily" ? "bg-soft text-text" : "text-text-muted hover:bg-soft",
            )}
          >
            Daily
          </button>
          <button
            onClick={() => setMode("weekly")}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
              mode === "weekly" ? "bg-soft text-text" : "text-text-muted hover:bg-soft",
            )}
          >
            Weekly
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-xs text-text-faint">
          No transaction data yet.
        </div>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(val: unknown) => [typeof val === "number" ? val.toLocaleString("en-US") : String(val), "Net"]}
              />
              <Bar dataKey="net" radius={[2, 2, 0, 0]} maxBarSize={12}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={getBarFill(entry.net)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}
