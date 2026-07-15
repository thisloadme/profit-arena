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

  return NextResponse.json({
    active: all.filter((e) => e.status === "ACTIVE"),
    notice: all.filter((e) => e.status === "NOTICE"),
    history: all.filter((e) => e.status === "TERMINATED"),
    tickNumber: getTickerState().tickNumber,
  });
}
