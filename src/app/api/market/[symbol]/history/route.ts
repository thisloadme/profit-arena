import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bucketByCount, type OHLC } from "@/lib/ohlc";
import { getTimeframe } from "@/config/timeframes";
import { GAME_CONFIG } from "@/config/game";

/**
 * Price history for a single asset, bucketed into OHLC candles for the given
 * game-time timeframe.
 *
 * ?timeframe=15m|30m|1h|1d|1w|1M|3M (default 1d)
 *
 * One PriceHistory row = one game-minute tick. The latest row corresponds to
 * the current game-time (SimulationState.tickNumber). Older rows map to
 * earlier game-minutes; the candle `time` label is computed from that offset.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const url = new URL(_req.url);
  const tf = getTimeframe(url.searchParams.get("timeframe"));

  const history = await prisma.priceHistory.findMany({
    where: { symbol },
    orderBy: { tickAt: "desc" },
    take: tf.ticks,
    select: { price: true },
  });

  if (history.length === 0) {
    return NextResponse.json({ candles: [] as OHLC[] });
  }

  // Oldest → newest. `currentTick` = game-minute index of the newest row.
  const reversed = history.map((r) => ({ price: Number(r.price) })).reverse();
  const currentTick = await getCurrentTick();
  const oldestTick = currentTick - (reversed.length - 1);

  const candles = bucketByCount(reversed, tf.bucketSize, (i) =>
    new Date(
      GAME_CONFIG.GAME_START_DATE.getTime() + (oldestTick + i) * 60_000,
    ).toISOString(),
  );

  return NextResponse.json({ candles });
}

async function getCurrentTick(): Promise<number> {
  const state = await prisma.simulationState.findUnique({ where: { id: 1 } });
  return state?.tickNumber ?? 0;
}
