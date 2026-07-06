import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkTradeLimit } from "@/lib/rate-limiter";
import { GAME_CONFIG } from "@/config/game";

const sellSchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive(),
});

export async function POST(req: Request) {
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
    select: { currentPrice: true },
  });
  if (!market) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const asset = await prisma.asset.findUnique({
    where: { userId_symbol: { userId: session.sub, symbol } },
    select: { id: true, quantity: true },
  });
  if (!asset || asset.quantity < quantity) {
    return NextResponse.json(
      { error: `Don't have ${quantity} × ${symbol}. Only ${asset?.quantity ?? 0} available.` },
      { status: 422 },
    );
  }

  const totalCredit = market.currentPrice * quantity;
  const remaining = asset.quantity - quantity;

  const trade = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.sub },
      data: { cash: { increment: totalCredit } },
    });

    if (remaining <= 0) {
      await tx.asset.delete({ where: { id: asset.id } });
    } else {
      await tx.asset.update({
        where: { id: asset.id },
        data: { quantity: remaining },
      });
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
  });

  return NextResponse.json({ ok: true, trade });
}
