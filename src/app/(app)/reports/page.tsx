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
  BUY: "#DC2626", SELL: "#16A34A", SALARY: "#16A34A",
  BUSINESS_REVENUE: "#16A34A", EXPENSE: "#DC2626",
  LOAN_GIVEN: "#DC2626", LOAN_RECEIVED: "#16A34A",
  LOAN_PAYMENT: "#DC2626", LOAN_INTEREST: "#D97706",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<ReportData>(`/api/reports?year=${year}&month=${month}`).then((r) => {
      if (r.ok) setData(r.data);
      setLoading(false);
    });
  }, [year, month]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Financial Report</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="rounded border border-border bg-card px-2.5 py-1.5 text-xs text-text-muted hover:bg-soft">
            🖨️ PDF
          </button>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded border border-border bg-card px-2 text-xs text-text outline-none">
            {[2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="h-8 rounded border border-border bg-card px-2 text-xs text-text outline-none">
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-text-faint">No data.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-compact">
              <span className="text-xs text-text-muted">Income</span>
              <div className="tnum text-lg font-bold text-profit"><Money value={data.income} compact /></div>
            </div>
            <div className="card-compact">
              <span className="text-xs text-text-muted">Expenses</span>
              <div className="tnum text-lg font-bold text-loss"><Money value={data.expense} compact /></div>
            </div>
            <div className="card-compact">
              <span className="text-xs text-text-muted">Net</span>
              <div className={cn("tnum text-lg font-bold", data.net >= 0 ? "text-profit" : "text-loss")}>
                <Money value={data.net} compact signed />
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card-compact">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">By Category</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.details}>
                  <XAxis dataKey="type" tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => TYPE_LABELS[v] ?? v} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString("en-US")} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                    formatter={(val: unknown) => [typeof val === "number" ? val.toLocaleString("en-US") : String(val), "Amount"]} />
                  <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={40}>
                    {data.details.map((d, i) => (
                      <Cell key={i} fill={TYPE_COLORS[d.type] ?? "#3B82C4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail table */}
          <div className="card-compact">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Details</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="px-2 py-1.5 text-left font-medium">Category</th>
                  <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                  <th className="px-2 py-1.5 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.details.map((d) => (
                  <tr key={d.type} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 text-text">{TYPE_LABELS[d.type] ?? d.type}</td>
                    <td className={cn("tnum px-2 py-1.5 text-right font-medium", d.total >= 0 ? "text-profit" : "text-loss")}>
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
