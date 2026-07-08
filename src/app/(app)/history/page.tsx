"use client";

import { useEffect, useState } from "react";
import { Download, Filter } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";

type Tx = {
  id: string;
  type: string;
  amount: number;
  description: string;
  relatedAsset: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  BUY: "Buy", SELL: "Sell", SALARY: "Salary",
  BUSINESS_REVENUE: "Business Profit", EXPENSE: "Living Expense",
  LOAN_GIVEN: "Loan Given", LOAN_RECEIVED: "Loan Received",
  LOAN_PAYMENT: "Loan Payment", LOAN_INTEREST: "Loan Interest",
};

const TYPE_COLORS: Record<string, string> = {
  BUY: "text-loss", SELL: "text-profit", SALARY: "text-profit",
  BUSINESS_REVENUE: "text-profit", EXPENSE: "text-loss",
  LOAN_GIVEN: "text-loss", LOAN_RECEIVED: "text-profit",
  LOAN_PAYMENT: "text-loss", LOAN_INTEREST: "text-loss",
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [type, setType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(cursor?: string) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (type !== "ALL") params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("take", "30");

    const r = await apiFetch<{ rows: Tx[]; nextCursor: string | null }>(
      `/api/transactions?${params}`,
    );
    if (r.ok) {
      if (cursor) setRows((prev) => [...prev, ...r.data.rows]);
      else setRows(r.data.rows);
      setNextCursor(r.data.nextCursor);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [type, from, to]);

  function csvUrl() {
    const params = new URLSearchParams();
    params.set("csv", "1");
    if (type !== "ALL") params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/transactions?${params}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Transaction History</h1>
        <a
          href={csvUrl()}
          download
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-soft"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </a>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
        <Filter className="h-3.5 w-3.5 text-text-muted" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-8 rounded border border-border bg-card px-2 text-xs text-text outline-none"
        >
          <option value="ALL">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-36"
          placeholder="To"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-compact flex flex-col items-center gap-2 py-12 text-sm text-text-faint">
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-base">
                <th className="px-3 py-2 text-left font-medium text-text-muted">Type</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Description</th>
                <th className="px-3 py-2 text-right font-medium text-text-muted">Amount</th>
                <th className="hidden px-3 py-2 text-right font-medium text-text-muted sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-soft/50">
                  <td className="px-3 py-2">
                    <span className={cn("rounded bg-soft px-1.5 py-0.5 font-medium", TYPE_COLORS[r.type])}>
                      {TYPE_LABELS[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{r.description}</td>
                  <td className={cn("tnum px-3 py-2 text-right font-medium", r.amount >= 0 ? "text-profit" : "text-loss")}>
                    <Money value={r.amount} signed />
                  </td>
                  <td className="hidden px-3 py-2 text-right text-text-faint sm:table-cell">
                    {new Date(r.createdAt).toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {nextCursor && (
        <div className="text-center">
          <Button variant="secondary" size="sm" onClick={() => load(nextCursor)} loading={loading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
