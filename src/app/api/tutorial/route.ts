import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = await prisma.tutorialProgress.findUnique({ where: { userId: s.sub } });
  return NextResponse.json({
    currentStep: p?.currentStep ?? 0,
    completed: p?.completed ?? false,
    skipped: p?.skipped ?? false,
    dismissedTooltips: p?.dismissedTooltips ?? [],
  });
}

export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.step === "number") data.currentStep = body.step;
  if (typeof body.completed === "boolean") data.completed = body.completed;
  if (typeof body.skipped === "boolean") data.skipped = body.skipped;

  if (typeof body.dismissTooltip === "string") {
    const cur = await prisma.tutorialProgress.findUnique({ where: { userId: s.sub } });
    const existing = cur?.dismissedTooltips ?? [];
    if (!existing.includes(body.dismissTooltip)) {
      data.dismissedTooltips = [...existing, body.dismissTooltip];
    }
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "no fields" }, { status: 422 });

  if (data.completed) console.log("[event] tutorial_complete", { userId: s.sub });

  const progress = await prisma.tutorialProgress.upsert({
    where: { userId: s.sub },
    create: { userId: s.sub, currentStep: 0, dismissedTooltips: [] },
    update: data,
  });

  return NextResponse.json({ currentStep: progress.currentStep, completed: progress.completed, skipped: progress.skipped });
}
