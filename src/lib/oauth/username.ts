import { prisma } from "../prisma";

/**
 * Generate a unique username from an email local-part.
 *   alice@gmail.com  → "alice"
 *   "alice" taken    → "alice_2"
 *
 * Sanitizes to [a-zA-Z0-9_], falls back to "player" on empty result.
 * Capped at 50 attempts; on exhaustion, returns a random 8-char suffix.
 */

const FALLBACK = "player";
const MAX_ATTEMPTS = 50;
const MAX_LEN = 24;

function sanitize(local: string): string {
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, MAX_LEN);
  return cleaned || FALLBACK;
}

function randomSuffix(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
}

export async function generateUsername(email: string): Promise<string> {
  const base = sanitize(email.split("@")[0] ?? "");

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`;
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `${base}_${randomSuffix()}`;
}