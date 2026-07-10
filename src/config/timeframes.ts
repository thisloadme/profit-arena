/**
 * Chart timeframes, in game-time units.
 * 1 row in PriceHistory = 1 game-minute (1 tick). See TICKS_PER_GAME_DAY in game.ts.
 */

export type TimeframeId = "15m" | "30m" | "1h" | "1d" | "1w" | "1M" | "3M";

export type Timeframe = {
  id: TimeframeId;
  /** Short label for the pill button. */
  label: string;
  /** How many PriceHistory rows this timeframe spans (= game-minutes). */
  ticks: number;
  /** How many rows collapse into one OHLC candle. */
  bucketSize: number;
};

export const TIMEFRAMES: readonly Timeframe[] = [
  { id: "15m", label: "15M", ticks: 15, bucketSize: 1 },
  { id: "30m", label: "30M", ticks: 30, bucketSize: 2 },
  { id: "1h", label: "1H", ticks: 60, bucketSize: 4 },
  { id: "1d", label: "1D", ticks: 1440, bucketSize: 48 },
  { id: "1w", label: "1W", ticks: 1440 * 7, bucketSize: 336 },
  { id: "1M", label: "1M", ticks: 1440 * 30, bucketSize: 1440 },
  { id: "3M", label: "3M", ticks: 1440 * 90, bucketSize: 1440 * 3 },
] as const;

export const DEFAULT_TIMEFRAME: TimeframeId = "1d";

export function getTimeframe(id: string | null | undefined): Timeframe {
  return TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES.find((t) => t.id === DEFAULT_TIMEFRAME)!;
}

/**
 * Max history retention: 3 game-months of ticks.
 * Used by the periodic prune in tick-scheduler to bound table growth.
 */
export const MAX_RETENTION_TICKS = 1440 * 90;

/**
 * Run the retention prune every N ticks. Cheap delete; frequent enough that the
 * table never drifts far past the cap. 1000 ticks ≈ 2.7h real-time at 10s/tick.
 */
export const PRUNE_EVERY_TICKS = 1000;
