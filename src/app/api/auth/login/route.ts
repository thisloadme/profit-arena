import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, bumpTokenVersion } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, passwordHash: true, tokenVersion: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  // Bump tokenVersion so any pre-existing session (e.g. on another device)
  // is invalidated; embed the fresh version in this session's JWT.
  const tokenVersion = await bumpTokenVersion(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await setSessionCookie({
    sub: user.id,
    username: user.username,
    email: user.email,
    tokenVersion,
  });

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
}
