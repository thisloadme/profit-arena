import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveEvents } from "@/server/engine/event-engine";

/**
 * Dashboard aggregation endpoint.
 * single fetch, one round-trip per tick. Split when any sub-section
 * becomes a bottleneck (unlikely at MVP scale).
 *
 * ?timeframe=1d|1w|1M|1Y|ALL  — controls sparkline range & implicit prevNetWorth.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = session.sub;

  // days-map for timeframe. ALL uses earliest txn date.
  // Days is constrained to a finite number — no string concat into SQL.
  const { searchParams } = new URL(req.url);
  const tf = searchParams.get("timeframe") ?? "1M";
  const daysMap: Record<string, number | "ALL"> = { "1d": 1, "1w": 7, "1M": 30, "1Y": 365, "ALL": "ALL" };
  const days = daysMap[tf] ?? 30;
  const isAll = days === "ALL";
  const daysNum = isAll ? 30 : (days as number);

  // Validate uid is a real UUID before it touches any $queryRaw (defense-in-depth
  // even though Prisma parameterizes). Throwing early prevents SQL syntax errors
  // leaking through the error envelope.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const [user, loans, events, txns, assetsWithPrice] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: uid },
      select: { cash: true, netWorth: true, totalAssets: true, totalDebt: true },
    }),
    prisma.loan.findMany({
      where: { borrowerId: uid, status: "ACTIVE" },
      select: { id: true, amount: true, interestRate: true, remainingAmount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    getActiveEvents(),
    // Daily cash-flow for N days. `isAll` is bound as a boolean and `daysNum`
    // as a number — Prisma parameterizes both, no string interpolation of user
    // input into SQL.
    prisma.$queryRaw<{ day: Date; net: number }[]>`
      SELECT DATE("createdAt") as day, SUM(amount) as net
      FROM transactions
      WHERE "userId" = ${uid}::uuid
        AND "createdAt" >= CASE
          WHEN ${isAll}::boolean THEN (
            SELECT COALESCE(MIN("createdAt"), NOW() - INTERVAL '30 days')
            FROM transactions WHERE "userId" = ${uid}::uuid
          )
          ELSE NOW() - make_interval(days => ${daysNum}::int)
        END
      GROUP BY day ORDER BY day
    `,
    prisma.asset.findMany({
      where: { userId: uid },
      select: { type: true, symbol: true, quantity: true, currentPrice: true, averagePrice: true },
      orderBy: { type: "asc" },
    }),
  ]);

  // Asset allocation: group by type
  const allocMap = new Map<string, { value: number; invested: number }>();
  for (const a of assetsWithPrice) {
    const qty = Number(a.quantity);
    const val = qty * Number(a.currentPrice);
    const cost = qty * Number(a.averagePrice);
    const existing = allocMap.get(a.type) ?? { value: 0, invested: 0 };
    existing.value += val;
    existing.invested += cost;
    allocMap.set(a.type, existing);
  }
  const allocation = Array.from(allocMap.entries()).map(([type, v]) => ({
    type,
    value: v.value,
    invested: v.invested,
    pnl: v.value - v.invested,
    pnlPct: v.invested > 0 ? ((v.value - v.invested) / v.invested) * 100 : 0,
  }));

  // Sparkline: compute running netWorth over the requested range.
  // rebase from (netWorth - Σ net) then walk forward per day.
  const txnsByDay = new Map<string, number>();
  let totalFromTxns = 0;
  for (const tx of txns as { day: Date; net: number }[]) {
    const key = tx.day.toISOString().slice(0, 10);
    txnsByDay.set(key, (txnsByDay.get(key) ?? 0) + Number(tx.net));
    totalFromTxns += Number(tx.net);
  }
  const baseNetWorth = Number(user.netWorth) - totalFromTxns;

  const rangeDays = days === "ALL" ? Math.max(1, txnsByDay.size) : (days as number);
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const sparkline: { date: string; value: number }[] = [];
  for (let i = 0; i <= rangeDays; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const running = baseNetWorth + (txnsByDay.get(key) ?? 0);
    sparkline.push({ date: key, value: Math.round(running * 100) / 100 });
  }

  return NextResponse.json({
    netWorth: Number(user.netWorth),
    cash: Number(user.cash),
    totalAssets: Number(user.totalAssets),
    totalDebt: Number(user.totalDebt),
    allocation,
    loans: loans.map((l) => ({
      ...l,
      amount: Number(l.amount),
      interestRate: Number(l.interestRate),
      remainingAmount: Number(l.remainingAmount),
    })),
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      description: e.description,
      endAt: e.endAt,
    })),
    sparkline,
    // passthrough for the chart to recompute
    cashFlowRaw: (txns as { day: Date; net: number }[]).map((t) => ({
      date: t.day.toISOString().slice(0, 10),
      net: Number(t.net),
    })),
  });
}
