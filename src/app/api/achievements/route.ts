import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [allAch, myAch] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { code: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: s.sub },
      include: { achievement: true },
    }),
  ]);

  const earnedSet = new Set(myAch.map((a) => a.achievement.code));
  const list = allAch.map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    iconKey: a.iconKey,
    earned: earnedSet.has(a.code),
    unlockedAt: myAch.find((m) => m.achievement.code === a.code)?.unlockedAt ?? null,
  }));

  return NextResponse.json({ achievements: list });
}
