import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ASSET_SEEDS } from "@/config/assets";

// name lookup from seed config — no extra DB call.
const NAME_BY_SYMBOL = Object.fromEntries(ASSET_SEEDS.map((a) => [a.symbol, a.name]));

export async function GET() {
  const markets = await prisma.marketData.findMany({
    orderBy: { type: "asc" },
    select: { symbol: true, type: true, currentPrice: true, volatility: true, lastUpdated: true },
  });
  const items = markets.map((m) => ({
    symbol: m.symbol,
    name: NAME_BY_SYMBOL[m.symbol] ?? m.symbol,
    type: m.type,
    price: Number(m.currentPrice),
    volatility: Number(m.volatility),
    lastUpdated: m.lastUpdated,
  }));
  return NextResponse.json({ markets: items });
}
