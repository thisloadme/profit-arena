import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/server/engine/socket-server";

type EvalCtx = {
  userId: string;
  netWorth: number;
  hasActiveLoan: boolean;
  activeAssets: { symbol: string; type: string }[];
  hasBusiness: boolean;
  hasCrypto: boolean;
  hasTraded: boolean;
  hasLent: boolean;
  hasBorrower: boolean;
  hasSurvivedRecession: boolean;
};

/**
 * Evaluate & award achievements for a single user after a tick.
 * Called from tick-scheduler.
 *
 * one SELECT per user per tick for earned achievements.
 * O(users × achievements) — fine for hundreds, switch to batch
 * preloading if growth demands it.
 */
export async function evaluateAchievements(ctx: EvalCtx): Promise<void> {
  const earned = await prisma.userAchievement.findMany({
    where: { userId: ctx.userId },
    select: { achievement: { select: { code: true } } },
  });
  const earnedCodes = new Set(earned.map((e) => e.achievement.code));

  const checks: { code: string; condition: boolean }[] = [
    { code: "FIRST_TRADE", condition: ctx.hasTraded },
    { code: "FIRST_MILLION", condition: ctx.netWorth >= 1_000_000 },
    { code: "DIVERSIFIED", condition: new Set(ctx.activeAssets.map((a) => a.type)).size >= 3 },
    { code: "DEBT_FREE", condition: !ctx.hasActiveLoan },
    { code: "BUSINESS_OWNER", condition: ctx.hasBusiness },
    { code: "CRYPTO_INVESTOR", condition: ctx.hasCrypto },
    { code: "BORROWER", condition: ctx.hasBorrower },
    { code: "LENDER", condition: ctx.hasLent },
    { code: "SURVIVE_RECESSION", condition: ctx.hasSurvivedRecession },
  ];

  for (const c of checks) {
    if (c.condition && !earnedCodes.has(c.code)) {
      const ach = await prisma.achievement.findUnique({
        where: { code: c.code },
        select: { id: true, name: true, description: true },
      });
      if (!ach) continue;
      await prisma.userAchievement.create({
        data: { userId: ctx.userId, achievementId: ach.id },
      });
      notifyUser(ctx.userId, { title: `🏆 ${ach.name}`, message: ach.description });
    }
  }
}
