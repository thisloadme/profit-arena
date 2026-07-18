import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type ReportRow = {
  type: string;
  total: number;
  count: number;
};

/**
 * GET /api/reports?year=2026&month=7
 * Returns income/expense grouped by type for the given month.
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const rows = await prisma.$queryRaw<ReportRow[]>`
    SELECT type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE "userId" = ${s.sub}::uuid
      AND "createdAt" >= ${start}::timestamptz
      AND "createdAt" <= ${end}::timestamptz
    GROUP BY type
    ORDER BY total DESC
  `;

  // Tally income vs expense
  const INCOME_TYPES = new Set(["SALARY", "BUSINESS_REVENUE", "SELL", "LOAN_RECEIVED", "LOAN_PAYMENT"]);
  const EXPENSE_TYPES = new Set(["BUY", "EXPENSE", "LOAN_GIVEN", "LOAN_INTEREST"]);

  let income = 0;
  let expense = 0;
  const details = rows.map((r) => {
    const parsed = { type: r.type, total: Number(r.total), count: Number(r.count) };
    if (INCOME_TYPES.has(r.type)) income += parsed.total;
    if (EXPENSE_TYPES.has(r.type)) expense += Math.abs(parsed.total);
    return parsed;
  });

  // prevNetWorth — use month-start net worth from first transaction of the month
  const firstTx = await prisma.transaction.findFirst({
    where: { userId: s.sub, createdAt: { gte: start } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  return NextResponse.json({ year, month, income, expense, net: income - expense, details, periodStart: start, periodEnd: end, firstTxAt: firstTx?.createdAt ?? null });
}
