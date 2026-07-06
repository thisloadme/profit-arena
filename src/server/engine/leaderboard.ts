import { prisma } from "@/lib/prisma";

/**
 * ponytail: in-memory LRU cache, recomputed every tick.
 * At MVP scale (<1000 users) this is faster and simpler than
 * a Redis-backed solution. Swap to Redis when DB query time
 * exceeds 50ms on average.
 */
let cache: { global: LeaderboardRow[] } | null = null;
let cacheTick = -1;

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  netWorth: number;
  totalAssets: number;
};

/**
 * Snapshot all users' net worths into LeaderboardSnapshot table
 * and return the ranked list. Called from tick-scheduler.
 */
export async function recomputeLeaderboard(tickNumber: number): Promise<LeaderboardRow[]> {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, netWorth: true, totalAssets: true },
    orderBy: { netWorth: "desc" },
  });

  // Persist all-time snapshot.
  const upserts = users.map((u, i) =>
    prisma.leaderboardSnapshot.upsert({
      where: { period_userId: { period: "ALL_TIME", userId: u.id } },
      update: { rank: i + 1, netWorth: u.netWorth, snapshotAt: new Date() },
      create: { period: "ALL_TIME", userId: u.id, rank: i + 1, netWorth: u.netWorth },
    }),
  );
  await Promise.all(upserts);

  const rows: LeaderboardRow[] = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    netWorth: u.netWorth,
    totalAssets: u.totalAssets,
  }));

  cache = { global: rows };
  cacheTick = tickNumber;
  return rows;
}

export function getCachedLeaderboard(): LeaderboardRow[] | null {
  return cache?.global ?? null;
}
