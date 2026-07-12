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
  if (loan.remainingAmount <= 0) return NextResponse.json({ error: "Already paid" }, { status: 422 });

  // Parse optional partial amount
  const body = await req.json().catch(() => ({}));
  const payment = Math.min(
    typeof body.amount === "number" && body.amount > 0 ? body.amount : loan.remainingAmount,
    loan.remainingAmount,
  );

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { cash: true, username: true },
  });
  if (!user || user.cash < payment) {
    return NextResponse.json({ error: "Insufficient cash" }, { status: 422 });
  }

  const newRemaining = Math.round((loan.remainingAmount - payment) * 100) / 100;
  const isFullRepayment = newRemaining <= 0.01;
  const isP2P = loan.lenderId !== loan.borrowerId;

  await prisma.$transaction(async (tx) => {
    // Borrower: cash down, debt down.
    await tx.user.update({
      where: { id: s.sub },
      data: {
        cash: { decrement: payment },
        totalDebt: { decrement: payment },
      },
    });

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

    await tx.loan.update({
      where: { id },
      data: {
        remainingAmount: isFullRepayment ? 0 : newRemaining,
        status: isFullRepayment ? "PAID" : "ACTIVE",
      },
    });

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
  });

  return NextResponse.json({ ok: true, repaid: payment, remaining: isFullRepayment ? 0 : newRemaining });
}
