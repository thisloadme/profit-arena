import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";
import { isCrossOriginPost } from "@/lib/csrf-guard";
import {
  apiError,
  apiOk,
  apiTooManyRequests,
  apiUnauthorized,
} from "@/lib/api-response";

const createOfferSchema = z.object({
  amount: z.number().positive(),
  interestRate: z.number().min(0.001).max(0.5),
  tenorMonths: z.number().int().min(1).max(24),
});

/**
 * POST /api/loans — create a P2P lending offer.
 */
export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return apiUnauthorized();
  if (!checkUserRateLimit(s.sub, 10)) return apiTooManyRequests();

  const parsed = createOfferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return apiError(422, parsed.error.issues[0]?.message ?? "Invalid");
  const { amount, interestRate, tenorMonths } = parsed.data;

  // Check cash (lender must have the money)
  const user = await prisma.user.findUnique({ where: { id: s.sub }, select: { cash: true } });
  if (!user || Number(user.cash) < amount) {
    return apiError(422, `Insufficient balance. Need ${amount.toLocaleString("id-ID")}`);
  }

  const offer = await prisma.loan.create({
    data: {
      lenderId: s.sub,
      amount,
      interestRate,
      tenorMonths,
      remainingAmount: amount,
      status: "PENDING",
    },
  });
  return apiOk({ loan: offer });
}

/**
 * GET /api/loans — list offers or my loans.
 * ?list=offers → marketplace (all PENDING)
 * ?list=mine → loans given/taken by current user
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return apiUnauthorized();

  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list") ?? "mine";

  if (list === "offers") {
    const offers = await prisma.loan.findMany({
      where: { status: "PENDING", lenderId: { not: s.sub } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { lender: { select: { username: true } } },
    });
    return NextResponse.json({ loans: offers.map(decimalizeLoan) });
  }

  // mine
  const [given, taken] = await Promise.all([
    prisma.loan.findMany({
      where: { lenderId: s.sub },
      orderBy: { createdAt: "desc" },
      include: { borrower: { select: { username: true } } },
    }),
    prisma.loan.findMany({
      where: { borrowerId: s.sub, NOT: { status: "PENDING" } },
      orderBy: { createdAt: "desc" },
      include: { lender: { select: { username: true } } },
    }),
  ]);
  return NextResponse.json({ given: given.map(decimalizeLoan), taken: taken.map(decimalizeLoan) });
}

/** Coerce Decimal money/ratio fields on a Loan (and nested lender/borrower) to numbers. */
function decimalizeLoan<T extends Record<string, unknown>>(loan: T): T {
  const out: Record<string, unknown> = { ...loan };
  for (const k of ["amount", "interestRate", "remainingAmount"]) {
    const v = out[k];
    if (v && typeof v === "object" && "toNumber" in v) out[k] = (v as { toNumber: () => number }).toNumber();
  }
  return out as T;
}
