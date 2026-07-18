import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkTradeLimit } from "@/lib/rate-limiter";
import { GAME_CONFIG } from "@/config/game";
import { isMarketOpen } from "@/server/engine/tick-scheduler";
import { isCrossOriginPost } from "@/lib/csrf-guard";

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
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

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

  const totalCost = Number(market.currentPrice) * quantity;
  // Fast-path friendly check (real guard is the atomic conditional write below).
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { cash: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (Number(user.cash) < totalCost) {
    return NextResponse.json(
      { error: `Insufficient balance. Need ${totalCost.toLocaleString("en-US")}` },
      { status: 422 },
    );
  }

  // Stocks only trade during market hours. When closed, a MARKET order is
  // queued and fills at the next market-open price (real exchange behavior).
  // Limit orders always route through /api/trade/limit and fill 24/7.
  if (market.type === "STOCK" && !isMarketOpen("STOCK")) {
    const order = await prisma.limitOrder.create({
      // limitPrice null = queued market order (fills at next open).
      // Cast for transition until prisma generate picks up the Float? change.
      data: { userId: session.sub, symbol, type: "BUY", quantity, limitPrice: null as unknown as number },
    });
    return NextResponse.json({
      ok: true,
      queued: true,
      orderId: order.id,
      message: `Market closed. Buy order queued — executes at next open (${quantity} × ${symbol}).`,
    });
  }

  // Atomic write: decrement cash only if the user still has enough.
  // This is the real guard against the TOCTOU race — two concurrent buys
  // can't both succeed once cash is spent, because updateMany's WHERE is
  // evaluated atomically inside the transaction.
  const trade = await prisma.$transaction(async (tx) => {
    const spent = await tx.user.updateMany({
      where: { id: session.sub, cash: { gte: totalCost } },
      data: { cash: { decrement: totalCost } },
    });
    if (spent.count === 0) throw new Error("INSUFFICIENT_BALANCE");

    const existing = await tx.asset.findUnique({
      where: { userId_symbol: { userId: session.sub, symbol } },
      select: { id: true, quantity: true, averagePrice: true },
    });

    if (existing) {
      const curQty = Number(existing.quantity);
      const curAvg = Number(existing.averagePrice);
      const newQty = curQty + quantity;
      const newAvg = (curAvg * curQty + Number(market.currentPrice) * quantity) / newQty;
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
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") return null;
    throw e;
  });

  if (!trade) {
    return NextResponse.json(
      { error: `Insufficient balance. Need ${totalCost.toLocaleString("en-US")}` },
      { status: 422 },
    );
  }

  // ponytail: first trade tracking for analytics
  console.log("[event] buy", { userId: session.sub, symbol, quantity, cost: totalCost });

  // ponytail: anti-cheat — flag unusually large buys
  if (quantity > 100_000) {
    console.log("[anti-cheat] large buy", { userId: session.sub, symbol, quantity, cost: totalCost });
  }

  return NextResponse.json({ ok: true, trade });
}
