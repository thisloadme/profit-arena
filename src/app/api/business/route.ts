import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getBusinessType, setupCost, revenueForLevel, expenseForLevel } from "@/config/businesses";
import { getTickerState } from "@/server/engine/tick-scheduler";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.string().min(1),
});

/**
 * POST /api/business — create a new business.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { name, type } = parsed.data;

  const bt = getBusinessType(type);
  if (!bt) return NextResponse.json({ error: "Unknown business type" }, { status: 404 });

  const cost = setupCost(type);
  const user = await prisma.user.findUnique({ where: { id: s.sub }, select: { cash: true } });
  if (!user || user.cash < cost) return NextResponse.json(
    { error: `Insufficient balance. Need ${cost.toLocaleString("en-US")}` },
    { status: 422 },
  );

  const ticker = getTickerState();
  const biz = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: s.sub }, data: { cash: { decrement: cost } } });
    return tx.business.create({
      data: {
        ownerId: s.sub,
        name,
        type,
        revenuePerTick: revenueForLevel(type, 1),
        expensePerTick: expenseForLevel(type, 1, 1),
        employeeCount: 1,
        createdAtTick: ticker.tickNumber,
      },
    });
  });

  return NextResponse.json({ ok: true, business: biz });
}

/**
 * GET /api/business — list user's businesses.
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const list = await prisma.business.findMany({
    where: all ? { ownerId: s.sub } : { ownerId: s.sub, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ businesses: list });
}
