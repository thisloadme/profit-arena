import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { GAME_CONFIG } from "@/config/game";

/**
 * POST /api/loans/:id/accept — borrower accepts a PENDING offer.
 * Cash locked inside $transaction: lender's cash deducted, borrower's increased.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  if (loan.status !== "PENDING") return NextResponse.json({ error: "Already taken or inactive" }, { status: 422 });
  if (loan.lenderId === s.sub) return NextResponse.json({ error: "Cannot take your own loan" }, { status: 422 });

  const [lender, borrower] = await Promise.all([
    prisma.user.findUnique({ where: { id: loan.lenderId }, select: { cash: true } }),
    prisma.user.findUnique({ where: { id: s.sub }, select: { cash: true } }),
  ]);
  if (!lender || lender.cash < loan.amount) return NextResponse.json(
    { error: "Lender does not have sufficient balance" },
    { status: 422 },
  );

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + loan.tenorMonths);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: loan.lenderId }, data: { cash: { decrement: loan.amount } } });
    await tx.user.update({ where: { id: s.sub }, data: { cash: { increment: loan.amount } } });
    await tx.loan.update({
      where: { id },
      data: { borrowerId: s.sub, status: "ACTIVE", dueDate },
    });
  });

  return NextResponse.json({ ok: true, dueDate });
}
