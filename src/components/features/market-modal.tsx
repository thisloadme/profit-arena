"use client";

import { useEffect, useState } from "react";
import { X, Star } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { CandlestickChart } from "@/components/ui/candlestick-chart";
import { RiskMeter } from "@/components/ui/risk-meter";
import type { OHLC } from "@/lib/ohlc";
import { TIMEFRAMES, DEFAULT_TIMEFRAME, type TimeframeId } from "@/config/timeframes";

type Props = {
  symbol: string;
  name: string;
  type: string;
  currentPrice: number;
  volatility?: number;
  onClose: () => void;
};

export function MarketModal({ symbol, name, type, currentPrice, volatility, onClose }: Props) {
  const [candles, setCandles] = useState<OHLC[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeId>(DEFAULT_TIMEFRAME);
  const [chartMode, setChartMode] = useState<"line" | "candle">("line");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [watched, setWatched] = useState(false);
  const [confirm, setConfirm] = useState<"buy" | "sell" | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/market/${symbol}/history?timeframe=${timeframe}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { if (d.candles) setCandles(d.candles); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [symbol, timeframe]);

  useEffect(() => {
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
  const lineData = candles.map((c) => ({ time: c.time, price: c.close }));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="glass-panel flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto p-5"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-text">{symbol}</h2>
            <p className="text-xs text-text-muted">{name}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleWatch}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-soft"
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={cn("h-4 w-4", watched && "fill-warning text-warning")} />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-soft hover:text-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <Money value={currentPrice} compact className="tnum text-3xl font-black text-text" />
          <PercentChange value={changePct(candles, currentPrice)} className="text-sm" />
        </div>

        {volatility !== undefined && <RiskMeter value={volatility} />}

        {/* Timeframe + chart mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium",
                  timeframe === tf.id ? "bg-soft text-text" : "text-text-muted hover:bg-soft",
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
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
        </div>

        {/* Chart */}
        {chartMode === "line" && lineData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"
                  tickFormatter={(v: string) => formatTickLabel(v, timeframe)} />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(v: unknown) => typeof v === "string" ? new Date(v).toLocaleString("en-US") : ""} />
                <Area type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} fill="url(#g)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {chartMode === "candle" && candles.length > 1 && (
          <div className="h-48 rounded-lg border border-border bg-surface-lowest/60 p-2">
            <CandlestickChart candles={candles} height={176} />
          </div>
        )}
        {candles.length <= 1 && (
          <div className="flex h-24 items-center justify-center text-xs text-text-faint">Historical price data not yet available.</div>
        )}

        {/* Buy / Sell panel */}
        <div className="rounded-lg border border-border bg-surface-lowest/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
              Order Quantity
            </label>
            <span className="tnum text-xs text-text-muted">
              Total ≈ <Money value={total} compact />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm text-text-muted transition-colors hover:bg-soft hover:text-text"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="tnum h-8 w-20 rounded-md border border-border bg-card text-center text-sm font-semibold text-text outline-none focus-ring"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm text-text-muted transition-colors hover:bg-soft hover:text-text"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => setConfirm("buy")} disabled={submitting} className="flex-1">
              Buy
            </Button>
            <Button onClick={() => setConfirm("sell")} disabled={submitting} className="flex-1" variant="danger">
              Sell
            </Button>
          </div>
        </div>

        {/* Confirmation dialog */}
        {confirm && (
          <div className="glass-panel p-3 text-xs">
            <p className="mb-2 font-semibold text-text">
              {confirm === "buy" ? "Buy" : "Sell"} {quantity} × {symbol}?
            </p>
            <div className="flex items-center justify-between text-text-muted">
              <span>Total: <Money value={total} compact /></span>
              {confirm === "buy" && <span className="text-warning">Net Worth will decrease</span>}
              {confirm === "sell" && <span className="text-profit">Net Worth will increase</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => { setConfirm(null); confirm === "buy" ? handleBuy() : handleSell(); }}
                loading={submitting}
                className="flex-1"
              >
                Confirm Order
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

function changePct(candles: OHLC[], current: number): number {
  if (candles.length === 0) return 0;
  const first = candles[0]!.open;
  return first > 0 ? ((current - first) / first) * 100 : 0;
}

/** Compact X-axis label based on timeframe span. */
function formatTickLabel(iso: string, tf: TimeframeId): string {
  const d = new Date(iso);
  if (tf === "15m" || tf === "30m" || tf === "1h") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
