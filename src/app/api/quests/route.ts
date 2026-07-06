import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/quests — returns all quest definitions + user's progress today.
 *
 * ponytail: no cron-based reset yet. Quests are static from seed with
 * progress tracked in UserQuest if the engine updates it. For MVP,
 * this returns quest definitions + placeholder progress.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [quests, userQuests] = await Promise.all([
    prisma.quest.findMany({ orderBy: { code: "asc" } }),
    prisma.userQuest.findMany({
      where: { userId: s.sub, periodDate: today },
      include: { quest: true },
    }),
  ]);

  const progressMap = new Map(userQuests.map((uq) => [uq.quest.code, uq]));

  const list = quests.map((q) => {
    const prog = progressMap.get(q.code);
    return {
      code: q.code,
      title: q.title,
      description: q.description,
      targetCount: q.targetCount,
      rewardCash: q.rewardCash,
      progress: prog?.progress ?? 0,
      completed: prog?.completed ?? false,
      claimed: prog?.claimed ?? false,
    };
  });

  return NextResponse.json({ quests: list });
}
