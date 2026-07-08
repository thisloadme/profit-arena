import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCachedLeaderboard, recomputeLeaderboard } from "@/server/engine/leaderboard";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";

  // Use cached data if available (recomputed every 5 ticks in tick-scheduler).
  let rows = getCachedLeaderboard();
  if (!rows) rows = await recomputeLeaderboard(0);

  if (search) {
    rows = rows.filter((u) => u.username.toLowerCase().includes(search));
  }

  const me = rows.find((u) => u.userId === s.sub);
  return NextResponse.json({ rows: rows.slice(0, 50), me });
}
