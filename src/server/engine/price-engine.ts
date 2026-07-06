import { gaussian } from "./rng";

export type AssetMarket = {
  symbol: string;
  currentPrice: number;
  volatility: number; // 0..1
  trendFactor: number; // -1..1 (per-tick drift)
};

export type ActiveEventImpact = {
  volatilityMult: number;
  trendShift: number;
};

export type PriceUpdate = {
  symbol: string;
  newPrice: number;
  changePct: number;
};

/**
 * Random Walk + volatility + macro trend + event impact + trade volume.
 *
 *   nextPrice = currentPrice * (1 + drift + shock + volumeImpact)
 *   drift     = trendFactor + Σ(event.trendShift)
 *   shock     = volatility * volatilityMult * gaussian()
 *   volumeImpact = netVolume * VOLUME_WEIGHT
 *
 * Price floored at MIN_PRICE to stay positive.
 */
const MIN_PRICE = 0.01;

/** How much 1 net unit of trade moves the price (as a fraction). */
const VOLUME_WEIGHT = 0.0001;

// ponytail: in-memory Map. Redis or per-symbol counters if multi-process needed.
const tradeVolume = new Map<string, number>();

/**
 * Record a trade for volume-based price impact.
 * Called from trade API endpoints (buy/sell).
 * @param symbol asset symbol
 * @param netUnits positive = net buy, negative = net sell
 */
export function recordTrade(symbol: string, netUnits: number): void {
  const current = tradeVolume.get(symbol) ?? 0;
  tradeVolume.set(symbol, current + netUnits);
}

/**
 * Consume accumulated volume for a symbol and reset it for next tick.
 */
export function consumeVolume(symbol: string): number {
  const net = tradeVolume.get(symbol) ?? 0;
  tradeVolume.delete(symbol);
  return net;
}

export function nextPriceFor(
  asset: AssetMarket,
  impacts: ActiveEventImpact[] = [],
  netVolume?: number,
): PriceUpdate {
  const drift = asset.trendFactor + impacts.reduce((s, e) => s + e.trendShift, 0);
  const volMult = impacts.reduce((m, e) => m * e.volatilityMult, 1);
  const shock = asset.volatility * volMult * gaussian();
  const volumeImpact = (netVolume ?? 0) * VOLUME_WEIGHT;

  const rawReturn = drift + shock + volumeImpact;
  const newPrice = Math.max(MIN_PRICE, asset.currentPrice * (1 + rawReturn));
  const changePct = ((newPrice - asset.currentPrice) / asset.currentPrice) * 100;

  return { symbol: asset.symbol, newPrice, changePct };
}

/**
 * Ponytail self-check — runs when file executed directly.
 * Verifies the engine produces sane values across 10k simulations:
 *  - mean of returns ≈ 0 (within 3 std errors of the mean for vol=0.02)
 *  - no negative prices
 *  - no NaN
 */
if (require.main === module) {
  const N = 10_000;
  const asset: AssetMarket = {
    symbol: "TEST",
    currentPrice: 100,
    volatility: 0.02,
    trendFactor: 0,
  };
  const returns: number[] = [];
  let minPrice = Infinity;
  let nanCount = 0;

  for (let i = 0; i < N; i++) {
    const a = { ...asset };
    const r = nextPriceFor(a, []);
    returns.push(r.changePct);
    if (!Number.isFinite(r.newPrice) || !Number.isFinite(r.changePct)) nanCount++;
    minPrice = Math.min(minPrice, r.newPrice);
  }

  const mean = returns.reduce((s, r) => s + r, 0) / N;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / N;
  const std = Math.sqrt(variance);
  const stderr = std / Math.sqrt(N);

  // Sanity: mean should be within ~3 stderr of 0 (true drift = 0).
  const meanOk = Math.abs(mean) < 3 * stderr + 1e-9;
  const priceOk = minPrice >= MIN_PRICE;
  const nanOk = nanCount === 0;

  console.log({ N, mean, std, stderr, minPrice, nanCount, meanOk, priceOk, nanOk });

  if (!meanOk || !priceOk || !nanOk) {
    console.error("FAIL: price engine self-check did not pass.");
    process.exit(1);
  }
  console.log("OK: price engine self-check passed.");
}
