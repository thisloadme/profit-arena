import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getActiveEvents } from "@/server/engine/event-engine";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { StatCard } from "@/components/ui/stat-card";
import { NetWorthHero } from "@/components/features/net-worth-hero";
import { AllocationPie } from "@/components/features/allocation-pie";
import { CashFlowChart } from "@/components/features/cash-flow-chart";
import { ActiveLoans } from "@/components/features/active-loans";
import { EventFeed } from "@/components/features/event-feed";
import { MarketTicker } from "@/components/features/market-ticker";
import { DailyQuests } from "@/components/features/daily-quests";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.sub) return null;

  const uid = session.sub;

  const [user, market, events, loans, txns, assetsWithPrice] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: uid },
      select: { username: true, cash: true, netWorth: true, totalAssets: true, totalDebt: true },
    }),
    prisma.marketData.findMany({
      orderBy: { type: "asc" },
      select: { symbol: true, type: true, currentPrice: true, lastUpdated: true },
    }),
    getActiveEvents(),
    prisma.loan.findMany({
      where: { borrowerId: uid, status: "ACTIVE" },
      select: { id: true, amount: true, interestRate: true, remainingAmount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.$queryRaw<{ day: Date; net: number }[]>`
      SELECT DATE("createdAt") as day, SUM(amount) as net
      FROM transactions
      WHERE "userId" = ${uid}::uuid AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day
    `,
    prisma.asset.findMany({
      where: { userId: uid },
      select: { type: true, symbol: true, quantity: true, currentPrice: true, averagePrice: true },
      orderBy: { type: "asc" },
    }),
  ]);

  // Asset allocation
  const allocMap = new Map<string, { value: number; invested: number }>();
  for (const a of assetsWithPrice) {
    const val = a.quantity * a.currentPrice;
    const cost = a.quantity * a.averagePrice;
    const ex = allocMap.get(a.type) ?? { value: 0, invested: 0 };
    ex.value += val;
    ex.invested += cost;
    allocMap.set(a.type, ex);
  }
  const allocation = Array.from(allocMap.entries()).map(([type, v]) => ({
    type,
    value: v.value,
    invested: v.invested,
    pnl: v.value - v.invested,
    pnlPct: v.invested > 0 ? ((v.value - v.invested) / v.invested) * 100 : 0,
  }));

  // Sparkline: running 30-day balance from transactions
  const txnsByDay = new Map<string, number>();
  let totalFromTxns = 0;
  for (const tx of txns) {
    const key = tx.day.toISOString().slice(0, 10);
    txnsByDay.set(key, (txnsByDay.get(key) ?? 0) + Number(tx.net));
    totalFromTxns += Number(tx.net);
  }
  const baseCash = user.cash - totalFromTxns;
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sparkline: { date: string; value: number }[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(thirtyAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const running = baseCash + (txnsByDay.get(key) ?? 0);
    sparkline.push({ date: key, value: Math.round(running * 100) / 100 });
  }

  // Cash flow data
  const cashFlow = (txns as { day: Date; net: number }[]).map((t) => ({
    date: t.day.toISOString().slice(0, 10),
    net: Number(t.net),
  }));

  // Events
  const eventList = events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    description: e.description,
    endAt: e.endAt,
  }));

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      {/* Page header */}
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Dashboard
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-text">
          Welcome back, <span className="text-primary">{user.username}</span>
        </h1>
      </header>

      {/* Quick stats — glass variant, 4-up */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard variant="glass" label="Net Worth" value={<AnimatedMoney value={user.netWorth} compact />} />
        <StatCard variant="glass" label="Cash" value={<AnimatedMoney value={user.cash} compact />} />
        <StatCard variant="glass" label="Assets" value={<AnimatedMoney value={user.totalAssets} compact />} />
        <StatCard variant="glass" label="Debt" value={<AnimatedMoney value={user.totalDebt} compact />} />
      </section>

      {/* Main 12-col grid: 8 (left) + 4 (right rail) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <NetWorthHero
            netWorth={user.netWorth}
            prevNetWorth={sparkline.length > 1 ? sparkline[sparkline.length - 2].value : user.netWorth}
            sparkline={sparkline}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AllocationPie allocation={allocation} />
            <CashFlowChart cashFlow={cashFlow} />
          </div>

          <ActiveLoans loans={loans} />
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <EventFeed events={eventList} />
          <MarketTicker initial={market} />
          <DailyQuests />
        </div>
      </div>
    </div>
  );
}
