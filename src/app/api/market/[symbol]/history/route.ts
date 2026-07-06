import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dailyOHLC, hourlyOHLC } from "@/lib/ohlc";

/**
 * Price history for a single asset.
 * Returns raw price points + OHLC candlesticks.
 *
 * ?candles=daily (default) | hourly | none
 * ?limit=N (default 90)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const url = new URL(_req.url);
  const candleMode = url.searchParams.get("candles") ?? "daily";
  const limit = Math.min(500, parseInt(url.searchParams.get("limit") ?? "90"));

  const history = await prisma.priceHistory.findMany({
    where: { symbol },
    orderBy: { tickAt: "desc" },
    take: limit,
    select: { price: true, tickAt: true },
  });

  const reversed = history.reverse();
  const prices = reversed.map((h) => ({ price: h.price, tickAt: h.tickAt.toISOString() }));

  let candles: unknown = null;
  if (candleMode === "daily") candles = dailyOHLC(prices);
  else if (candleMode === "hourly") candles = hourlyOHLC(prices);

  return NextResponse.json({ history: prices, candles });
}
