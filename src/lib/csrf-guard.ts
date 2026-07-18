import { NextResponse } from "next/server";

/**
 * CSRF guard via Origin/Referer header check.
 *
 * ponytail: sameSite=cookie is the primary defense. This guard rejects
 * cross-origin POSTs (other than our own deploy origin) as defense-in-depth
 * against subdomain attacks. Use only on state-changing routes.
 *
 * Returns null if the request is allowed, or a NextResponse (403) to be
 * returned immediately by the caller.
 */
export function isCrossOriginPost(req: Request): NextResponse | null {
  if (req.method !== "POST") return null;

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!allowedOrigin) return null;

  const originHeader = req.headers.get("origin");
  if (originHeader) {
    try {
      const o = new URL(originHeader);
      if (o.origin !== allowedOrigin) {
        return new NextResponse("Cross-origin POSTs are forbidden", { status: 403 });
      }
    } catch {
      return new NextResponse("Cross-origin POSTs are forbidden", { status: 403 });
    }
    return null;
  }

  // Fallback: Referer header (some webviews strip Origin).
  const refererHeader = req.headers.get("referer");
  if (refererHeader) {
    try {
      const r = new URL(refererHeader);
      if (r.origin !== allowedOrigin) {
        return new NextResponse("Cross-origin POSTs are forbidden", { status: 403 });
      }
    } catch {
      return new NextResponse("Cross-origin POSTs are forbidden", { status: 403 });
    }
    return null;
  }

  // Neither header present — server-to-server request. Trust it.
  return null;
}
