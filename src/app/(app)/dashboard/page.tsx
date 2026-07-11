import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getActiveEvents } from "@/server/engine/event-engine";
import { Money } from "@/components/ui/money";
import { NetWorthHero } from "@/components/features/net-worth-hero";
import { AllocationPie } from "@/components/features/allocation-pie";
import { EventFeed } from "@/components/features/event-feed";
import { MarketTicker } from "@/components/features/market-ticker";
import { PRIMARY_NAV } from "@/config/nav";
import { cn } from "@/lib/cn";

const TYPE_COLORS: Record<string, string> = {
  BUY: "text-loss", SELL: "text-profit", SALARY: "text-profit",
  BUSINESS_REVENUE: "text-profit", EXPENSE: "text-loss",
  LOAN_GIVEN: "text-loss", LOAN_RECEIVED: "text-profit",
  LOAN_PAYMENT: "text-loss", LOAN_INTEREST: "text-loss",
};

const TYPE_LABELS: Record<string, string> = {
  BUY: "Buy", SELL: "Sell", SALARY: "Salary",
  BUSINESS_REVENUE: "Business", EXPENSE: "Expense",
  LOAN_GIVEN: "Lent", LOAN_RECEIVED: "Borrowed",
  LOAN_PAYMENT: "Repaid", LOAN_INTEREST: "Interest",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.sub) return null;

  const uid = session.sub;

  const [user, market, events, recentTxns, assetsWithPrice] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: uid },
      select: { username: true, cash: true, netWorth: true, totalAssets: true, totalDebt: true },
    }),
    prisma.marketData.findMany({
      orderBy: { type: "asc" },
      select: { symbol: true, type: true, currentPrice: true, lastUpdated: true },
    }),
    getActiveEvents(),
    prisma.transaction.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      take: 7,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    }),
    prisma.asset.findMany({
      where: { userId: uid },
      select: { type: true, quantity: true, currentPrice: true, averagePrice: true },
      orderBy: { type: "asc" },
    }),
  ]);

  // 30-day net worth velocity from transactions (anchored to current net worth).
  const txns30d = await prisma.$queryRaw<{ day: Date; net: number }[]>`
    SELECT DATE("createdAt") as day, SUM(amount) as net
    FROM transactions
    WHERE "userId" = ${uid}::uuid AND "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day
  `;
  const txnsByDay = new Map<string, number>();
  let totalFromTxns = 0;
  for (const tx of txns30d) {
    const key = tx.day.toISOString().slice(0, 10);
    txnsByDay.set(key, (txnsByDay.get(key) ?? 0) + Number(tx.net));
    totalFromTxns += Number(tx.net);
  }
  const baseNetWorth = user.netWorth - totalFromTxns;
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sparkline: { date: string; value: number }[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(thirtyAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const running = baseNetWorth + (txnsByDay.get(key) ?? 0);
    sparkline.push({ date: key, value: Math.round(running * 100) / 100 });
  }

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

  const eventList = events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    description: e.description,
    endAt: e.endAt,
  }));

  // Quick-access module links (exclude dashboard itself).
  const moduleLinks = PRIMARY_NAV.filter((n) => n.href !== "/dashboard");

  return (
    // Full-viewport bento: fill exactly one screen, no page scroll.
    // <main> already pads bottom for mobile nav; use calc against 64px topbar.
    <div className="mx-auto flex h-[calc(100svh-4rem)] max-h-[920px] w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      {/* Compact page header */}
      <header className="flex shrink-0 items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-text">
            Welcome back, <span className="text-primary">{user.username}</span>
          </h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Dashboard
          </span>
        </div>
        <div className="flex items-baseline gap-4 text-xs">
          <span className="text-text-faint">
            Assets <Money value={user.totalAssets} compact className="tnum font-medium text-text" />
          </span>
          <span className="text-text-faint">
            Debt <Money value={user.totalDebt} compact className="tnum font-medium text-loss" />
          </span>
        </div>
      </header>

      {/* Two-column bento grid — fills remaining height */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: net worth chart grows + module links strip */}
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-7">
          <NetWorthHero
            netWorth={user.netWorth}
            prevNetWorth={sparkline.length > 1 ? sparkline[sparkline.length - 2]!.value : user.netWorth}
            sparkline={sparkline}
            className="min-h-0 flex-1"
          />

          {/* Module links strip — horizontal on desktop, wraps on mobile */}
          <section className="glass-panel shrink-0 p-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
              {moduleLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col items-center gap-1.5 rounded-md border border-border bg-surface-lowest/40 px-2 py-2.5 text-center transition-colors hover:border-primary/40 hover:bg-surface-highest/60"
                    title={`${item.label} (${item.shortcut.toUpperCase()})`}
                  >
                    <Icon className="h-4 w-4 text-text-muted transition-colors group-hover:text-primary" />
                    <span className="text-[11px] font-medium leading-tight text-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: stacked panels — internal scroll if content overflows */}
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-5">
          <AllocationPie allocation={allocation} className="shrink-0" />

          {/* Live feed + history share the remaining space side by side on xl */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
            <EventFeed events={eventList} className="min-h-0 flex-1 overflow-y-auto" />
            <div className="shrink-0">
              <MarketTicker initial={market} />
            </div>

            {/* Mini history */}
            <section className="glass-panel min-h-0 flex-1 overflow-y-auto p-4 xl:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                  Recent Activity
                </h2>
                <Link
                  href="/history"
                  className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
                >
                  View all
                </Link>
              </div>
              {recentTxns.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-faint">No transactions yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {recentTxns.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-text">{tx.description}</p>
                        <p className="text-[10px] uppercase tracking-wide text-text-faint">
                          {TYPE_LABELS[tx.type] ?? tx.type} ·{" "}
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Money
                        value={tx.amount}
                        compact
                        signed
                        className={cn("tnum text-xs font-semibold", TYPE_COLORS[tx.type] ?? "text-text")}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
