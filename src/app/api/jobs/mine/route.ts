import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";

/**
 * GET /api/jobs/mine — user's employments split into active / notice / history.
 * Used by the Jobs page left panel.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const all = await prisma.employment.findMany({
    where: { userId: s.sub },
    orderBy: { startDate: "desc" },
  });

  // Coerce Decimal → number at the boundary. Without this, Prisma serializes
  // Decimal as a JSON string ("4400"), and the client's `salaryPerPay` (typed
  // as number) ends up as a string at runtime. The MONTHLY branch in
  // `periodToMonthly` then returns it untouched, and `reduce(s + salary)`
  // collapses into string concatenation instead of arithmetic — yielding
  // absurd totals like "0440014401280".
  const num = (e: (typeof all)[number]) => ({ ...e, salaryPerPay: Number(e.salaryPerPay) });
  return NextResponse.json({
    active: all.filter((e) => e.status === "ACTIVE").map(num),
    notice: all.filter((e) => e.status === "NOTICE").map(num),
    history: all.filter((e) => e.status === "TERMINATED").map(num),
    tickNumber: getTickerState().tickNumber,
  });
}
