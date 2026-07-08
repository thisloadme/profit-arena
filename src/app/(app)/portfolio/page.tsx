"use client";

import { useEffect, useState, useCallback } from "react";
import { ASSET_SEEDS } from "@/config/assets";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { GripVertical } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const NAME_BY_SYMBOL = Object.fromEntries(ASSET_SEEDS.map((a) => [a.symbol, a.name]));

type Asset = {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
};

export default function PortfolioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ assets: Asset[] }>("/api/portfolio", { method: "GET" }).then((r) => {
      if (r.ok && r.data) {
        setAssets(r.data.assets);
        setOrder(r.data.assets.map((a: Asset) => a.symbol));
      }
      setLoading(false);
    });
  }, []);

  const sorted = order.map((sym) => assets.find((a) => a.symbol === sym)!).filter(Boolean);

  const totalValue = sorted.reduce((s, a) => s + a.quantity * a.currentPrice, 0);
  const totalCost = sorted.reduce((s, a) => s + a.quantity * a.averagePrice, 0);
  const totalPnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const handleDrop = useCallback((toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  }, [dragIdx]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-bold text-primary">Portfolio</h1>
      </header>

      {/* Summary */}
      <div className="card-compact grid grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-text-muted">Total Value</span>
          <div className="tnum text-lg font-bold text-text">
            <Money value={totalValue} compact />
          </div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Total Invested</span>
          <div className="tnum text-lg font-bold text-text">
            <Money value={totalCost} compact />
          </div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Unrealized P/L</span>
          <div className="tnum text-lg font-bold">
            <span className={totalPnl >= 0 ? "text-profit" : "text-loss"}>
              <Money value={totalPnl} signed={totalPnl >= 0} compact />
            </span>
            <span className="ml-1">
              <PercentChange value={pnlPct} />
            </span>
          </div>
        </div>
      </div>

      {/* Asset cards */}
      {sorted.length === 0 ? (
        <div className="card-compact flex flex-col items-center gap-2 py-12 text-sm text-text-faint">
          <p>No assets yet.</p>
          <a href="/market" className="font-medium text-accent hover:underline">
            Start investing →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a, i) => {
            const value = a.quantity * a.currentPrice;
            const cost = a.quantity * a.averagePrice;
            const pnl = value - cost;
            const pnlP = cost > 0 ? (pnl / cost) * 100 : 0;
            const isDragging = dragIdx === i;
            return (
              <div
                key={a.symbol}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragIdx(null)}
                className={cn(
                  "card-compact flex flex-col gap-1.5 transition-shadow",
                  isDragging && "opacity-50 shadow-raised ring-2 ring-accent",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="cursor-grab text-text-faint hover:text-text-muted" aria-label="Drag to reorder">
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-text">{a.symbol}</span>
                  </div>
                  <span className="text-[10px] text-text-faint">
                    {a.quantity.toFixed(2)} units
                  </span>
                </div>
                <span className="text-sm text-text-muted">
                  {NAME_BY_SYMBOL[a.symbol] ?? a.name}
                </span>
                <div className="tnum text-base font-semibold text-text">
                  <Money value={value} compact />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Avg: <Money value={a.averagePrice} compact />
                  </span>
                  <span className={cn("font-medium", pnl >= 0 ? "text-profit" : "text-loss")}>
                    <PercentChange value={pnlP} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-faint">
                  <span>Market: <Money value={a.currentPrice} compact /></span>
                  <span>Alloc: {totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0"}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
