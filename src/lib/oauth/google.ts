/**
 * Google OAuth 2.0 helpers. Pure functions; no module-level side effects.
 *
 * Endpoints used:
 *   - Authorize:  https://accounts.google.com/o/oauth2/v2/auth
 *   - Token:      https://oauth2.googleapis.com/token
 *   - UserInfo:   https://www.googleapis.com/oauth2/v3/userinfo
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not set");
  return id;
}

export function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return secret;
}

export function getGoogleRedirectUri(): string {
  // Override per env so prod can use the real URL without code changes.
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/auth/google/callback"
  );
}

export function buildAuthorizationUrl(opts: { state: string; redirectUri?: string }): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: opts.redirectUri ?? getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCode(opts: {
  code: string;
  redirectUri?: string;
}): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: opts.redirectUri ?? getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export type GoogleUser = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo fetch failed (${res.status})`);
  }
  const body = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!body.sub || !body.email || body.email_verified !== true) {
    throw new Error("Google account is missing verified email/sub");
  }
  return {
    providerAccountId: body.sub,
    email: body.email.toLowerCase(),
    emailVerified: true,
    name: body.name ?? null,
    picture: body.picture ?? null,
  };
}