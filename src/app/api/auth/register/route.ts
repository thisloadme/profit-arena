import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { GAME_CONFIG } from "@/config/game";

export async function POST(req: Request) {
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
    select: { email: true, username: true },
  });
  if (exists) {
    const field = exists.email === email ? "Email" : "Username";
    return NextResponse.json({ error: `${field} already registered` }, { status: 409 });
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

  // Auto-login on register.
  await setSessionCookie({ sub: user.id, username: user.username, email: user.email });

  console.log("[event] register", { userId: user.id, username: user.username });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
