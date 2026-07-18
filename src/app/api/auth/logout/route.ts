import { NextResponse } from "next/server";
import { clearSessionCookie, bumpTokenVersion } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST() {
  // Revoke all outstanding sessions for this user by bumping tokenVersion.
  // A stolen cookie can no longer be replayed after logout.
  const s = await getSession();
  if (s?.sub) await bumpTokenVersion(s.sub);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
