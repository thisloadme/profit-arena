import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { GAME_CONFIG } from "@/config/game";
import { bankLoanSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";
import { isCrossOriginPost } from "@/lib/csrf-guard";
import {
  apiBadRequest,
  apiError,
  apiOk,
  apiTooManyRequests,
  apiUnauthorized,
} from "@/lib/api-response";

/**
 * GET /api/bank/offer — returns max loan from bank based on credit score & net worth.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.sub) return apiUnauthorized();

  const [user, credit] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.sub }, select: { netWorth: true } }),
    prisma.creditScore.findUnique({ where: { userId: s.sub }, select: { score: true } }),
  ]);
  if (!user) return apiError(404, "user not found");

  const score = credit?.score ?? GAME_CONFIG.CREDIT_SCORE_DEFAULT;
  const netWorth = Number(user.netWorth);
  const maxLoan = Math.max(0, netWorth * GAME_CONFIG.BANK_MAX_LOAN_TO_NETWORTH);
  const rate = GAME_CONFIG.BANK_BASE_RATE_MONTHLY;
  const eligible = score >= GAME_CONFIG.BANK_MIN_CREDIT_SCORE && netWorth > 0;

  return NextResponse.json({ eligible, maxLoan, rate, creditScore: score }); // public-shaped payload (not ok/error envelope)
}

/**
 * POST /api/bank/loan — take a loan from the bank NPC.
 * Body: { amount, tenorMonths }
 */
export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return apiUnauthorized();
  if (!checkUserRateLimit(s.sub, 3)) return apiTooManyRequests();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiBadRequest("Invalid body");
  }
  const parsed = bankLoanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { amount, tenorMonths } = parsed.data;

  const [user, credit] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.sub }, select: { netWorth: true } }),
    prisma.creditScore.findUnique({ where: { userId: s.sub }, select: { score: true } }),
  ]);
  if (!user) return apiError(404, "user not found");

  const score = credit?.score ?? GAME_CONFIG.CREDIT_SCORE_DEFAULT;
  if (score < GAME_CONFIG.BANK_MIN_CREDIT_SCORE) {
    return apiError(422, "Credit score too low");
  }

  const netWorth = Number(user.netWorth);
  const maxLoan = Math.max(0, netWorth * GAME_CONFIG.BANK_MAX_LOAN_TO_NETWORTH);
  if (amount > maxLoan) {
    return apiError(422, `Max loan ${maxLoan.toLocaleString("en-US")}`);
  }

  const rate = GAME_CONFIG.BANK_BASE_RATE_MONTHLY;
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + tenorMonths);

  // Re-check netWorth inside the txn so a concurrent trade can't inflate the
  // max-loan cap and let the user borrow more than eligible. totalDebt is
  // bumped here too so netWorth stays consistent until the next tick recompute.
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: s.sub }, select: { netWorth: true } });
    if (!fresh) throw new Error("USER_GONE");
    const cap = Math.max(0, Number(fresh.netWorth) * GAME_CONFIG.BANK_MAX_LOAN_TO_NETWORTH);
    if (amount > cap) throw new Error("OVER_CAP");

    await tx.user.update({
      where: { id: s.sub },
      data: { cash: { increment: amount }, totalDebt: { increment: amount } },
    });
    await tx.loan.create({
      data: {
        lenderId: s.sub, // bank loans are self-lent (internal)
        borrowerId: s.sub,
        amount,
        interestRate: rate,
        tenorMonths,
        remainingAmount: amount,
        status: "ACTIVE",
        dueDate,
      },
    });
    return true;
  }).catch((e: unknown) => {
    if (e instanceof Error && (e.message === "USER_GONE" || e.message === "OVER_CAP")) return e.message;
    throw e;
  });

  if (result === "OVER_CAP") {
    return apiError(422, "Max loan exceeded (net worth changed)");
  }

  return apiOk({ amount, rate, dueDate });
}
