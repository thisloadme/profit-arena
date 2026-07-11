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

  await prisma.$transaction(async (tx) => {
    // Lender: cash out, net worth drops by amount (cash leaves, no asset booked).
    // ponytail: loansGiven is not recognized as a receivable in financial-tick's
    // netWorth recompute (only `assets` model counts) — so lender's net worth is
    // structurally understated until that's fixed. Decrement here stays consistent
    // with the tick recompute. Add receivable accounting when P2P repayment lands.
    await tx.user.update({
      where: { id: loan.lenderId },
      data: { cash: { decrement: loan.amount }, netWorth: { decrement: loan.amount } },
    });
    // Borrower: cash in + debt up by same amount → net worth neutral (stored
    // netWorth already equals cash+assets-debt, unchanged by this transfer).
    await tx.user.update({
      where: { id: s.sub },
      data: { cash: { increment: loan.amount }, totalDebt: { increment: loan.amount } },
    });
    await tx.loan.update({
      where: { id },
      data: { borrowerId: s.sub, status: "ACTIVE", dueDate },
    });
    // Record both sides so dashboard history + velocity sparkline reflect it.
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
  });

  return NextResponse.json({ ok: true, dueDate });
}
