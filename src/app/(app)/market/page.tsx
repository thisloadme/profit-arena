"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ArrowUpDown, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/use-socket";
import { MarketModal } from "@/components/features/market-modal";

type MarketItem = {
  symbol: string;
  name: string;
  type: string;
  price: number;
  volatility: number;
};

const TABS = ["All", "STOCK", "CRYPTO", "BOND", "MUTUAL_FUND"] as const;
const TAB_LABEL: Record<string, string> = {
  All: "All",
  STOCK: "Stocks",
  CRYPTO: "Crypto",
  BOND: "Bonds",
  MUTUAL_FUND: "Mutual Funds",
};

type SortKey = "symbol" | "price" | "changePct";

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

  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.markets ?? []);
        setLoading(false);
      });
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d) => { if (d.symbols) setWatchedSymbols(d.symbols); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: { tick: number; prices: { symbol: string; price: number; changePct: number }[] }) => {
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
    return () => {
      socket.off("market:update", handler);
    };
  }, [socket]);

  const filtered = useMemo(() => {
    let list = tab === "All" ? items : items.filter((m) => m.type === tab);
    if (watchedOnly) list = list.filter((m) => watchedSymbols.includes(m.symbol));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "symbol") return a.symbol.localeCompare(b.symbol);
      if (sortBy === "price") return b.price - a.price;
      const ca = changeMap[a.symbol] ?? 0;
      const cb = changeMap[b.symbol] ?? 0;
      if (sortBy === "changePct") return cb - ca;
      return 0;
    });
    return list;
  }, [items, tab, search, sortBy, changeMap, watchedOnly, watchedSymbols]);

  const selectedItem = selected ? items.find((m) => m.symbol === selected) ?? null : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Trading Floor
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-text">Market Arena</h1>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
            connected
              ? "border-profit/30 bg-profit/10 text-profit"
              : "border-border text-text-faint",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-profit" : "bg-text-faint")} />
          {connected ? "LIVE" : "CONNECTING"}
        </span>
      </header>

      {/* Pill tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              tab === t
                ? "bg-primary text-on-primary glow-primary"
                : "border border-border text-text-muted hover:bg-soft hover:text-text",
            )}
          >
            {TAB_LABEL[t] ?? t}
          </button>
        ))}
      </div>

      {/* Controls: search + watch + sort */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <Input
            placeholder="Search symbol or name…"
            className="rounded-full pl-9 ring-1 ring-border focus:ring-2 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setWatchedOnly((v) => !v)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            watchedOnly
              ? "border-warning bg-warning-soft text-warning"
              : "border-border text-text-muted hover:bg-soft hover:text-text",
          )}
          title="Show watched only"
        >
          <Star className={cn("h-3 w-3", watchedOnly && "fill-warning")} />
          {watchedOnly ? "Watched" : "Watch"}
        </button>
        <button
          onClick={() =>
            setSortBy((s) => (s === "symbol" ? "price" : s === "price" ? "changePct" : "symbol"))
          }
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-text-muted transition-colors hover:bg-soft hover:text-text"
          title={`Sort: ${sortBy}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "symbol" ? "Name" : sortBy === "price" ? "Price" : "Change"}
        </button>
      </div>

      {/* List header row (desktop only) */}
      <div className="glass-panel mb-2 hidden items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-faint md:flex">
        <span className="w-1/3">Asset</span>
        <span className="w-1/6 text-right">Price</span>
        <span className="w-1/6 text-right">24h Change</span>
        <span className="w-1/6 text-right">Volatility</span>
        <span className="w-1/6 text-right">Type</span>
      </div>

      {/* Asset list — glass rows instead of card grid */}
      {loading ? (
        <div className="glass-panel py-16 text-center text-sm text-text-faint">
          Loading market data…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel py-16 text-center text-sm text-text-faint">
          No assets found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => {
            const change = changeMap[m.symbol] ?? 0;
            const watched = watchedSymbols.includes(m.symbol);
            return (
              <button
                key={m.symbol}
                onClick={() => setSelected(m.symbol)}
                className="glass-panel card-interactive group flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition-all hover:border-primary/40"
              >
                {/* Icon tile + symbol */}
                <div className="flex w-1/3 items-center gap-3 md:w-1/3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
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

                {/* Price (mobile + desktop) */}
                <div className="ml-auto flex flex-col items-end md:ml-0 md:w-1/6 md:items-end">
                  <span className="tnum text-sm font-bold text-text">
                    <Money value={m.price} compact />
                  </span>
                  <span className="text-[10px] text-text-faint md:hidden">price</span>
                </div>

                {/* Change (desktop only — mobile shows below) */}
                <div className="hidden w-1/6 items-center justify-end md:flex">
                  <PercentChange value={change} className="text-xs" />
                </div>

                {/* Volatility (desktop) */}
                <div className="hidden w-1/6 text-right md:block">
                  <span className="tnum text-xs text-text-muted">
                    {(m.volatility * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Type (desktop) */}
                <div className="hidden w-1/6 text-right md:block">
                  <span className="text-[10px] uppercase tracking-wide text-text-faint">
                    {TAB_LABEL[m.type] ?? m.type}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <MarketModal
          symbol={selectedItem.symbol}
          name={selectedItem.name}
          type={selectedItem.type}
          currentPrice={selectedItem.price}
          volatility={selectedItem.volatility}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
