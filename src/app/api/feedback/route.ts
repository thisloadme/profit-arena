import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/feedback — submit user feedback.
 * ponytail: logs to stdout. Store in DB when volume justifies it.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { rating, message } = await req.json().catch(() => ({}));
  if (!rating || !message) return NextResponse.json({ error: "rating & message required" }, { status: 422 });

  console.log("[feedback]", { userId: s.sub, rating, message });
  return NextResponse.json({ ok: true });
}
