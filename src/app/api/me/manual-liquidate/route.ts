import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { TICKS_PER_GAME_MONTH } from "@/config/jobs";
import { FinancialStatus } from "@prisma/client";
import { isCrossOriginPost } from "@/lib/csrf-guard";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";
import { z } from "zod";

/**
 * POST /api/me/manual-liquidate — hard reset the user's account.
 *
 *   - assets deleted (shares sold at current price → cash)
 *   - businesses deactivated (history preserved, isActive = false)
 *   - employments set to TERMINATED
 *   - loans (taken & given) set to DEFAULTED
 *   - limit orders cancelled, watchlist cleared
 *   - tutorial progress reset to step 0
 *   - cash = max(0, assetValue − debt) at moment of reset
 *   - financial status back to STABLE / auto
 *
 * Anti-abuse: gated by `lastManualLiquidateAtTick`. Cooldown is
 * TICKS_PER_GAME_MONTH (43200 = 30 game-days) measured against the live
 * SimulationState.tickNumber — survives DST, paused server, NTP drift.
 *
 * History preserved: Transaction, Achievement, UserAchievement, UserQuest,
 * Notification rows are NOT touched. Achievements already earned stay earned.
 */

const bodySchema = z.object({
  confirm: z.literal(true),
});

export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkUserRateLimit(s.sub, 3)) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation required: send { confirm: true }" },
      { status: 422 },
    );
  }

  const ticker = getTickerState();
  const currentTick = ticker.tickNumber;

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: {
      lastManualLiquidateAtTick: true,
      assets: { select: { quantity: true, currentPrice: true } },
      loansTaken: { where: { status: "ACTIVE" }, select: { remainingAmount: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Cooldown check.
  if (
    user.lastManualLiquidateAtTick !== null &&
    currentTick - user.lastManualLiquidateAtTick < TICKS_PER_GAME_MONTH
  ) {
    const ticksLeft = TICKS_PER_GAME_MONTH - (currentTick - user.lastManualLiquidateAtTick);
    const daysLeft = Math.ceil(ticksLeft / 1440);
    return NextResponse.json(
      {
        error: `Cooldown active. Try again in ~${daysLeft} game-day(s).`,
        ticksRemaining: ticksLeft,
      },
      { status: 429 },
    );
  }

  // Cash on reset: settle assets and debts at face value.
  const assetValue = user.assets.reduce(
    (s, a) => s + Number(a.quantity) * Number(a.currentPrice),
    0,
  );
  const debt = user.loansTaken.reduce((s, l) => s + Number(l.remainingAmount), 0);
  const newCash = Math.max(0, assetValue - debt);

  await prisma.$transaction(async (tx) => {
    // Wipe holdings.
    await tx.asset.deleteMany({ where: { userId: s.sub } });

    // Deactivate businesses (preserves history for audit / leaderboard).
    await tx.business.updateMany({
      where: { ownerId: s.sub, isActive: true },
      data: { isActive: false },
    });

    // Terminate employments — soft (status flip) so the user sees a history.
    await tx.employment.updateMany({
      where: { userId: s.sub, status: { in: ["ACTIVE", "NOTICE"] } },
      data: { status: "TERMINATED", endDate: new Date() },
    });

    // Cancel loans on both sides. Taken: borrower has nothing to repay.
    // Given: lender loses claim — keeps game balance fair for both parties.
    await tx.loan.updateMany({
      where: {
        OR: [
          { borrowerId: s.sub, status: "ACTIVE" },
          { lenderId: s.sub, status: "ACTIVE" },
        ],
      },
      data: { status: "DEFAULTED" },
    });

    // Cancel open limit orders; clear watchlist.
    await tx.limitOrder.updateMany({
      where: { userId: s.sub, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await tx.watchedAsset.deleteMany({ where: { userId: s.sub } });

    // Reset tutorial back to step 0; keep the row so the dashboard recognises
    // it (next visit will re-trigger the guide).
    await tx.tutorialProgress.upsert({
      where: { userId: s.sub },
      create: { userId: s.sub, currentStep: 0, dismissedTooltips: [] },
      update: { currentStep: 0, dismissedTooltips: [] },
    });

    // Reset user financial fields + stamp cooldown.
    await tx.user.update({
      where: { id: s.sub },
      data: {
        cash: newCash,
        netWorth: newCash,
        totalAssets: 0,
        totalDebt: 0,
        financialStatus: FinancialStatus.STABLE,
        financialStatusManual: false,
        isLiquidated: false,
        liquidateAt: null,
        liquidateGraceStartedAt: null,
        lastManualLiquidateAtTick: currentTick,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    cash: newCash,
    nextAvailableTick: currentTick + TICKS_PER_GAME_MONTH,
  });
}
