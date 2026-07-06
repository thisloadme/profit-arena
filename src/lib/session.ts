import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME, type SessionPayload } from "./auth";

/** Read session from cookies() in a Server Component or Route Handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}

/** Read session from a NextRequest (used by the proxy/middleware). */
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}

/** Throwsafe user getter — returns userId or null. */
export async function getUserId(): Promise<string | null> {
  const s = await getSession();
  return s?.sub ?? null;
}
