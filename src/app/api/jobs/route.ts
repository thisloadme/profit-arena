import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";

/**
 * GET /api/jobs — list active catalog + the current user's employments.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [jobs, myEmployments] = await Promise.all([
    prisma.job.findMany({
      where: { isActive: true },
      orderBy: [{ tier: "asc" }, { salaryPerPay: "asc" }],
    }),
    prisma.employment.findMany({
      where: { userId: s.sub },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return NextResponse.json({ jobs, employments: myEmployments, tickNumber: getTickerState().tickNumber });
}
