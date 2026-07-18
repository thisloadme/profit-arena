import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
    prisma.user.findUnique({
      where: { id: loan.lenderId },
      select: { cash: true, username: true },
    }),
    prisma.user.findUnique({
      where: { id: s.sub },
      select: { cash: true, username: true },
    }),
  ]);
  if (!lender || lender.cash < loan.amount) return NextResponse.json(
    { error: "Lender does not have sufficient balance" },
    { status: 422 },
  );
  if (!borrower) return NextResponse.json({ error: "Borrower not found" }, { status: 404 });

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + loan.tenorMonths);

  // The status transition PENDING → ACTIVE is the single source of truth.
  // Atomically guarded by updateMany's WHERE clause: only one concurrent
  // request can win the race. The lender cash decrement is also guarded
  // so the loan can't drain a lender who spent the cash elsewhere.
  const accepted = await prisma.$transaction(async (tx) => {
    const claimed = await tx.loan.updateMany({
      where: { id, status: "PENDING" },
      data: { borrowerId: s.sub, status: "ACTIVE", dueDate },
    });
    if (claimed.count === 0) throw new Error("ALREADY_TAKEN");

    const spent = await tx.user.updateMany({
      where: { id: loan.lenderId, cash: { gte: loan.amount } },
      data: { cash: { decrement: loan.amount }, netWorth: { decrement: loan.amount } },
    });
    if (spent.count === 0) {
      // Roll the loan back to PENDING so another borrower/lender-top-up can retry.
      await tx.loan.update({ where: { id }, data: { status: "PENDING", borrowerId: null, dueDate: null } });
      throw new Error("LENDER_INSUFFICIENT");
    }

    // Borrower: cash in + debt up by same amount → net worth neutral.
    await tx.user.update({
      where: { id: s.sub },
      data: { cash: { increment: loan.amount }, totalDebt: { increment: loan.amount } },
    });

    await tx.transaction.create({
      data: {
        userId: s.sub,
        type: "LOAN_RECEIVED",
        amount: loan.amount,
        description: `Loan from ${lender.username}`,
      },
    });
    await tx.transaction.create({
      data: {
        userId: loan.lenderId,
        type: "LOAN_GIVEN",
        amount: loan.amount,
        description: `Loan to ${borrower.username}`,
      },
    });
    return true;
  }).catch((e: unknown) => {
    if (e instanceof Error && (e.message === "ALREADY_TAKEN" || e.message === "LENDER_INSUFFICIENT")) {
      return e.message;
    }
    throw e;
  });

  if (accepted === "ALREADY_TAKEN") {
    return NextResponse.json({ error: "Already taken or inactive" }, { status: 422 });
  }
  if (accepted === "LENDER_INSUFFICIENT") {
    return NextResponse.json({ error: "Lender does not have sufficient balance" }, { status: 422 });
  }

  return NextResponse.json({ ok: true, dueDate });
}
