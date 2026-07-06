import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCachedLeaderboard, recomputeLeaderboard } from "@/server/engine/leaderboard";

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Use cached data if available (recomputed every 5 ticks in tick-scheduler).
  let rows = getCachedLeaderboard();
  if (!rows) rows = await recomputeLeaderboard(0);

  const me = rows.find((u) => u.userId === s.sub);
  return NextResponse.json({ rows: rows.slice(0, 50), me });
}
