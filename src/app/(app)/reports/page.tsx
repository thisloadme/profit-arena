"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-client";
import "./print.css";

type ReportDetail = { type: string; total: number; count: number };
type ReportData = { year: number; month: number; income: number; expense: number; net: number; details: ReportDetail[] };

const TYPE_LABELS: Record<string, string> = {
  BUY: "Buy", SELL: "Sell", SALARY: "Salary",
  BUSINESS_REVENUE: "Business Profit", EXPENSE: "Living Expense",
  LOAN_GIVEN: "Loan Given", LOAN_RECEIVED: "Loan Received",
  LOAN_PAYMENT: "Loan Payment", LOAN_INTEREST: "Loan Interest",
};
const TYPE_COLORS: Record<string, string> = {
  BUY: "var(--loss)", SELL: "var(--profit)", SALARY: "var(--profit)",
  BUSINESS_REVENUE: "var(--profit)", EXPENSE: "var(--loss)",
  LOAN_GIVEN: "var(--loss)", LOAN_RECEIVED: "var(--profit)",
  LOAN_PAYMENT: "var(--loss)", LOAN_INTEREST: "var(--warning)",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Set the loading flag inside the async chain (not synchronously in the
    // effect body) per the React 19 rule.
    Promise.resolve()
      .then(() => { if (!cancelled) setLoading(true); })
      .then(() => apiFetch<ReportData>(`/api/reports?year=${year}&month=${month}`))
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setData(r.data);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, month]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Monthly Statement
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-text">Financial Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-soft hover:text-text"
          >
            🖨️ PDF
          </button>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-full border border-border bg-surface-lowest/60 px-3 text-xs text-text outline-none focus-ring"
          >
            {[2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-8 rounded-full border border-border bg-surface-lowest/60 px-3 text-xs text-text outline-none focus-ring"
          >
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="glass-panel flex items-center justify-center py-12">
          <div className="flex flex-col gap-2">
            <Skeleton className="mx-auto h-4 w-48" />
            <Skeleton className="mx-auto h-4 w-32" />
          </div>
        </div>
      ) : !data ? (
        <p className="glass-panel py-12 text-center text-sm text-text-faint">No data.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="glass-panel p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Income</span>
              <div className="tnum mt-1 text-xl font-bold text-profit"><Money value={data.income} compact /></div>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Expenses</span>
              <div className="tnum mt-1 text-xl font-bold text-loss"><Money value={data.expense} compact /></div>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Net</span>
              <div className={cn("tnum mt-1 text-xl font-bold", data.net >= 0 ? "text-profit" : "text-loss")}>
                <Money value={data.net} compact signed />
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="glass-panel mb-4 p-5">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-faint">By Category</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.details}>
                  <XAxis dataKey="type" tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => TYPE_LABELS[v] ?? v} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString("en-US")} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-highest)", opacity: 0.3 }}
                    contentStyle={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                    formatter={(val: unknown) => [typeof val === "number" ? val.toLocaleString("en-US") : String(val), "Amount"]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {data.details.map((d, i) => (
                      <Cell key={i} fill={TYPE_COLORS[d.type] ?? "var(--accent)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail table */}
          <div className="glass-panel p-5">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-faint">Details</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-faint">Category</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-widest text-text-faint">Amount</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-widest text-text-faint">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d) => (
                  <tr key={d.type} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1.5 text-text">{TYPE_LABELS[d.type] ?? d.type}</td>
                    <td className={cn("tnum px-2 py-1.5 text-right font-bold", d.total >= 0 ? "text-profit" : "text-loss")}>
                      <Money value={d.total} signed />
                    </td>
                    <td className="tnum px-2 py-1.5 text-right text-text-faint">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
