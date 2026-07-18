import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { userId: s.sub },
    orderBy: { type: "asc" },
    select: { symbol: true, name: true, type: true, quantity: true, averagePrice: true, currentPrice: true },
  });

  // Coerce Decimal fields to numbers so client-side arithmetic doesn't
  // choke on serialized strings.
  const out = assets.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    type: a.type,
    quantity: Number(a.quantity),
    averagePrice: Number(a.averagePrice),
    currentPrice: Number(a.currentPrice),
  }));

  return NextResponse.json({ assets: out });
}
