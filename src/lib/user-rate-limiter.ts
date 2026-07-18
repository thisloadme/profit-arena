/**
 * Generic per-user sliding-window rate limiter.
 *
 * in-memory Map, 60s window. Coarse protection against spam on
 * financial / mutation endpoints. Trade-specific uses GAME_CONFIG.MAX_TRADES_PER_TICK;
 * this is the catch-all for everything else. Same caveat as auth-rate-limiter:
 * replace with Redis for multi-instance.
 */

const WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 30;

const hits = new Map<string, number[]>();

export function checkUserRateLimit(userId: string, max = DEFAULT_MAX, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const list = (hits.get(userId) ?? []).filter((t) => t > cutoff);
  if (list.length >= max) {
    hits.set(userId, list);
    return false;
  }
  list.push(now);
  hits.set(userId, list);
  return true;
}
