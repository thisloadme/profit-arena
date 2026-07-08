/**
 * In-memory sliding-window rate limiter for auth endpoints.
 *
 * ponytail: in-memory Map, reset every 15min. At MVP scale (<1000 users)
 * this uses negligible memory. Replace with Redis if multi-instance.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

function cleanup() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, timestamps] of attempts) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) attempts.delete(key);
    else attempts.set(key, valid);
  }
}

export function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = attempts.get(ip) ?? [];
  timestamps = timestamps.filter((t) => t > cutoff);

  if (timestamps.length >= MAX_ATTEMPTS) return false;

  timestamps.push(now);
  attempts.set(ip, timestamps);

  // Cleanup every 100 writes to avoid memory leak.
  if (attempts.size % 100 === 0) cleanup();

  return true;
}
