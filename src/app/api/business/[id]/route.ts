import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revenueForLevel, expenseForLevel, upgradeCost } from "@/config/businesses";

type HandlerFn = (uid: string, bizId: string) => Promise<Response>;

const actions: Record<string, HandlerFn> = {
  async upgrade(uid, bizId) {
    const biz = await prisma.business.findFirstOrThrow({ where: { id: bizId, ownerId: uid } });
    if (biz.level >= 10) return NextResponse.json({ error: "Already at max level (10)" }, { status: 422 });

    const cost = upgradeCost(biz.type, biz.level);
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { cash: true } });
    if (!user || user.cash < cost) return NextResponse.json(
      { error: `Insufficient balance. Need ${cost.toLocaleString("en-US")}` },
      { status: 422 },
    );

    const nextLevel = biz.level + 1;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: uid }, data: { cash: { decrement: cost } } });
      return tx.business.update({
        where: { id: bizId },
        data: {
          level: nextLevel,
          revenuePerTick: revenueForLevel(biz.type, nextLevel),
          expensePerTick: expenseForLevel(biz.type, nextLevel, biz.employeeCount),
        },
      });
    });
    return NextResponse.json({ ok: true, business: updated });
  },

  async hire(uid, bizId) {
    const biz = await prisma.business.findFirstOrThrow({ where: { id: bizId, ownerId: uid } });
    const nextEmp = biz.employeeCount + 1;
    const updated = await prisma.business.update({
      where: { id: bizId },
      data: { employeeCount: nextEmp, expensePerTick: expenseForLevel(biz.type, biz.level, nextEmp) },
    });
    return NextResponse.json({ ok: true, business: updated });
  },

  async fire(uid, bizId) {
    const biz = await prisma.business.findFirstOrThrow({ where: { id: bizId, ownerId: uid } });
    if (biz.employeeCount <= 1) return NextResponse.json({ error: "Minimum 1 employee" }, { status: 422 });
    const nextEmp = biz.employeeCount - 1;
    const updated = await prisma.business.update({
      where: { id: bizId },
      data: { employeeCount: nextEmp, expensePerTick: expenseForLevel(biz.type, biz.level, nextEmp) },
    });
    return NextResponse.json({ ok: true, business: updated });
  },

  async liquidate(uid, bizId) {
    const biz = await prisma.business.findFirstOrThrow({ where: { id: bizId, ownerId: uid } });
    const totalInvested = upgradeCost(biz.type, 1);
    const refund = Math.round(totalInvested * 0.4);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: uid }, data: { cash: { increment: refund } } });
      await tx.business.update({ where: { id: bizId }, data: { isActive: false } });
    });
    return NextResponse.json({ ok: true, refund });
  },
};

/**
 * POST /api/business/:id?action=upgrade|hire|fire|liquidate
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  if (!action || !(action in actions)) return NextResponse.json({ error: "Invalid action" }, { status: 422 });
  return actions[action]!(s.sub, id);
}
