"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Search, ArrowUpDown, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CandlestickChart } from "@/components/ui/candlestick-chart";
import { RiskMeter } from "@/components/ui/risk-meter";
import { useSocket } from "@/hooks/use-socket";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import type { OHLC } from "@/lib/ohlc";
import { TIMEFRAMES, DEFAULT_TIMEFRAME, type TimeframeId } from "@/config/timeframes";

type MarketItem = {
  symbol: string;
  name: string;
  type: string;
  // price may arrive as number (current API) or string (stale cache or a
  // previous Decimal-serialized payload). Use toPrice() before arithmetic.
  price: number | string;
  volatility: number | string;
};

// Coerce a price-like value (number | string | Prisma.Decimal) to number.
// Defensive: handles stale cache, server returns string (e.g. JSON.parse on a
// serialized Decimal), or any future change that loses the numeric type.
function toPrice(v: number | string): number {
  return typeof v === "number" ? v : Number(v);
}

const TABS = ["All", "STOCK", "CRYPTO", "BOND", "MUTUAL_FUND"] as const;
const TAB_LABEL: Record<string, string> = {
  All: "All",
  STOCK: "Stocks",
  CRYPTO: "Crypto",
  BOND: "Bonds",
  MUTUAL_FUND: "Funds",
};

type SortKey = "symbol" | "price" | "changePct";

// Stock market hours mirror the server (game.ts): 20:00–03:00 game-time.
// 1 socket tick = 1 game-minute; seed date 2018-01-01 00:00 UTC.
const STOCK_OPEN_HOUR = 20;
const STOCK_CLOSE_HOUR = 3;
function stockMarketOpen(tick: number): boolean {
  const hour = Math.floor(tick / 60) % 24;
  return hour >= STOCK_OPEN_HOUR || hour < STOCK_CLOSE_HOUR;
}

export default function MarketPage() {
  const { socket, connected } = useSocket();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [changeMap, setChangeMap] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("symbol");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([]);
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [tick, setTick] = useState(0);

	  useEffect(() => {
	    // ponytail: read ?symbol= once at mount to support Portfolio deep-link
	    const urlSymbol = new URLSearchParams(window.location.search).get("symbol");
	    fetch("/api/market")
	      .then((r) => r.json())
	      .then((d) => {
	        setItems(d.markets ?? []);
	        const list = d.markets ?? [];
	        const picked = urlSymbol && list.some((m: MarketItem) => m.symbol === urlSymbol)
	          ? urlSymbol
	          : list[0]?.symbol ?? null;
	        setSelected(picked);
	        setLoading(false);
	      });
	    apiFetch<{ symbols: string[] }>("/api/watchlist").then((r) => {
	      if (r.ok) setWatchedSymbols(r.data.symbols);
      });
	  }, []);
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { tick: number; prices: { symbol: string; price: number; changePct: number }[] }) => {
      if (typeof data.tick === "number") setTick(data.tick);
      setItems((prev) =>
        prev.map((m) => {
          const u = data.prices.find((p) => p.symbol === m.symbol);
          return u ? { ...m, price: u.price } : m;
        }),
      );
      setChangeMap((prev) => {
        const next = { ...prev };
        for (const p of data.prices) next[p.symbol] = p.changePct;
        return next;
      });
    };
    socket.on("market:update", handler);
    return () => { socket.off("market:update", handler); };
  }, [socket]);

  const filtered = useMemo(() => {
    let list = tab === "All" ? items : items.filter((m) => m.type === tab);
    if (watchedOnly) list = list.filter((m) => watchedSymbols.includes(m.symbol));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "symbol") return a.symbol.localeCompare(b.symbol);
      if (sortBy === "price") return b.price - a.price;
      const ca = changeMap[a.symbol] ?? 0;
      const cb = changeMap[b.symbol] ?? 0;
      if (sortBy === "changePct") return cb - ca;
      return 0;
    });
  }, [items, tab, search, sortBy, changeMap, watchedOnly, watchedSymbols]);

  const selectedItem = selected ? items.find((m) => m.symbol === selected) ?? null : null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-20 w-full" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Trading Floor</p>
          <h1 className="mt-0.5 text-2xl font-bold text-text">Market Arena</h1>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
          connected ? "border-profit/30 bg-profit/10 text-profit" : "border-border text-text-faint",
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-profit" : "bg-text-faint")} />
          {connected ? "LIVE" : "CONNECTING"}
        </span>
      </header>

      <div className="flex flex-col gap-4 lg:h-[calc(100svh-10.5rem)] lg:flex-row">
        {/* LEFT — asset list */}
        <div className="flex flex-[2] flex-col overflow-hidden">
          {/* Controls: tabs + search + watch + sort */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                    tab === t ? "bg-primary text-on-primary glow-primary" : "border border-border text-text-muted hover:bg-soft hover:text-text",
                  )}
                >
                  {TAB_LABEL[t] ?? t}
                </button>
              ))}
            </div>
            <div className="relative ml-auto min-w-40 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
              <Input
                placeholder="Search symbol…"
                className="rounded-full pl-9 ring-1 ring-border focus:ring-2 focus:ring-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setWatchedOnly((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                watchedOnly ? "border-warning bg-warning-soft text-warning" : "border-border text-text-muted hover:bg-soft hover:text-text",
              )}
              title="Show watched only"
            >
              <Star className={cn("h-3 w-3", watchedOnly && "fill-warning")} />
              {watchedOnly ? "Watched" : "Watch"}
            </button>
            <button
              onClick={() => setSortBy((s) => (s === "symbol" ? "price" : s === "price" ? "changePct" : "symbol"))}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-text-muted transition-colors hover:bg-soft hover:text-text"
              title={`Sort: ${sortBy}`}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === "symbol" ? "Name" : sortBy === "price" ? "Price" : "Change"}
            </button>
          </div>

          {/* Table header row */}
          <div className="glass-panel mb-2 hidden items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-faint md:flex">
            <span className="w-[38%]">Asset</span>
            <span className="w-[18%] text-right">Price</span>
            <span className="w-[16%] text-right">24h Change</span>
            <span className="w-[14%] text-right">Volatility</span>
            <span className="w-[14%] text-right">Type</span>
          </div>

          {/* Scrollable list */}
          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="glass-panel py-12 text-center text-sm text-text-faint">No assets found.</div>
            ) : (
              filtered.map((m) => {
                const change = changeMap[m.symbol] ?? 0;
                const watched = watchedSymbols.includes(m.symbol);
                const isSelected = selected === m.symbol;
                return (
                  <button
                    key={m.symbol}
                    onClick={() => setSelected(m.symbol)}
                    className={cn(
                      "glass-panel card-interactive group flex cursor-pointer items-center px-4 py-2.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-[0_0_15px_-5px_var(--glow-primary)]"
                        : "hover:border-primary/40",
                    )}
                  >
                    {/* Asset identity */}
                    <div className="flex w-[38%] items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-black text-primary">
                        {m.symbol.slice(0, 2)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1 text-sm font-bold text-text">
                          {m.symbol}
                          {watched && <Star className="h-3 w-3 fill-warning text-warning" />}
                        </span>
                        <span className="truncate text-[11px] text-text-faint">{m.name}</span>
                      </div>
                    </div>
                    {/* Price */}
                    <div className="w-[18%] text-right">
                      <span className="tnum text-xs font-bold text-text"><Money value={m.price} compact /></span>
                    </div>
                    {/* Change */}
                    <div className="w-[16%] text-right">
                      <PercentChange value={change} className="text-xs" />
                    </div>
                    {/* Volatility */}
                    <div className="w-[14%] text-right">
                      <span className="tnum text-xs text-text-muted">{(m.volatility * 100).toFixed(1)}%</span>
                    </div>
                    {/* Type */}
                    <div className="w-[14%] text-right">
                      <span className="text-[10px] uppercase tracking-wide text-text-faint">{TAB_LABEL[m.type] ?? m.type}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — detail + chart + order panel */}
        {selectedItem && (
          <MarketDetail
            key={selectedItem.symbol}
            item={selectedItem}
            changePct={changeMap[selectedItem.symbol] ?? 0}
            stockOpen={stockMarketOpen(tick)}
            watched={watchedSymbols.includes(selectedItem.symbol)}
            onWatchChange={(next) => setWatchedSymbols((prev) =>
              next ? [...prev, selectedItem.symbol] : prev.filter((s) => s !== selectedItem.symbol),
            )}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Right panel: detail + chart + order execution ---------- */

type DetailProps = {
  item: MarketItem;
  changePct: number;
  stockOpen: boolean;
  watched: boolean;
  onWatchChange: (next: boolean) => void;
};

type OrderType = "market" | "limit";

function MarketDetail({ item, changePct, stockOpen, watched, onWatchChange }: DetailProps) {
  const [candles, setCandles] = useState<OHLC[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeId>(DEFAULT_TIMEFRAME);
  const [chartMode, setChartMode] = useState<"line" | "candle">("line");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState<string>(toPrice(item.price).toFixed(2));
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/market/${item.symbol}/history?timeframe=${timeframe}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { if (d.candles) setCandles(d.candles); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [item.symbol, timeframe]);

  const orderTotal = toPrice(item.price) * quantity;
  const limitTotal = parseFloat(limitPrice) * quantity || 0;
  const lineData = candles.map((c) => ({ time: c.time, price: c.close }));

  // Sync limit price to live market price ONLY when user hasn't edited it.
  // `edited` flips true the moment the user types — after that, live ticks
  // don't clobber their input. Switching symbol remounts via key=, so a fresh
  // mount always starts at the current market price.
  const editedRef = useRef(false);
  useEffect(() => {
    if (editedRef.current) return;
    setLimitPrice(toPrice(item.price).toFixed(2));
  }, [item.price]);

  async function toggleWatch() {
    const method = watched ? "DELETE" : "POST";
    const r = await apiFetch("/api/watchlist", { method, body: { symbol: item.symbol } });
    if (r.ok) onWatchChange(!watched);
    else toast.error(r.error);
  }

  async function execute() {
    setSubmitting(true);
    if (orderType === "market") {
      const endpoint = side === "buy" ? "/api/trade/buy" : "/api/trade/sell";
      const res = await apiFetch<{ queued?: boolean; message?: string }>(endpoint, {
        body: { symbol: item.symbol, quantity },
      });
      setSubmitting(false);
      setConfirm(false);
      if (res.ok) {
        if (res.data.queued) toast.info(res.data.message ?? `Market closed — order queued for next open.`);
        else toast.success(`${side === "buy" ? "Bought" : "Sold"} ${quantity} × ${item.symbol}`);
      } else toast.error(res.error);
    } else {
      const lp = parseFloat(limitPrice);
      if (!lp || lp <= 0) {
        setSubmitting(false);
        setConfirm(false);
        toast.error("Enter a valid limit price");
        return;
      }
      const res = await apiFetch("/api/trade/limit", {
        body: { symbol: item.symbol, type: side === "buy" ? "BUY" : "SELL", quantity, limitPrice: lp },
      });
      setSubmitting(false);
      setConfirm(false);
      if (res.ok) toast.success(`Limit ${side} order placed: ${quantity} × ${item.symbol} @ ${lp}`);
      else toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto lg:overflow-visible">
      {/* Detail header */}
      <div className="glass-panel relative overflow-hidden p-4">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-base font-black text-primary">
              {item.symbol.slice(0, 2)}
            </span>
            <div>
              <h2 className="text-lg font-bold text-text">{item.symbol}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">{item.name}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Live</span>
                {item.type === "STOCK" && (
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    stockOpen ? "bg-profit/10 text-profit" : "bg-warning-soft text-warning",
                  )}>
                    Market {stockOpen ? "Open" : "Closed"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={toggleWatch}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-soft"
            title={watched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star className={cn("h-4 w-4", watched && "fill-warning text-warning")} />
          </button>
        </div>
        <div className="relative z-10 mt-4 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="tnum text-3xl font-black tracking-tight text-text">
              <Money value={toPrice(item.price)} compact />
            </span>
            <span className={cn("tnum mt-0.5 flex items-center gap-1 text-sm font-bold", changePct >= 0 ? "text-profit" : "text-loss")}>
              {changePct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}% today
            </span>
          </div>
        </div>
        <RiskMeter value={item.volatility} className="relative z-10 mt-3" />
      </div>

      {/* Chart */}
      <div className="glass-panel flex flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold",
                  timeframe === tf.id ? "bg-surface-highest text-text" : "text-text-muted hover:bg-soft",
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
                  "rounded px-2 py-0.5 text-[10px] font-bold",
                  chartMode === m ? "bg-surface-highest text-text" : "text-text-muted hover:bg-soft",
                )}
              >
                {m === "line" ? "Line" : "Candle"}
              </button>
            ))}
          </div>
        </div>
        {candles.length <= 1 ? (
          <div className="flex h-32 items-center justify-center text-xs text-text-faint">
            Historical data not yet available.
          </div>
        ) : chartMode === "line" ? (
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={tickLabel} />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(v) => typeof v === "string" ? new Date(v).toLocaleString("en-US") : ""}
                  formatter={(v) => [<Money key="p" value={Number(v)} compact />, "Price"]}
                />
                <Area type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} fill="url(#mktGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-36 rounded-lg border border-border bg-surface-lowest/60 p-2">
            <CandlestickChart candles={candles} height={128} />
          </div>
        )}
      </div>

      {/* Order panel */}
      <div className="glass-panel p-4">
        {/* Buy/Sell toggle */}
        <div className="mb-3 flex border-b border-border">
          <button
            onClick={() => setSide("buy")}
            className={cn(
              "flex-1 py-2 text-sm font-bold transition-all",
              side === "buy" ? "border-b-2 border-profit text-profit" : "text-text-muted hover:text-text",
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("sell")}
            className={cn(
              "flex-1 py-2 text-sm font-bold transition-all",
              side === "sell" ? "border-b-2 border-loss text-loss" : "text-text-muted hover:text-text",
            )}
          >
            Sell
          </button>
        </div>

        {/* Order type */}
        <div className="mb-3 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Order Type</label>
          <div className="flex gap-1 rounded-md border border-border bg-surface-lowest/60 p-0.5">
            {(["market", "limit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={cn(
                  "rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all",
                  orderType === t ? "bg-surface-highest text-text" : "text-text-muted hover:text-text",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Limit price (only when limit order) */}
        {orderType === "limit" && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Limit Price</label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-faint">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={limitPrice}
                onChange={(e) => { editedRef.current = true; setLimitPrice(e.target.value); }}
                className="tnum h-9 w-full rounded-md border border-border bg-surface-lowest/60 pl-7 pr-3 text-right text-sm font-semibold text-text outline-none focus-ring"
              />
            </div>
            <button
              onClick={() => setLimitPrice(toPrice(item.price).toFixed(2))}
              className="h-9 rounded-md border border-border px-2 text-[10px] font-semibold text-text-muted transition-colors hover:bg-soft hover:text-text"
              title="Set to market price"
            >MID</button>
          </div>
        )}

        {/* Quantity */}
        <div className="mb-3 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Quantity</label>
          <span className="tnum text-xs text-text-muted">
            Total ≈ <Money value={orderType === "limit" ? limitTotal : orderTotal} compact />
          </span>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-soft hover:text-text"
          >−</button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="tnum h-9 flex-1 rounded-md border border-border bg-surface-lowest/60 text-center text-sm font-semibold text-text outline-none focus-ring"
          />
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-soft hover:text-text"
          >+</button>
        </div>

        {/* Execute */}
        {!confirm ? (
          <Button
            onClick={() => setConfirm(true)}
            disabled={submitting || (orderType === "limit" && !(parseFloat(limitPrice) > 0))}
            variant={side === "buy" ? "primary" : "danger"}
            className="w-full uppercase tracking-widest"
          >
            {side === "buy" ? "Buy" : "Sell"} {item.symbol}
          </Button>
        ) : (
          <div className="rounded-lg border border-border bg-surface-lowest/60 p-3">
            <p className="mb-1 text-xs font-semibold text-text">
              Confirm {orderType} {side} {quantity} × {item.symbol}?
            </p>
            <p className="tnum mb-2 text-[11px] text-text-muted">
              {orderType === "limit" ? (
                <>Limit price: <Money value={parseFloat(limitPrice)} /> · Total: <Money value={limitTotal} compact /></>
              ) : (
                <>Market price · Total: <Money value={orderTotal} compact /></>
              )}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={execute} loading={submitting} variant={side === "buy" ? "primary" : "danger"} className="flex-1">
                Confirm
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        )}
        <p className="mt-2 text-center text-[10px] text-text-faint">
          Commission: 0.1% ·{" "}
          {orderType === "limit"
            ? "Fills when price crosses limit (24/7)"
            : item.type === "STOCK" && !stockOpen
              ? "Queued — fills at market open"
              : side === "buy" ? "Uses cash" : "Adds cash"}
        </p>
      </div>
    </div>
  );
}

/** Compact X-axis label based on timeframe span. */
function tickLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
