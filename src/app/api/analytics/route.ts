import { NextResponse } from "next/server";

/**
 * Server-side event log.
 * writes to stdout; swap to a proper analytics SDK when ready.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("[analytics]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
