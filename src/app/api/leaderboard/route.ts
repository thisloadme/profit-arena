import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getCachedLeaderboard,
  recomputeLeaderboard,
  getWeeklyLeaderboard,
  getLeaderboardSummary,
} from "@/server/engine/leaderboard";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const period = searchParams.get("period") === "weekly" ? "weekly" : "global";

  if (period === "weekly") {
    const rows = (await getWeeklyLeaderboard()).filter((u) =>
      search ? u.username.toLowerCase().includes(search) : true,
    );
    const me = rows.find((u) => u.userId === s.sub) ?? null;
    const summary = await getLeaderboardSummary();
    return NextResponse.json({ rows, me, period, summary });
  }

  // Global (all-time) — cached, recomputed every few ticks by scheduler.
  let rows = getCachedLeaderboard();
  if (!rows) rows = await recomputeLeaderboard(0);

  const filtered = search ? rows.filter((u) => u.username.toLowerCase().includes(search)) : rows;
  const me = rows.find((u) => u.userId === s.sub) ?? null;
  const summary = await getLeaderboardSummary();
  // yourPercentile: fraction of players below you.
  if (me && summary.totalPlayers > 0) {
    summary.yourPercentile = Math.round((1 - (me.rank - 1) / summary.totalPlayers) * 100);
  }

  return NextResponse.json({ rows: filtered.slice(0, 50), me, period, summary });
}
