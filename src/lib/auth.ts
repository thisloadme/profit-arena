import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  JWT_ALG,
  getAuthSecret,
} from "./auth-config";
import { prisma } from "./prisma";

export type SessionPayload = JWTPayload & {
  sub: string;
  username: string;
  email: string;
  tokenVersion?: number;
};

// --- Password helpers ---

export function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 12);
}

export function verifyPassword(p: string, hash: string): Promise<boolean> {
  return bcrypt.compare(p, hash);
}

// --- JWT helpers ---

async function signSession(payload: {
  sub: string;
  username: string;
  email: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    username: payload.username,
    email: payload.email,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

/**
 * In-memory TTL cache of the current tokenVersion per user, so we don't hit
 * the DB on every request. 5s window means a revoked session is rejected
 * within ~5s of logout/login. Single-process model matches this deployment;
 * for multi-instance, move to Redis.
 */
const VERSION_CACHE_TTL_MS = 5_000;
const versionCache = new Map<string, { version: number; exp: number }>();

async function fetchCurrentVersion(userId: string): Promise<number> {
  const now = Date.now();
  const hit = versionCache.get(userId);
  if (hit && hit.exp > now) return hit.version;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  const version = u?.tokenVersion ?? -1;
  versionCache.set(userId, { version, exp: now + VERSION_CACHE_TTL_MS });
  return version;
}

/** Invalidate the cached version — call after bumping tokenVersion. */
function bustVersionCache(userId: string): void {
  versionCache.delete(userId);
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (typeof payload.sub !== "string") return null;
    // Reject if the user's tokenVersion has moved on (logout / re-login).
    if (typeof payload.tokenVersion === "number") {
      const current = await fetchCurrentVersion(payload.sub);
      if (current !== payload.tokenVersion) return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// --- Cookie helpers (server-side) ---

export async function setSessionCookie(payload: {
  sub: string;
  username: string;
  email: string;
  tokenVersion: number;
}): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Bump the user's tokenVersion and bust the cache so all outstanding JWTs
 * are rejected within the cache TTL. Returns the new version (embed in JWT).
 */
export async function bumpTokenVersion(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  bustVersionCache(userId);
  return updated.tokenVersion;
}

export { SESSION_COOKIE_NAME } from "./auth-config";
