import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizationUrl } from "@/lib/oauth/google";
import {
  OAUTH_STATE_COOKIE,
  createOAuthStateCookie,
  generateStateToken,
} from "@/lib/oauth/state";

function safeCallback(input: string | null): string {
  if (!input) return "/dashboard";
  // Only allow same-origin paths.
  if (!input.startsWith("/") || input.startsWith("//")) return "/dashboard";
  return input;
}

export async function GET(req: NextRequest) {
  const callbackUrl = safeCallback(new URL(req.url).searchParams.get("callbackUrl"));
  const state = generateStateToken();
  const token = await createOAuthStateCookie({ state, callbackUrl });

  const redirectTo = buildAuthorizationUrl({ state });

  const res = NextResponse.redirect(redirectTo);
  res.cookies.set(OAUTH_STATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}