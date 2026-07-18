import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { GAME_CONFIG } from "@/config/game";
import { checkAuthRateLimit } from "@/lib/auth-rate-limiter";
import { getClientIp } from "@/lib/client-ip";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkAuthRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }
  const { username, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });
  if (exists) {
    // Generic message — don't leak which field collided (prevents enumeration).
    return NextResponse.json({ error: "Email or username already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      cash: GAME_CONFIG.STARTING_CASH,
      profile: { create: {} },
      creditScore: { create: { score: GAME_CONFIG.CREDIT_SCORE_DEFAULT } },
      tutorialProgress: { create: {} },
    },
    select: { id: true, username: true, email: true },
  });

  // Auto-login on register. New users start at tokenVersion 0.
  await setSessionCookie({
    sub: user.id,
    username: user.username,
    email: user.email,
    tokenVersion: 0,
  });

  console.log("[event] register", { userId: user.id, username: user.username });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
