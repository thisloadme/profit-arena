import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * POST /api/loans/:id/repay
 *
 * Repay any amount toward an active loan. Full repayment when amount >=
 * remainingAmount; partial otherwise (status stays ACTIVE). For P2P loans
 * the lender's cash is credited; bank/NPC loans (self-lent) exit the system.
 *
 * Body: { amount?: number } — defaults to remainingAmount (full).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  if (loan.borrowerId !== s.sub) return NextResponse.json({ error: "Not your loan" }, { status: 403 });
  if (loan.status !== "ACTIVE") return NextResponse.json({ error: "Loan is not active" }, { status: 422 });
  if (Number(loan.remainingAmount) <= 0) return NextResponse.json({ error: "Already paid" }, { status: 422 });

  // Parse optional partial amount
  const body = await req.json().catch(() => ({}));
  const remainingNum = Number(loan.remainingAmount);
  const payment = Math.min(
    typeof body.amount === "number" && body.amount > 0 ? body.amount : remainingNum,
    remainingNum,
  );

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { cash: true, username: true },
  });
  if (!user || Number(user.cash) < payment) {
    return NextResponse.json({ error: "Insufficient cash" }, { status: 422 });
  }

  const newRemaining = Math.round((remainingNum - payment) * 100) / 100;
  const isFullRepayment = newRemaining <= 0.01;
  const isP2P = loan.lenderId !== loan.borrowerId;

  // Atomic: only decrement cash if the borrower still has enough, and only
  // mutate the loan if it's still ACTIVE with at least `payment` remaining.
  // Prevents double-repay races where two concurrent requests both see the
  // same remainingAmount and borrower cash.
  const result = await prisma.$transaction(async (tx) => {
    const paid = await tx.user.updateMany({
      where: { id: s.sub, cash: { gte: payment } },
      data: { cash: { decrement: payment }, totalDebt: { decrement: payment } },
    });
    if (paid.count === 0) throw new Error("INSUFFICIENT_CASH");

    const settled = await tx.loan.updateMany({
      where: { id, status: "ACTIVE", remainingAmount: { gte: payment } },
      data: {
        remainingAmount: isFullRepayment ? 0 : newRemaining,
        status: isFullRepayment ? "PAID" : "ACTIVE",
      },
    });
    if (settled.count === 0) throw new Error("LOAN_CHANGED");

    // P2P: lender gets the cash back.
    if (isP2P) {
      await tx.user.update({
        where: { id: loan.lenderId },
        data: { cash: { increment: payment } },
      });
      await tx.transaction.create({
        data: {
          userId: loan.lenderId,
          type: "LOAN_PAYMENT",
          amount: payment,
          description: `Loan repayment from ${user.username ?? "borrower"}`,
        },
      });
    }

    await tx.transaction.create({
      data: {
        userId: s.sub,
        type: "LOAN_PAYMENT",
        amount: payment,
        description: isFullRepayment
          ? `Loan repaid (${loan.id.slice(0, 8)})`
          : `Partial payment on ${loan.id.slice(0, 8)}`,
      },
    });
    return true;
  }).catch((e: unknown) => {
    if (e instanceof Error && (e.message === "INSUFFICIENT_CASH" || e.message === "LOAN_CHANGED")) {
      return e.message;
    }
    throw e;
  });

  if (result === "INSUFFICIENT_CASH") {
    return NextResponse.json({ error: "Insufficient cash" }, { status: 422 });
  }
  if (result === "LOAN_CHANGED") {
    return NextResponse.json({ error: "Loan state changed, please retry" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, repaid: payment, remaining: isFullRepayment ? 0 : newRemaining });
}
