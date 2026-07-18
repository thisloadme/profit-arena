/**
 * Extract the client IP for rate limiting.
 *
 * ponytail: trust X-Forwarded-For only when the deploy is behind a known
 * trusted proxy (TRUST_PROXY=1). In dev / standalone, use a stable fallback
 * so attackers can't spoof a fresh IP per request. For multi-instance or
 * hostile-network deployments, swap to a real IP-resolution library.
 */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "1";
  if (trustProxy) {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "local";
}
