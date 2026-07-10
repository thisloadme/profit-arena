/**
 * OHLC (candlestick) helpers.
 *
 * ponytail: no DB-side aggregation — group in-memory from PriceHistory.
 * MVP scale (<1000 points) makes this faster than a complex SQL query.
 * Switch to DB bucketing when chart pageviews exceed 10k/day.
 */
export type OHLC = { time: string; open: number; high: number; low: number; close: number };

/**
 * Bucket `history` (oldest→newest) into OHLC candles by grouping `bucketSize`
 * consecutive rows per candle. Each candle's `time` is the game-time ISO string
 * of its last row, computed by the caller from the tick offset.
 *
 * One row = one game-minute tick. `bucketSize` = game-minutes per candle.
 */
export function bucketByCount(
  history: { price: number }[],
  bucketSize: number,
  /** Game-time ISO string for the row at history index `i` (i = 0 oldest). */
  gameTimeAt: (i: number) => string,
): OHLC[] {
  if (bucketSize <= 1) {
    return history.map((h, i) => ({ time: gameTimeAt(i), open: h.price, high: h.price, low: h.price, close: h.price }));
  }
  const out: OHLC[] = [];
  for (let i = 0; i < history.length; i += bucketSize) {
    const slice = history.slice(i, i + bucketSize);
    const prices = slice.map((s) => s.price);
    out.push({
      time: gameTimeAt(i + slice.length - 1),
      open: prices[0]!,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1]!,
    });
  }
  return out;
}
