import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { GAME_CONFIG } from "@/config/game";

/**
 * GET /api/bank/offer — returns max loan from bank based on credit score & net worth.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, credit] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.sub }, select: { netWorth: true } }),
    prisma.creditScore.findUnique({ where: { userId: s.sub }, select: { score: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const score = credit?.score ?? GAME_CONFIG.CREDIT_SCORE_DEFAULT;
  const maxLoan = Math.max(0, user.netWorth * GAME_CONFIG.BANK_MAX_LOAN_TO_NETWORTH);
  const rate = GAME_CONFIG.BANK_BASE_RATE_MONTHLY;
  const eligible = score >= GAME_CONFIG.BANK_MIN_CREDIT_SCORE && user.netWorth > 0;

  return NextResponse.json({ eligible, maxLoan, rate, creditScore: score });
}

/**
 * POST /api/bank/loan — take a loan from the bank NPC.
 * Body: { amount, tenorMonths }
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { amount, tenorMonths } = await req.json().catch(() => ({}));
  if (!amount || !tenorMonths || amount <= 0 || tenorMonths < 1) {
    return NextResponse.json({ error: "amount & tenorMonths required" }, { status: 422 });
  }

  const [user, credit] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.sub }, select: { netWorth: true } }),
    prisma.creditScore.findUnique({ where: { userId: s.sub }, select: { score: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const score = credit?.score ?? GAME_CONFIG.CREDIT_SCORE_DEFAULT;
  if (score < GAME_CONFIG.BANK_MIN_CREDIT_SCORE) {
    return NextResponse.json({ error: "Credit score too low" }, { status: 422 });
  }

  const maxLoan = Math.max(0, user.netWorth * GAME_CONFIG.BANK_MAX_LOAN_TO_NETWORTH);
  if (amount > maxLoan) {
    return NextResponse.json({ error: `Max loan ${maxLoan.toLocaleString("en-US")}` }, { status: 422 });
  }

  const rate = GAME_CONFIG.BANK_BASE_RATE_MONTHLY;
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + tenorMonths);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: s.sub }, data: { cash: { increment: amount } } });
    await tx.loan.create({
      data: {
        lenderId: s.sub, // bank loans are self-lent (internal)
        borrowerId: s.sub,
        amount,
        interestRate: rate,
        tenorMonths,
        remainingAmount: amount,
        status: "ACTIVE",
        dueDate,
      },
    });
  });

  return NextResponse.json({ ok: true, amount, rate, dueDate });
}
