/**
 * Compute OHLC (candlestick) buckets from sorted price history.
 *
 * ponytail: no DB-side aggregation — group in-memory from PriceHistory.
 * MVP scale (<1000 points) makes this faster than a complex SQL query.
 * Switch to DB bucketing when chart pageviews exceed 10k/day.
 */
export type OHLC = { time: string; open: number; high: number; low: number; close: number };

export function computeOHLC(
  history: { price: number; tickAt: string }[],
  /** Bucket key derived from tickAt — e.g. ISO date "2026-07-06" for daily, ISO hour for hourly. */
  bucketKey: (d: string) => string,
): OHLC[] {
  const buckets = new Map<string, OHLC>();

  for (const h of history) {
    const key = bucketKey(h.tickAt);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        time: key,
        open: h.price,
        high: h.price,
        low: h.price,
        close: h.price,
      });
    } else {
      if (h.price > existing.high) existing.high = h.price;
      if (h.price < existing.low) existing.low = h.price;
      existing.close = h.price; // last price in bucket wins as close
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time.localeCompare(b.time));
}

/** Convenience: daily candles. */
export function dailyOHLC(history: { price: number; tickAt: string }[]): OHLC[] {
  return computeOHLC(history, (d: string) => d.slice(0, 10));
}

/** Hourly candles. */
export function hourlyOHLC(history: { price: number; tickAt: string }[]): OHLC[] {
  return computeOHLC(history, (d: string) => d.slice(0, 13));
}
