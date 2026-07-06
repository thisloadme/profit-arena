import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkTradeLimit } from "@/lib/rate-limiter";
import { GAME_CONFIG } from "@/config/game";

const buySchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive(),
});

/**
 * Buy an asset. Server-authoritative.
 *
 * ponytail: pre-validate all conditions before the transaction to keep
 * the ACID window short. Rate limit: max N trades per tick.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!checkTradeLimit(session.sub)) {
    return NextResponse.json({ error: `Max ${GAME_CONFIG.MAX_TRADES_PER_TICK} trades per tick` }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = buySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }
  const { symbol, quantity } = parsed.data;

  // Fetch canonical price + type.
  const market = await prisma.marketData.findUnique({
    where: { symbol },
    select: { currentPrice: true, type: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const totalCost = market.currentPrice * quantity;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { cash: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.cash < totalCost) {
    return NextResponse.json(
      { error: `Insufficient balance. Need ${totalCost.toLocaleString("en-US")}` },
      { status: 422 },
    );
  }

  // All good — do the atomic write.
  const trade = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.sub },
      data: { cash: { decrement: totalCost } },
    });

    const existing = await tx.asset.findUnique({
      where: { userId_symbol: { userId: session.sub, symbol } },
      select: { id: true, quantity: true, averagePrice: true },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg =
        (existing.averagePrice * existing.quantity + market.currentPrice * quantity) / newQty;
      await tx.asset.update({
        where: { id: existing.id },
        data: { quantity: newQty, averagePrice: newAvg, currentPrice: market.currentPrice },
      });
    } else {
      await tx.asset.create({
        data: {
          userId: session.sub,
          symbol,
          type: market.type,
          name: symbol,
          quantity,
          averagePrice: market.currentPrice,
          currentPrice: market.currentPrice,
        },
      });
    }

    await tx.transaction.create({
      data: {
        userId: session.sub,
        type: "BUY",
        amount: -totalCost,
        description: `Bought ${quantity} × ${symbol}`,
        relatedAsset: symbol,
      },
    });

    return { cost: totalCost, quantity, symbol, price: market.currentPrice };
  });

  // ponytail: first trade tracking for analytics
  console.log("[event] buy", { userId: session.sub, symbol, quantity, cost: totalCost });

  return NextResponse.json({ ok: true, trade });
}
