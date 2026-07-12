"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ASSET_SEEDS } from "@/config/assets";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Sparkline } from "@/components/ui/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationPie } from "@/components/features/allocation-pie";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { GripVertical, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const NAME_BY_SYMBOL = Object.fromEntries(ASSET_SEEDS.map((a) => [a.symbol, a.name]));

/** "player_one" → "Player One". Avoids showing raw snake_case identifiers to users. */
const titleCase = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());

type Asset = {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
};

type Loan = {
  id: string;
  amount: number;
  interestRate: number;
  tenorMonths: number;
  remainingAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  borrower?: { username: string };
  lender?: { username: string };
};

type LoansResp = { given: Loan[]; taken: Loan[] };

// Filter tabs mapped to asset types. "ALL" shows everything.
const TYPE_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "STOCK", label: "Stocks" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "BOND", label: "Bonds" },
  { key: "MUTUAL_FUND", label: "Funds" },
] as const;

const TYPE_BADGE_COLOR: Record<string, string> = {
  STOCK: "text-accent",
  CRYPTO: "text-warning",
  BOND: "text-info",
  MUTUAL_FUND: "text-primary",
  PROPERTY: "text-profit",
};

const TYPE_LABEL: Record<string, string> = {
  STOCK: "Equity",
  CRYPTO: "Digital Asset",
  BOND: "Fixed Income",
  MUTUAL_FUND: "Fund",
  PROPERTY: "Property",
};

export default function PortfolioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    Promise.all([
      apiFetch<{ assets: Asset[] }>("/api/portfolio", { method: "GET" }),
      apiFetch<LoansResp>("/api/loans?list=mine", { method: "GET" }),
    ]).then(([pfRes, loanRes]) => {
      if (pfRes.ok && pfRes.data) {
        setAssets(pfRes.data.assets);
        setOrder(pfRes.data.assets.map((a) => a.symbol));
      }
      if (loanRes.ok && loanRes.data) {
        // Active loans: ones the user took (borrower) that are still ACTIVE.
        setLoans(loanRes.data.taken.filter((l) => l.status === "ACTIVE"));
      }
      setLoading(false);
    });
  }, []);

  const sorted = order.map((sym) => assets.find((a) => a.symbol === sym)!).filter(Boolean);

  const totalValue = sorted.reduce((s, a) => s + a.quantity * a.currentPrice, 0);
  const totalCost = sorted.reduce((s, a) => s + a.quantity * a.averagePrice, 0);
  const totalPnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Allocation by type — feed into AllocationPie (existing component).
  const allocation = useMemo(() => {
    const map = new Map<string, { value: number; invested: number }>();
    for (const a of sorted) {
      const val = a.quantity * a.currentPrice;
      const cost = a.quantity * a.averagePrice;
      const ex = map.get(a.type) ?? { value: 0, invested: 0 };
      ex.value += val;
      ex.invested += cost;
      map.set(a.type, ex);
    }
    return Array.from(map.entries()).map(([type, v]) => ({
      type,
      value: v.value,
      invested: v.invested,
      pnl: v.value - v.invested,
      pnlPct: v.invested > 0 ? ((v.value - v.invested) / v.invested) * 100 : 0,
    }));
  }, [sorted]);

  // Diversification score via Herfindahl-Hirschman Index (0-100).
  // Higher = more diversified. Concentrated portfolio → lower score.
  const divScore = useMemo(() => {
    if (totalValue <= 0) return 0;
    const weights = sorted.map((a) => (a.quantity * a.currentPrice) / totalValue);
    const hhi = weights.reduce((s, w) => s + w * w, 0); // 1.0 = fully concentrated
    return Math.round(Math.max(0, Math.min(100, (1 - hhi) * 100)));
  }, [sorted, totalValue]);

  const divLabel =
    divScore >= 75 ? "Excellent" : divScore >= 50 ? "Good" : divScore >= 30 ? "Fair" : "Concentrated";

  // Per-asset mini sparkline — deterministic pseudo-trend from avg → current.
  // Real per-asset price history not available client-side.
  const sparkBySymbol = useMemo(() => {
    const out: Record<string, { value: number }[]> = {};
    for (const a of sorted) {
      const seed = a.symbol.charCodeAt(0) + a.symbol.length;
      const pts: { value: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const noise = Math.sin(seed * (i + 1) * 0.7) * a.averagePrice * 0.03;
        const v = a.averagePrice + (a.currentPrice - a.averagePrice) * (i / 11) + noise;
        pts.push({ value: Math.max(0, v) });
      }
      pts[pts.length - 1] = { value: a.currentPrice };
      out[a.symbol] = pts;
    }
    return out;
  }, [sorted]);

  // Aggregate hero sparkline — blend total cost → market value.
  const totalSpark = useMemo(() => {
    const pts: { value: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const ratio = i / 15;
      const noise = Math.sin(i * 1.3) * totalValue * 0.02;
      pts.push({ value: totalCost + (totalValue - totalCost) * ratio + noise });
    }
    pts[pts.length - 1] = { value: totalValue };
    return pts;
  }, [totalValue, totalCost]);

  const filtered = filter === "ALL" ? sorted : sorted.filter((a) => a.type === filter);

  const handleDrop = useCallback(
    (toIdx: number) => {
      if (dragIdx === null || dragIdx === toIdx) return;
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
      setDragIdx(null);
    },
    [dragIdx],
  );

  if (loading) {
    return (
      <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 flex-1 w-full" />
      </div>
    );
  }

  const isPositive = totalPnl >= 0;

  return (
    <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      {/* Compact header */}
      <header className="flex shrink-0 items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-text">Portfolio</h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Performance Tracker
          </span>
        </div>
        <div className="flex items-baseline gap-4 text-xs">
          <span className="text-text-faint">
            Positions <span className="tnum font-medium text-text">{sorted.length}</span>
          </span>
          <span className="text-text-faint">
            Active Debt{" "}
            <Money
              value={loans.reduce((s, l) => s + l.remainingAmount, 0)}
              compact
              className="tnum font-medium text-loss"
            />
          </span>
        </div>
      </header>

      {/* Top Hero — 3 metric cards (Stitch: Total Return / Daily P&L / Diversification) */}
      <section className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total Return */}
        <div className="glass-panel flex flex-col justify-between p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              Total Return
            </p>
            <div className={cn("tnum mt-1 text-2xl font-bold", isPositive ? "text-profit" : "text-loss")}>
              <Money value={totalPnl} signed={isPositive} compact />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-profit" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-loss" strokeWidth={2.5} />
            )}
            <PercentChange value={pnlPct} />
            <span className="ml-auto text-[10px] text-text-faint">All Time</span>
            <div className="h-6 w-16 opacity-40">
              <Sparkline data={totalSpark} height={24} />
            </div>
          </div>
        </div>

        {/* Market Value vs Cost Basis */}
        <div className="glass-panel flex flex-col justify-between p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              Market Value
            </p>
            <div className="tnum mt-1 text-2xl font-bold text-text">
              <Money value={totalValue} compact />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <div>
              <p className="text-text-faint">Cost Basis</p>
              <Money value={totalCost} compact className="tnum font-medium text-text-muted" />
            </div>
            <div className="text-right">
              <p className="text-text-faint">Unrealized</p>
              <Money
                value={totalPnl}
                signed={isPositive}
                compact
                className={cn("tnum font-semibold", isPositive ? "text-profit" : "text-loss")}
              />
            </div>
          </div>
        </div>

        {/* Diversification Score */}
        <div className="glass-panel flex flex-col justify-between p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              Diversification Score
            </p>
            <div className="tnum mt-1 text-2xl font-bold text-accent">
              {divScore}
              <span className="text-base text-text-faint">/100</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${divScore}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              {divLabel}
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          </div>
        </div>
      </section>

      {/* Bento grid — Asset Inventory (8 cols) + right rail (4 cols) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Asset Inventory — main 8 cols */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden lg:col-span-8">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-low/60 px-5 py-3">
            <h2 className="text-sm font-bold text-text">Asset Inventory</h2>
            <div className="flex gap-1">
              {TYPE_FILTERS.map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => setFilter(tf.key)}
                  className={cn(
                    "rounded border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    filter === tf.key
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border bg-surface-highest/60 text-text-muted hover:text-text",
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-sm text-text-faint">
              <p>No assets yet.</p>
              <a href="/market" className="font-medium text-accent hover:underline">
                Start investing →
              </a>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface-lowest/95 backdrop-blur">
                  <tr className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                    <th className="px-5 py-2.5">Asset</th>
                    <th className="px-3 py-2.5">Holdings</th>
                    <th className="px-3 py-2.5 text-right">Avg / Market</th>
                    <th className="px-3 py-2.5 text-right">P/L</th>
                    <th className="px-5 py-2.5 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((a) => {
                    const value = a.quantity * a.currentPrice;
                    const cost = a.quantity * a.averagePrice;
                    const pnl = value - cost;
                    const pnlP = cost > 0 ? (pnl / cost) * 100 : 0;
                    const up = pnl >= 0;
                    const rowIdx = sorted.findIndex((s) => s.symbol === a.symbol);
                    const isDragging = dragIdx === rowIdx;
                    return (
                      <tr
                        key={a.symbol}
                        draggable
                        onDragStart={() => setDragIdx(rowIdx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(rowIdx)}
                        onDragEnd={() => setDragIdx(null)}
                        className={cn(
                          "group transition-colors hover:bg-white/[0.03]",
                          isDragging && "opacity-50",
                        )}
                      >
                        {/* Asset identity — click navigates to market detail */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="cursor-grab text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Drag to reorder"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <Link
                              href={`/market?symbol=${encodeURIComponent(a.symbol)}`}
                              className="flex items-center gap-2.5 rounded transition-colors hover:text-primary"
                              title={`View ${a.symbol} on Market`}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-9 shrink-0 items-center justify-center rounded bg-surface-highest text-[10px] font-bold",
                                  TYPE_BADGE_COLOR[a.type] ?? "text-text",
                                )}
                              >
                                {a.symbol.slice(0, 4)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-text group-hover:text-primary">
                                  {a.symbol}
                                </p>
                                <p className="truncate text-[10px] text-text-faint">
                                  {NAME_BY_SYMBOL[a.symbol] ?? a.name} ·{" "}
                                  {TYPE_LABEL[a.type] ?? a.type}
                                </p>
                              </div>
                            </Link>
                          </div>
                        </td>

                        {/* Holdings */}
                        <td className="px-3 py-3">
                          <p className="tnum text-xs font-medium text-text">
                            {a.quantity.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </p>
                          <p className="tnum text-[10px] text-text-faint">
                            <Money value={value} compact /> val
                          </p>
                        </td>

                        {/* Avg / Market */}
                        <td className="px-3 py-3 text-right">
                          <p className="tnum text-[11px] text-text-muted">
                            <Money value={a.averagePrice} compact />
                          </p>
                          <p className="tnum text-xs font-medium text-text">
                            <Money value={a.currentPrice} compact />
                          </p>
                        </td>

                        {/* P/L */}
                        <td className="px-3 py-3 text-right">
                          <p className={cn("tnum text-xs font-semibold", up ? "text-profit" : "text-loss")}>
                            <Money value={pnl} signed={up} compact />
                          </p>
                          <span
                            className={cn(
                              "tnum mt-0.5 inline-block rounded px-1 text-[10px] font-medium",
                              up ? "bg-profit-soft text-profit" : "bg-loss-soft text-loss",
                            )}
                          >
                            {up ? "+" : ""}
                            {pnlP.toFixed(2)}%
                          </span>
                        </td>

                        {/* Trend sparkline */}
                        <td className="px-5 py-3">
                          <div className="ml-auto h-8 w-20">
                            <Sparkline data={sparkBySymbol[a.symbol] ?? []} height={32} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right rail — allocation + active loans (4 cols) */}
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-4">
          <AllocationPie allocation={allocation} className="shrink-0" />

          {/* Active Loans */}
          <div className="glass-panel flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-text">
                {/*<span className="material-symbols-outlined text-warning text-base leading-none">
                  account_balance
                </span>*/}
                Active Loans
              </h3>
              <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
                Debt
              </span>
            </div>

            {loans.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center">
                <p className="text-xs text-text-faint">No active debt.</p>
                <a href="/lending" className="text-[11px] font-medium text-accent hover:underline">
                  Borrow from P2P market →
                </a>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                {loans.map((loan) => {
                  const accent = loan.interestRate > 0.05 ? "border-l-loss" : "border-l-warning";
                  return (
                    <div
                      key={loan.id}
                      className={cn(
                        "rounded border border-border border-l-4 bg-surface-low/60 p-3",
                        accent,
                      )}
                    >
                      <div className="mb-1.5 flex items-start justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          {loan.lender
                            ? `From ${titleCase(loan.lender.username)}`
                            : "Credit Line"}
                        </p>
                        <Money
                          value={loan.remainingAmount}
                          compact
                          className="tnum text-xs font-bold text-warning"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div>
                          <p className="text-text-faint">Rate</p>
                          <p className="tnum font-medium text-text">
                            {(loan.interestRate * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-faint">Due</p>
                          <p className="tnum font-medium text-text">
                            {loan.dueDate
                              ? new Date(loan.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "2-digit",
                                })
                              : `${loan.tenorMonths}m`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
