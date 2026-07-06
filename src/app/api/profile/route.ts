import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateSchema = z.object({
  avatarUrl: z.string().url().max(512).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  riskProfile: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]).optional(),
});

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: s.sub },
      select: { username: true, email: true, riskProfile: true, createdAt: true },
    }),
    prisma.userProfile.findUnique({ where: { userId: s.sub } }),
  ]);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  return NextResponse.json({ ...user, ...profile });
}

export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { riskProfile, ...profileFields } = body.data;
  const hasProfileFields = Object.values(profileFields).some((v) => v !== undefined);
  const hasRisk = riskProfile !== undefined;

  if (!hasProfileFields && !hasRisk) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  await prisma.$transaction(async (tx) => {
    if (hasRisk) {
      await tx.user.update({ where: { id: s.sub }, data: { riskProfile } });
    }
    if (hasProfileFields) {
      await tx.userProfile.upsert({
        where: { userId: s.sub },
        create: { userId: s.sub, ...profileFields },
        update: profileFields,
      });
    }
  });

  return NextResponse.json({ ok: true });
}
