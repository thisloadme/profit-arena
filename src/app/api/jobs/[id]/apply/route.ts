import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { payPeriodTicks, workHoursOverlap } from "@/config/jobs";

/**
 * POST /api/jobs/:id/apply — apply for a job from the catalog.
 *  - Rejects if user already has an ACTIVE/NOTICE employment for the same job.
 *  - Rejects if work hours overlap an existing ACTIVE/NOTICE employment.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !job.isActive) {
    return NextResponse.json({ error: "Job not found or inactive" }, { status: 404 });
  }

  const conflicting = await prisma.employment.findFirst({
    where: { userId: s.sub, status: { in: ["ACTIVE", "NOTICE"] }, jobId: id },
  });
  if (conflicting) {
    return NextResponse.json({ error: "You already have this job" }, { status: 409 });
  }

  const otherActive = await prisma.employment.findMany({
    where: { userId: s.sub, status: { in: ["ACTIVE", "NOTICE"] } },
    select: { id: true, position: true, companyName: true, workStartHour: true, workEndHour: true },
  });
  for (const e of otherActive) {
    if (workHoursOverlap(
      { start: e.workStartHour, end: e.workEndHour },
      { start: job.workStartHour, end: job.workEndHour },
    )) {
      return NextResponse.json(
        { error: `Work hours overlap with "${e.position} @ ${e.companyName}". Resign first or wait for notice to end.` },
        { status: 409 },
      );
    }
  }

  const ticker = getTickerState();
  const period = payPeriodTicks(job.payPeriod);

  const employment = await prisma.employment.create({
    data: {
      userId: s.sub,
      jobId: job.id,
      companyName: job.company,
      position: job.title,
      salaryPerPay: job.salaryPerPay,
      payPeriod: job.payPeriod,
      workStartHour: job.workStartHour,
      workEndHour: job.workEndHour,
      nextPayAtTick: ticker.tickNumber + period,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ ok: true, employment });
}
