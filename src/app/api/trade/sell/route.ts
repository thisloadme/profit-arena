import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkTradeLimit } from "@/lib/rate-limiter";
import { GAME_CONFIG } from "@/config/game";
import { isMarketOpen } from "@/server/engine/tick-scheduler";
import { isCrossOriginPost } from "@/lib/csrf-guard";

const sellSchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive(),
});

export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkTradeLimit(session.sub)) {
    return NextResponse.json({ error: `Max ${GAME_CONFIG.MAX_TRADES_PER_TICK} trades per tick` }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = sellSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }
  const { symbol, quantity } = parsed.data;

  const market = await prisma.marketData.findUnique({
    where: { symbol },
    select: { currentPrice: true, type: true },
  });
  if (!market) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const asset = await prisma.asset.findUnique({
    where: { userId_symbol: { userId: session.sub, symbol } },
    select: { id: true, quantity: true },
  });
  if (!asset || Number(asset.quantity) < quantity) {
    return NextResponse.json(
      { error: `Don't have ${quantity} × ${symbol}. Only ${asset ? Number(asset.quantity) : 0} available.` },
      { status: 422 },
    );
  }

  // Stocks only trade during market hours. When closed, a MARKET sell is
  // queued and fills at the next market-open price. Limit sells run 24/7.
  if (market.type === "STOCK" && !isMarketOpen("STOCK")) {
    const order = await prisma.limitOrder.create({
      // limitPrice null = queued market order (fills at next open).
      // Cast for transition until prisma generate picks up the Float? change.
      data: { userId: session.sub, symbol, type: "SELL", quantity, limitPrice: null as unknown as number },
    });
    return NextResponse.json({
      ok: true,
      queued: true,
      orderId: order.id,
      message: `Market closed. Sell order queued — executes at next open (${quantity} × ${symbol}).`,
    });
  }

  const totalCredit = Number(market.currentPrice) * quantity;

  // Atomic write: decrement quantity only if the user still holds enough.
  // Guards against the TOCTOU race where two concurrent sells both passed
  // the pre-txn check but only one set of shares exists.
  const trade = await prisma.$transaction(async (tx) => {
    const decremented = await tx.asset.updateMany({
      where: { id: asset.id, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (decremented.count === 0) throw new Error("INSUFFICIENT_SHARES");

    // Credit cash either way.
    await tx.user.update({
      where: { id: session.sub },
      data: { cash: { increment: totalCredit } },
    });

    // Drop the position if it hit zero (read current value post-decrement).
    const after = await tx.asset.findUnique({
      where: { id: asset.id },
      select: { quantity: true },
    });
    if (after && Number(after.quantity) <= 0) {
      await tx.asset.delete({ where: { id: asset.id } });
    }

    await tx.transaction.create({
      data: {
        userId: session.sub,
        type: "SELL",
        amount: totalCredit,
        description: `Sold ${quantity} × ${symbol}`,
        relatedAsset: symbol,
      },
    });

    return { credit: totalCredit, quantity, symbol, price: market.currentPrice };
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "INSUFFICIENT_SHARES") return null;
    throw e;
  });

  if (!trade) {
    return NextResponse.json(
      { error: `Don't have ${quantity} × ${symbol} anymore.` },
      { status: 422 },
    );
  }

  // ponytail: anti-cheat — flag unusually large sells
  if (quantity > 100_000) {
    console.log("[anti-cheat] large sell", { userId: session.sub, symbol, quantity, credit: totalCredit });
  }

  return NextResponse.json({ ok: true, trade });
}
