import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { bumpTokenVersion, setSessionCookie } from "@/lib/auth";
import { exchangeCode, fetchGoogleUser } from "@/lib/oauth/google";
import {
  OAUTH_STATE_COOKIE,
  readOAuthStateCookie,
} from "@/lib/oauth/state";
import { generateUsername } from "@/lib/oauth/username";
import { checkAuthRateLimit } from "@/lib/auth-rate-limiter";
import { getClientIp } from "@/lib/client-ip";
import { GAME_CONFIG } from "@/config/game";

function fail(error: string): NextResponse {
  return NextResponse.redirect(`/login?error=${encodeURIComponent(error)}`);
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkAuthRateLimit(ip)) return fail("google_rate_limited");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("google_missing_code");

  const store = await cookies();
  const cookieToken = store.get(OAUTH_STATE_COOKIE)?.value;
  // Always clear the state cookie, success or failure.
  store.delete(OAUTH_STATE_COOKIE);

  const verified = await readOAuthStateCookie(cookieToken, state);
  if (!verified) return fail("google_state");

  let googleUser;
  try {
    const tokens = await exchangeCode({ code });
    googleUser = await fetchGoogleUser(tokens.access_token);
  } catch (err) {
    console.error("[google oauth]", err);
    return fail("google_exchange");
  }

  // Find-or-link-or-create. Done as a transaction so we never end up with a
  // user but no Account row (or vice versa).
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingAccount = await tx.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: googleUser.providerAccountId,
          },
        },
        select: { userId: true },
      });

      if (existingAccount) {
        const user = await tx.user.findUnique({
          where: { id: existingAccount.userId },
          select: { id: true, username: true, email: true },
        });
        if (!user) throw new Error("account linked to missing user");
        return user;
      }

      const existingUser = await tx.user.findUnique({
        where: { email: googleUser.email },
        select: { id: true, username: true, email: true, emailVerified: true },
      });

      if (existingUser) {
        // Auto-link: attach Google identity, mark email verified.
        await tx.account.create({
          data: {
            userId: existingUser.id,
            provider: "google",
            providerAccountId: googleUser.providerAccountId,
          },
        });
        if (!existingUser.emailVerified) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }
        return {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
        };
      }

      // Brand-new user. Mirror register/route.ts so all related rows exist.
      const username = await generateUsername(googleUser.email);
      const created = await tx.user.create({
        data: {
          username,
          email: googleUser.email,
          passwordHash: null,
          emailVerified: new Date(),
          cash: GAME_CONFIG.STARTING_CASH,
          profile: { create: {} },
          creditScore: { create: { score: GAME_CONFIG.CREDIT_SCORE_DEFAULT } },
          tutorialProgress: { create: {} },
          accounts: {
            create: {
              provider: "google",
              providerAccountId: googleUser.providerAccountId,
            },
          },
        },
        select: { id: true, username: true, email: true },
      });
      return created;
    });

    const tokenVersion = await bumpTokenVersion(result.id);
    await prisma.user.update({
      where: { id: result.id },
      data: { lastLoginAt: new Date() },
    });
    await setSessionCookie({
      sub: result.id,
      username: result.username,
      email: result.email,
      tokenVersion,
    });

    console.log("[event] login.google", { userId: result.id });
    return NextResponse.redirect(verified.callbackUrl);
  } catch (err) {
    console.error("[google oauth] callback", err);
    return fail("google_create");
  }
}