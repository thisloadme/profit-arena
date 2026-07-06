import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { GAME_CONFIG } from "@/config/game";

const createOfferSchema = z.object({
  amount: z.number().positive(),
  interestRate: z.number().min(0.001).max(0.5),
  tenorMonths: z.number().int().min(1).max(24),
});

/**
 * POST /api/loans — create a P2P lending offer.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createOfferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { amount, interestRate, tenorMonths } = parsed.data;

  // Check cash (lender must have the money)
  const user = await prisma.user.findUnique({ where: { id: s.sub }, select: { cash: true } });
  if (!user || user.cash < amount) return NextResponse.json(
    { error: `Saldo tidak cukup. Butuh ${amount.toLocaleString("id-ID")}` },
    { status: 422 },
  );

  const offer = await prisma.loan.create({
    data: {
      lenderId: s.sub,
      amount,
      interestRate,
      tenorMonths,
      remainingAmount: amount,
      status: "PENDING",
    },
  });
  return NextResponse.json({ ok: true, loan: offer });
}

/**
 * GET /api/loans — list offers or my loans.
 * ?list=offers → marketplace (all PENDING)
 * ?list=mine → loans given/taken by current user
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list") ?? "mine";

  if (list === "offers") {
    const offers = await prisma.loan.findMany({
      where: { status: "PENDING", lenderId: { not: s.sub } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { lender: { select: { username: true } } },
    });
    return NextResponse.json({ loans: offers });
  }

  // mine
  const [given, taken] = await Promise.all([
    prisma.loan.findMany({
      where: { lenderId: s.sub },
      orderBy: { createdAt: "desc" },
      include: { borrower: { select: { username: true } } },
    }),
    prisma.loan.findMany({
      where: { borrowerId: s.sub, NOT: { status: "PENDING" } },
      orderBy: { createdAt: "desc" },
      include: { lender: { select: { username: true } } },
    }),
  ]);
  return NextResponse.json({ given, taken });
}
