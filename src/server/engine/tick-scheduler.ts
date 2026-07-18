import { prisma } from "@/lib/prisma";
import { GAME_CONFIG } from "@/config/game";
import { MAX_RETENTION_TICKS, PRUNE_EVERY_TICKS } from "@/config/timeframes";
import { nextPriceFor, consumeVolume, type ActiveEventImpact } from "./price-engine";
import { expireEvents, getGlobalImpact, rollNewEvents, getActiveEvents } from "./event-engine";
import { runFinancialTick } from "@/server/services/financial-tick";
import { recomputeLeaderboard } from "./leaderboard";
import { evaluateAchievements } from "./achievements";
import { getIO, notifyUser } from "./socket-server";
import { executeLimitOrders } from "./limit-order-engine";

type State = {
  running: boolean;
  tickNumber: number;
  lastTickAt: number | null;
  lastDurationMs: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  inTick: boolean; // mutex
};

// ponytail: globalThis singleton — tsx creates separate module instances per import.
const KEY = "__ticker_state__";
function getState(): State {
  if (!(globalThis as Record<string, unknown>)[KEY]) {
    (globalThis as Record<string, unknown>)[KEY] = {
      running: false,
      tickNumber: 0,
      lastTickAt: null,
      lastDurationMs: null,
      timer: null,
      inTick: false,
    };
  }
  return (globalThis as Record<string, unknown>)[KEY] as State;
}

function scheduleNext() {
  const st = getState();
  if (!st.running) return;
  st.timer = setTimeout(() => {
    void runOneTick().finally(scheduleNext);
  }, GAME_CONFIG.TICK_INTERVAL_MS);
}

/**
 * Execute one tick: expire events, roll new, update prices, persist,
 * run financial updates, broadcast to all connected clients.
 *
 * Mutex via `inTick` boolean — if previous tick still running, this one is skipped.
 * ponytail: global lock. Per-user locks would help if financial-tick becomes a
 * bottleneck, but at MVP scale the global flag is the cheapest correct option.
 */
export async function runOneTick(): Promise<void> {
  if (getState().inTick) return;
  getState().inTick = true;
  const started = Date.now();

  try {
    getState().tickNumber += 1;
    const now = new Date();

    // 1) Events
    await expireEvents(now);
    await rollNewEvents(now);
    const impact: ActiveEventImpact = await getGlobalImpact();

    // 2) Update all market prices + persist
    const markets = await prisma.marketData.findMany();
    const updates: { symbol: string; price: number; changePct: number; type: string }[] = [];
    const historyRows: { symbol: string; price: number; tickAt: Date }[] = [];

    for (const m of markets) {
      const r = nextPriceFor(
        {
          symbol: m.symbol,
          currentPrice: Number(m.currentPrice),
          volatility: Number(m.volatility),
          trendFactor: Number(m.trendFactor),
        },
        [impact],
        consumeVolume(m.symbol),
      );
      updates.push({ symbol: m.symbol, price: r.newPrice, changePct: r.changePct, type: m.type });
      historyRows.push({ symbol: m.symbol, price: r.newPrice, tickAt: now });
    }

    // Bulk price update (one UPDATE per row is fine at MVP scale)
    await prisma.$transaction([
      ...markets.map((m, i) =>
        prisma.marketData.update({
          where: { id: m.id },
          data: { currentPrice: updates[i]!.price },
        }),
      ),
    ]);

    // Persist price history (batched)
    await prisma.priceHistory.createMany({ data: historyRows });

    // Periodically drop history older than the max chart timeframe (3 game-months).
    // Keeps the table bounded; runs every PRUNE_EVERY_TICKS ticks to stay cheap.
    // Pruned in chunks to avoid holding a row-level lock on huge batches.
    if (getState().tickNumber % PRUNE_EVERY_TICKS === 0) {
      const cutoff = new Date(now.getTime() - MAX_RETENTION_TICKS * GAME_CONFIG.TICK_INTERVAL_MS);
      const CHUNK = 500;
      let totalPruned = 0;
      try {
        // Repeat chunked deletes until no more stale rows remain. Each chunk
        // acquires a short lock and releases before the next, so concurrent
        // chart reads don't get blocked behind a giant DELETE.
        for (;;) {
          const dropped = await prisma.$executeRaw`
            DELETE FROM "price_history"
            WHERE "id" IN (
              SELECT "id" FROM "price_history"
              WHERE "tickAt" < ${cutoff}::timestamptz
              LIMIT ${CHUNK}
            )
          `;
          totalPruned += Number(dropped);
          if (Number(dropped) < CHUNK) break;
        }
        if (totalPruned > 0) console.log(`[tick] pruned ${totalPruned} stale price-history rows (older than ${cutoff.toISOString()})`);
      } catch (e) {
        console.error("[tick] price-history prune failed:", e);
      }
    }

    // Update asset currentPrice for holders (denormalized)
    for (const u of updates) {
      await prisma.asset.updateMany({
        where: { symbol: u.symbol },
        data: { currentPrice: u.price, lastUpdated: now },
      });
    }

    // 2a) Execute limit orders that now meet their price conditions
    await executeLimitOrders();

    // 3) Financial updates (salary, loans, etc.) per user
    const finResult = await runFinancialTick({ tickNumber: getState().tickNumber });

    const io = getIO();

    // 3a) Loan due reminders (H-3, H-1, H-0)
    try {
      const dueLoans = await prisma.loan.findMany({
        where: { status: "ACTIVE", borrowerId: { not: null }, dueDate: { not: null } },
        select: { id: true, dueDate: true, borrowerId: true, amount: true },
      });
      for (const ln of dueLoans) {
        if (!ln.dueDate || !ln.borrowerId) continue;
        const diffMs = ln.dueDate.getTime() - now.getTime();
        const amtStr = Number(ln.amount).toLocaleString("en-US");
        const dueStr = ln.dueDate.toLocaleDateString("en-US");
        let title = "";
        let message = "";
        if (diffMs <= 0) {
          title = "🔴 Loan Due!";
          message = `Loan $${amtStr} is due today. Pay now!`;
        } else if (diffMs <= GAME_CONFIG.TICK_INTERVAL_MS) {
          title = "⚠️ Due Tomorrow";
          message = `Loan $${amtStr} is due tomorrow (${dueStr}).`;
        } else if (diffMs <= GAME_CONFIG.TICK_INTERVAL_MS * 3) {
          title = "📅 Upcoming Due";
          message = `Loan $${amtStr} is due ${dueStr}. Prepare funds.`;
        }
        if (title) {
          await prisma.notification.create({
            data: { userId: ln.borrowerId, title, message },
          });
          if (io) io.to(`user:${ln.borrowerId}`).emit("notification:new", { title, message, at: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.error("[tick] loan-due check failed:", e);
    }

    // 3b) Leaderboard snapshot (every 5th tick to reduce DB load)
    if (getState().tickNumber % 5 === 0) {
      const lb = await recomputeLeaderboard(getState().tickNumber);
      io?.emit("leaderboard:update", { tick: getState().tickNumber, count: lb.length });
    }

      // 3c) Evaluate achievements (per user, every tick)
      if (finResult.updatedUserIds.length > 0) {
        // Check if recession is active (for SURVIVE_RECESSION achievement)
        const activeRecession = await prisma.gameEvent.findFirst({
          where: { isActive: true, description: { startsWith: "Resesi" } },
          select: { id: true },
        });
        const hasActiveRecession = !!activeRecession;

        // Batch fetch user state for achievement eval.
        const achievementUsers = await prisma.user.findMany({
          where: { id: { in: finResult.updatedUserIds } },
          select: {
            id: true,
            netWorth: true,
            assets: { select: { symbol: true, type: true } },
            businesses: { where: { isActive: true }, select: { id: true } },
            loansGiven: { where: { status: "ACTIVE" }, select: { id: true, status: true, borrowerId: true } },
            loansTaken: { where: { status: "ACTIVE" }, select: { id: true, status: true } },
          },
        });
        for (const u of achievementUsers) {
          // Filter self-lent bank loans (lenderId == borrowerId == self) — they
          // shouldn't count as "lending to other players" for achievements.
          const realLoansGiven = u.loansGiven.filter((l) => l.borrowerId !== u.id);
          await evaluateAchievements({
            userId: u.id,
            netWorth: Number(u.netWorth),
            hasActiveLoan: u.loansTaken.length > 0,
            activeAssets: u.assets.map((a) => ({ symbol: a.symbol, type: a.type })),
            hasBusiness: u.businesses.length > 0,
            hasCrypto: u.assets.some((a) => a.type === "CRYPTO"),
            hasTraded: u.assets.length > 0,
            hasLent: realLoansGiven.some((l) => l.status === "ACTIVE"),
            hasBorrower: u.loansTaken.some((l) => l.status === "ACTIVE"),
            hasSurvivedRecession: hasActiveRecession && Number(u.netWorth) > 0,
          });
        }
      }

    // 4) Broadcast
    if (io) {
      io.emit("market:update", { tick: getState().tickNumber, prices: updates, at: now.toISOString() });
      io.emit("event:active", await getActiveEvents());

      // Notify each affected user to refresh net worth
      for (const userId of finResult.updatedUserIds) {
        io.to(`user:${userId}`).emit("user:tick", { tick: getState().tickNumber });
      }
      // Push notification events to affected users' rooms.
      for (const n of finResult.notifications) {
        notifyUser(n.userId, { title: n.title, message: n.message });
      }
    }

    getState().lastTickAt = started;
    getState().lastDurationMs = Date.now() - started;

    // Persist tickNumber to DB for crash recovery
    await persistTickNumber(getState().tickNumber);
  } catch (err) {
    console.error("[tick] failed:", err);
  } finally {
    getState().inTick = false;
  }
}

/** Upsert current tickNumber into simulation_state. */
async function persistTickNumber(tickNumber: number): Promise<void> {
  try {
    await prisma.simulationState.upsert({
      where: { id: 1 },
      create: { id: 1, tickNumber },
      update: { tickNumber },
    });
  } catch (e) {
    console.error("[ticker] persist failed:", e);
  }
}

export async function startTicker(): Promise<void> {
  const s = getState();
  if (s.running) return;

  // Restore tickNumber from DB for continuity across restarts
  try {
    const saved = await prisma.simulationState.findUnique({ where: { id: 1 } });
    if (saved) s.tickNumber = saved.tickNumber;
  } catch (e) {
    console.warn("[ticker] unable to restore tickNumber, starting from 0:", e);
  }

  s.running = true;
  scheduleNext();
  console.log("[ticker] started at tick", s.tickNumber);
}

export function getTickerState() {
  const s = getState();
  return {
    running: s.running,
    tickNumber: s.tickNumber,
    lastTickAt: s.lastTickAt,
    lastDurationMs: s.lastDurationMs,
    gameTimeMs: s.tickNumber * 60_000,
  };
}

/** Current game time as ms since GAME_START_DATE. */
export function getGameTimeMs(): number {
  return getState().tickNumber * 60_000;
}

/** Current game time as a Date object. */
export function getGameTimeDate(): Date {
  return new Date(GAME_CONFIG.GAME_START_DATE.getTime() + getGameTimeMs());
}

/**
 * Check whether trading is allowed for a given asset type at the current game time.
 * Stocks have restricted hours (8 PM – 3 AM in-game time).
 * All other asset types are always tradeable.
 */
export function isMarketOpen(assetType: string, gameTimeMs?: number): boolean {
  if (assetType !== "STOCK") return true;
  const ms = gameTimeMs ?? getGameTimeMs();
  const gameDate = new Date(GAME_CONFIG.GAME_START_DATE.getTime() + ms);
  const hour = gameDate.getUTCHours();
  const open = GAME_CONFIG.STOCK_MARKET_OPEN_HOUR; // 20 (8 PM)
  const close = GAME_CONFIG.STOCK_MARKET_CLOSE_HOUR; // 3 (3 AM)
  // Wraps past midnight: 8 PM (20) to 3 AM next day
  return hour >= open || hour < close;
}

/** Format game-time ms to HH:MM display (no seconds). */
export function formatGameTime(ms: number): string {
  const gameDate = new Date(GAME_CONFIG.GAME_START_DATE.getTime() + ms);
  const h = gameDate.getUTCHours();
  const m = gameDate.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
