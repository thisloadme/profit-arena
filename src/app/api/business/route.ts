import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getBusinessType, setupCost, revenueForLevel, expenseForLevel, effectiveWage } from "@/config/businesses";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";
import { isCrossOriginPost } from "@/lib/csrf-guard";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.string().min(1),
});

/**
 * POST /api/business — create a new business.
 */
export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkUserRateLimit(s.sub, 5)) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { name, type } = parsed.data;

  const bt = getBusinessType(type);
  if (!bt) return NextResponse.json({ error: "Unknown business type" }, { status: 404 });

  const cost = setupCost(type);
  const user = await prisma.user.findUnique({ where: { id: s.sub }, select: { cash: true } });
  if (!user || Number(user.cash) < cost) return NextResponse.json(
    { error: `Insufficient balance. Need ${cost.toLocaleString("en-US")}` },
    { status: 422 },
  );

  const ticker = getTickerState();
  const wage = effectiveWage(type, 0); // default wage at creation
  const biz = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: s.sub }, data: { cash: { decrement: cost } } });
    return tx.business.create({
      data: {
        ownerId: s.sub,
        name,
        type,
        revenuePerTick: revenueForLevel(type, 1),
        expensePerTick: expenseForLevel({ type, level: 1, employees: 1, wage }),
        employeeCount: 1,
        salaryPerEmployee: wage,
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
  const out = list.map((b) => ({
    ...b,
    revenuePerTick: Number(b.revenuePerTick),
    expensePerTick: Number(b.expensePerTick),
    salaryPerEmployee: Number(b.salaryPerEmployee),
  }));
  return NextResponse.json({ businesses: out });
}
