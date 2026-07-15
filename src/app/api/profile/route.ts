import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateSchema = z.object({
  avatarUrl: z.string().url().max(512).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  financialStatus: z.enum(["STRUGGLING", "STABLE", "COMFORTABLE", "WEALTHY"]).optional(),
  financialStatusManual: z.boolean().optional(),
});

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: s.sub },
      select: {
        username: true,
        email: true,
        financialStatus: true,
        financialStatusManual: true,
        createdAt: true,
      },
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

  const { financialStatus, financialStatusManual, ...profileFields } = body.data;
  const hasProfileFields = Object.values(profileFields).some((v) => v !== undefined);
  const hasStatus = financialStatus !== undefined || financialStatusManual !== undefined;

  if (!hasProfileFields && !hasStatus) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  await prisma.$transaction(async (tx) => {
    if (hasStatus) {
      await tx.user.update({
        where: { id: s.sub },
        data: {
          ...(financialStatus !== undefined ? { financialStatus } : {}),
          ...(financialStatusManual !== undefined ? { financialStatusManual } : {}),
        },
      });
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