import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  JWT_ALG,
  getAuthSecret,
} from "./auth-config";

export type SessionPayload = JWTPayload & {
  sub: string;
  username: string;
  email: string;
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
}): Promise<string> {
  return new SignJWT({ username: payload.username, email: payload.email })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (typeof payload.sub !== "string") return null;
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

export { SESSION_COOKIE_NAME } from "./auth-config";
