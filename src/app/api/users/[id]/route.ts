import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/users/[id] — profile for leaderboard click-through.
 *
 * Auth required. Public fields (visible to other users): username, netWorth,
 * totalAssets, join date. Private fields (cash, totalDebt, bio, location)
 * are only returned when the viewer is the owner.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const isOwner = id === s.sub;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      netWorth: true,
      totalAssets: true,
      ...(isOwner
        ? { cash: true, totalDebt: true, createdAt: true }
        : {}),
      profile: { select: { avatarUrl: true, ...(isOwner ? { bio: true, location: true } : {}) } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
