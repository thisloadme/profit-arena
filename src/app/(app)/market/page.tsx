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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Market</h1>
        <span className={cn("text-xs", connected ? "text-profit" : "text-text-faint")}>
          {connected ? "● live" : "○ connecting"}
        </span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded border border-border p-0.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t ? "bg-primary text-white" : "text-text-muted hover:bg-soft",
            )}
          >
            {TAB_LABEL[t] ?? t}
          </button>
        ))}
      </div>

      {/* Search + sort + watch filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <Input
            placeholder="Search symbol or name…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setWatchedOnly((v) => !v)}
          className={cn(
            "flex h-9 items-center gap-1 rounded-md border px-3 text-xs",
            watchedOnly
              ? "border-warning bg-warning-soft text-warning"
              : "border-border text-text-muted hover:bg-soft",
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
          className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-text-muted hover:bg-soft"
          title={`Sort: ${sortBy}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "symbol" ? "Name" : sortBy === "price" ? "Price" : "Change"}
        </button>
      </div>

      {/* Asset grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-text-faint">Loading market data…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-faint">No assets found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => {
            const change = changeMap[m.symbol] ?? 0;
            return (
              <button
                key={m.symbol}
                onClick={() => setSelected(m.symbol)}
                className="card-compact card-interactive relative flex cursor-pointer flex-col gap-1 text-left"
              >
                {watchedSymbols.includes(m.symbol) && (
                  <Star className="absolute right-1.5 top-1.5 h-3 w-3 fill-warning text-warning" />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text">{m.symbol}</span>
                  <span className="text-[10px] text-text-faint">{TAB_LABEL[m.type] ?? m.type}</span>
                </div>
                <span className="tnum text-sm font-semibold text-text">
                  <Money value={m.price} compact />
                </span>
                <PercentChange value={change} className="text-xs" />
                <span className="text-[10px] text-text-faint">
                  Vol: {(m.volatility * 100).toFixed(1)}%
                </span>
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
