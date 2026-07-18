import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "../auth-config";

/**
 * Short-lived signed token that carries OAuth dance state across the
 * authorize → callback redirect. Stored in a private cookie; the client
 * never reads it. ~10 minute lifetime is enough for a normal consent flow.
 */

export const OAUTH_STATE_COOKIE = "finsim_oauth_state";
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

export type OAuthStatePayload = {
  state: string;
  callbackUrl: string;
};

async function sign(payload: OAuthStatePayload): Promise<string> {
  return new SignJWT({ callbackUrl: payload.callbackUrl })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.state)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function createOAuthStateCookie(
  payload: OAuthStatePayload,
): Promise<string> {
  return sign(payload);
}

export async function readOAuthStateCookie(
  token: string | undefined,
  expectedState: string,
): Promise<OAuthStatePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.sub !== expectedState) return null;
    const callbackUrl = typeof payload.callbackUrl === "string" ? payload.callbackUrl : "/dashboard";
    return { state: payload.sub, callbackUrl };
  } catch {
    return null;
  }
}

/** 32-byte URL-safe random string for OAuth `state` parameter. */
export function generateStateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}