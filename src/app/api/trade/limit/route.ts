import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkTradeLimit } from "@/lib/rate-limiter";
import { GAME_CONFIG } from "@/config/game";
import { isCrossOriginPost } from "@/lib/csrf-guard";

const limitSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  limitPrice: z.number().positive(),
});

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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = limitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }
  const { symbol, type, quantity, limitPrice } = parsed.data;

  // Validate asset exists
  const market = await prisma.marketData.findUnique({
    where: { symbol },
    select: { currentPrice: true, type: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Create pending limit order
  const order = await prisma.limitOrder.create({
    data: { userId: session.sub, symbol, type, quantity, limitPrice },
  });

  return NextResponse.json({ ok: true, order });
}
