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

export type WeeklyRow = {
  rank: number;
  userId: string;
  username: string;
  gain: number;
  netWorth: number;
};

export type LeaderboardSummary = {
  totalPlayers: number;
  totalWealth: number;
  yourPercentile: number | null;
};

/**
 * 7-day net-worth gain ranking, computed on demand from transactions.
 * ponytail: no scheduler/writer for WEEKLY snapshots — compute on read.
 * O(transactions in 7d) — fine for MVP scale.
 */
export async function getWeeklyLeaderboard(): Promise<WeeklyRow[]> {
  const rows = await prisma.$queryRaw<
    { userId: string; username: string; gain: bigint; networth: number }[]
  >`
    SELECT t."userId"::text AS "userId",
           u.username,
           COALESCE(SUM(t.amount), 0)::bigint AS gain,
           COALESCE(u."netWorth", 0)::float AS networth
    FROM transactions t
    JOIN users u ON u.id = t."userId"
    WHERE t."createdAt" >= NOW() - INTERVAL '7 days'
    GROUP BY t."userId", u.username, u."netWorth"
    ORDER BY gain DESC
    LIMIT 50
  `;
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    username: r.username,
    gain: Number(r.gain),
    netWorth: Number(r.networth),
  }));
}

/** Aggregate summary stats for the leaderboard header strip. */
export async function getLeaderboardSummary(): Promise<LeaderboardSummary> {
  const agg = await prisma.user.aggregate({
    _count: true,
    _sum: { netWorth: true },
  });
  return {
    totalPlayers: agg._count,
    totalWealth: agg._sum.netWorth ?? 0,
    yourPercentile: null, // filled by caller using cached rows
  };
}
