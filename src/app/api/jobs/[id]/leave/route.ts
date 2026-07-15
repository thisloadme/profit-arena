import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { JOB_NOTICE_PERIOD_TICKS } from "@/config/jobs";

/**
 * POST /api/jobs/:id/leave — resign from an employment. Sets status=NOTICE
 * with noticeUntilTick = now + 1 game-day. Last paycheck still pays.
 * While in NOTICE, user cannot apply for new jobs that conflict with work hours.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const employment = await prisma.employment.findUnique({ where: { id } });
  if (!employment || employment.userId !== s.sub) {
    return NextResponse.json({ error: "Employment not found" }, { status: 404 });
  }
  if (employment.status === "TERMINATED") {
    return NextResponse.json({ error: "Already terminated" }, { status: 409 });
  }
  if (employment.status === "NOTICE") {
    return NextResponse.json({ error: "Already serving notice" }, { status: 409 });
  }

  const ticker = getTickerState();
  const updated = await prisma.employment.update({
    where: { id },
    data: {
      status: "NOTICE",
      noticeUntilTick: ticker.tickNumber + JOB_NOTICE_PERIOD_TICKS,
    },
  });

  return NextResponse.json({ ok: true, employment: updated });
}
