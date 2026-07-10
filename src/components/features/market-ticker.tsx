"use client";

import { memo, useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";

type Market = { symbol: string; type: string; currentPrice: number; lastUpdated: string | Date };

type PriceUpdate = { symbol: string; price: number; changePct: number; type: string };
type Payload = { tick: number; at: string; prices: PriceUpdate[] };

const TickerCell = memo(function TickerCell({
  sym,
  price,
  changePct,
}: {
  sym: string;
  price: number;
  changePct: number;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-base px-3 py-2">
      <div className="text-xs font-medium text-text-muted">{sym}</div>
      <div className="tnum text-sm font-semibold text-text">
        <Money value={price} compact />
      </div>
      <PercentChange value={changePct} className="text-xs" />
    </div>
  );
});

export function MarketTicker({ initial }: { initial: Market[] }) {
  const { socket, connected } = useSocket();
  const [prices, setPrices] = useState<Record<string, { price: number; changePct: number }>>(
    () => Object.fromEntries(initial.map((m) => [m.symbol, { price: m.currentPrice, changePct: 0 }])),
  );

  useEffect(() => {
    if (!socket) return;
    const handler = (data: Payload) => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const p of data.prices) next[p.symbol] = { price: p.price, changePct: p.changePct };
        return next;
      });
    };
    socket.on("market:update", handler);
    return () => {
      socket.off("market:update", handler);
    };
  }, [socket]);

  const top = initial.slice(0, 12).map((m) => m.symbol);

  return (
    <section className="glass-panel p-4">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Market Live</h2>
        <span className={`text-xs ${connected ? "text-profit" : "text-text-faint"}`}>
          {connected ? "● live" : "○ connecting"}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {top.map((sym) => {
          const p = prices[sym];
          if (!p) return null;
          return <TickerCell key={sym} sym={sym} price={p.price} changePct={p.changePct} />;
        })}
      </div>
    </section>
  );
}
