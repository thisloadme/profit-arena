/**
 * Pure constants for auth — no imports from next/headers.
 *
 * ponytail: split from auth.ts so non-Next runtimes (tsx server.ts → socket.io)
 * can read the cookie name + secret without dragging in Next's AsyncLocalStorage.
 */

export const SESSION_COOKIE_NAME = "finsim_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const JWT_ALG = "HS256";

export function getAuthSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}
