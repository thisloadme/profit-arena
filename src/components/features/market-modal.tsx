"use client";

import { useEffect, useState } from "react";
import { X, Star } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { CandlestickChart } from "@/components/ui/candlestick-chart";
import { RiskMeter } from "@/components/ui/risk-meter";
import type { OHLC } from "@/lib/ohlc";

type Props = {
  symbol: string;
  name: string;
  type: string;
  currentPrice: number;
  volatility?: number;
  onClose: () => void;
};

export function MarketModal({ symbol, name, type, currentPrice, volatility, onClose }: Props) {
  const [prices, setPrices] = useState<{ tickAt: string; price: number }[]>([]);
  const [candles, setCandles] = useState<OHLC[]>([]);
  const [chartMode, setChartMode] = useState<"line" | "candle">("line");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [watched, setWatched] = useState(false);
  const [confirm, setConfirm] = useState<"buy" | "sell" | null>(null);

  useEffect(() => {
    fetch(`/api/market/${symbol}/history?candles=daily&limit=90`)
      .then((r) => r.json())
      .then((d) => {
        if (d.history) setPrices(d.history);
        if (d.candles) setCandles(d.candles);
      })
      .catch(() => {});
    // Check if already watched
    apiFetch<{ symbols: string[] }>("/api/watchlist").then((r) => {
      if (r.ok) setWatched(r.data.symbols.includes(symbol));
    });
  }, [symbol]);

  async function toggleWatch() {
    if (watched) {
      const r = await apiFetch("/api/watchlist", { method: "DELETE", body: { symbol } });
      if (r.ok) setWatched(false);
    } else {
      const r = await apiFetch("/api/watchlist", { method: "POST", body: { symbol } });
      if (r.ok) setWatched(true);
    }
  }

  async function handleBuy() {
    setSubmitting(true);
    const res = await apiFetch("/api/trade/buy", { body: { symbol, quantity } });
    setSubmitting(false);
    if (res.ok) { toast.success(`Bought ${quantity} × ${symbol}`); onClose(); }
    else toast.error(res.error);
  }

  async function handleSell() {
    setSubmitting(true);
    const res = await apiFetch("/api/trade/sell", { body: { symbol, quantity } });
    setSubmitting(false);
    if (res.ok) { toast.success(`Sold ${quantity} × ${symbol}`); onClose(); }
    else toast.error(res.error);
  }

  const total = currentPrice * quantity;
  const sliced = candles.slice(-30);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        <motion.div
          className="flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
        >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text">{symbol}</h2>
            <p className="text-xs text-text-muted">{name}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleWatch}
              className="rounded p-1.5 text-text-muted hover:bg-soft"
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={cn("h-4 w-4", watched && "fill-warning text-warning")} />
            </button>
            <button onClick={onClose} className="rounded p-1.5 text-text-muted hover:bg-soft">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <Money value={currentPrice} compact className="text-2xl font-bold text-text" />
          <PercentChange value={changePct(prices, currentPrice)} className="text-sm" />
        </div>

        {volatility !== undefined && <RiskMeter value={volatility} />}

        {/* Chart mode toggle */}
        <div className="flex gap-1">
          {(["line", "candle"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChartMode(m)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium",
                chartMode === m ? "bg-soft text-text" : "text-text-muted hover:bg-soft",
              )}
            >
              {m === "line" ? "Line" : "Candlestick"}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartMode === "line" && prices.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prices}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82C4" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82C4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="tickAt" tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"
                  tickFormatter={(v: string) => v.slice(5, 10)} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(v: unknown) => typeof v === "string" ? new Date(v).toLocaleDateString("en-US") : ""} />
                <Area type="monotone" dataKey="price" stroke="#3B82C4" strokeWidth={2} fill="url(#g)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {chartMode === "candle" && sliced.length > 1 && (
          <div className="h-48 rounded border border-border bg-bg-base p-2">
            <CandlestickChart candles={sliced} height={176} />
          </div>
        )}
        {(prices.length <= 1 && sliced.length <= 1) && (
          <div className="flex h-24 items-center justify-center text-xs text-text-faint">Historical price data not yet available.</div>
        )}

        {/* Buy / Sell */}
        <div className="rounded-md border border-border bg-bg-base p-3">
          <label className="mb-1 text-xs text-text-muted">Quantity</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm hover:bg-soft">−</button>
              <input type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="tnum h-7 w-20 rounded border border-border bg-card text-center text-sm text-text outline-none" />
              <button onClick={() => setQuantity(quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm hover:bg-soft">+</button>
            </div>
            <span className="tnum text-sm font-medium text-text">≈ <Money value={total} compact /></span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => setConfirm("buy")} disabled={submitting} className="flex-1">Buy</Button>
            <Button onClick={() => setConfirm("sell")} disabled={submitting} className="flex-1" variant="danger">Sell</Button>
          </div>
        </div>

        {/* Confirmation dialog */}
        {confirm && (
          <div className="rounded-md border border-border bg-card p-3 text-xs">
            <p className="mb-2 font-medium text-text">
              {confirm === "buy" ? "Buy" : "Sell"} {quantity} × {symbol}?
            </p>
            <div className="flex items-center justify-between text-text-muted">
              <span>Total: <Money value={total} compact /></span>
              {confirm === "buy" && <span className="text-warning">Net Worth will decrease</span>}
              {confirm === "sell" && <span className="text-profit">Net Worth will increase</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => { setConfirm(null); confirm === "buy" ? handleBuy() : handleSell(); }} loading={submitting} className="flex-1">
                Confirm
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirm(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function changePct(prices: { price: number }[], current: number): number {
  if (prices.length < 2) return 0;
  const first = prices[0].price;
  return first > 0 ? ((current - first) / first) * 100 : 0;
}
