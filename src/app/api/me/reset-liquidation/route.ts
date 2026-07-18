import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { GAME_CONFIG } from "@/config/game";
import { isCrossOriginPost } from "@/lib/csrf-guard";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";

/**
 * POST /api/me/reset-liquidation — recover from a liquidated account.
 *
 * Clears the one-shot isLiquidated flag and grants a fresh STARTING_CASH so
 * the player can start over. We do NOT recreate previous assets, businesses,
 * or loans — those were sold/settled by the liquidation hook. Use this as a
 * "restart" affordance, not an undo.
 *
 * Why POST + CSRF: state-mutating endpoint. GET would be cacheable.
 */
export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkUserRateLimit(s.sub, 5)) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: { isLiquidated: true, cash: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (!user.isLiquidated) {
    return NextResponse.json({ error: "Account is not liquidated" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: s.sub },
    data: {
      cash: GAME_CONFIG.STARTING_CASH,
      netWorth: GAME_CONFIG.STARTING_CASH,
      totalAssets: 0,
      totalDebt: 0,
      isLiquidated: false,
      liquidateAt: null,
      liquidateGraceStartedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    cash: GAME_CONFIG.STARTING_CASH,
  });
}
