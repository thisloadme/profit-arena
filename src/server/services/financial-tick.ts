import { prisma } from "@/lib/prisma";
import { FinancialStatus } from "@prisma/client";
import {
  GAME_CONFIG,
  computeFinancialStatus,
  LIVING_EXPENSE_BY_STATUS,
  type FinancialStatusKey,
} from "@/config/game";
import { getBusinessType, moraleFromWage, revenueMultiplierFromMorale, incidentChance, INCIDENT_REVENUE_MULT } from "@/config/businesses";
import { payPeriodTicks } from "@/config/jobs";
import { gaussian } from "@/server/engine/rng";

export type FinancialTickResult = {
  usersProcessed: number;
  updatedUserIds: string[];
  notifications: { userId: string; title: string; message: string }[];
};

/**
 * One financial tick: salary, business P/L, living expense, loan interest,
 * loan auto-repayment (game-monthly), late penalty, net worth recompute,
 * financial status auto-recompute (unless user pinned manually).
 *
 * per-user transactions for ACID. Batching into one giant tx would
 * be faster but locks the whole user table on a single tick — and 1 user's
 * bad row shouldn't roll back everyone else. Switch to bulk UPDATEs if
 * profiling shows per-user txns are the bottleneck.
 *
 * Tick → game-month boundary is decided by caller via TICKS_PER_GAME_DAY_PERIOD.
 */
export async function runFinancialTick(opts: {
  tickNumber: number;
}): Promise<FinancialTickResult> {
  const { tickNumber } = opts;
  const isMonthBoundary = tickNumber % GAME_CONFIG.TICKS_PER_GAME_DAY_PERIOD === 0;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      cash: true,
      financialStatus: true,
      financialStatusManual: true,
      // Liquidation hook fields: gate the trigger + measure grace window.
      isLiquidated: true,
      liquidateAt: true,
      liquidateGraceStartedAt: true,
      assets: {
        select: { id: true, symbol: true, quantity: true, currentPrice: true },
      },
      businesses: {
        where: { isActive: true },
        select: { id: true, type: true, name: true, revenuePerTick: true, expensePerTick: true, createdAtTick: true, salaryPerEmployee: true },
      },
      employments: {
        where: { status: { in: ["ACTIVE", "NOTICE"] } },
        select: {
          id: true,
          salaryPerPay: true,
          payPeriod: true,
          nextPayAtTick: true,
          status: true,
          noticeUntilTick: true,
          position: true,
          companyName: true,
        },
      },
      loansTaken: {
        where: { status: "ACTIVE" },
        select: { id: true, remainingAmount: true, interestRate: true, amount: true, tenorMonths: true },
      },
    },
  });

  const updatedIds: string[] = [];
  const allNotifications: { userId: string; title: string; message: string }[] = [];

  // per-user ACID is preserved (one bad row shouldn't roll back
  // everyone). Process users in bounded-parallel batches so we don't hammer
  // Postgres with N concurrent connections at scale.
  const BATCH = 10;
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH);
    await Promise.all(
      slice.map((u) => processOneUser({
        id: u.id,
        cash: Number(u.cash),
        financialStatus: u.financialStatus,
        financialStatusManual: u.financialStatusManual,
        isLiquidated: u.isLiquidated,
        liquidateAt: u.liquidateAt,
        liquidateGraceStartedAt: u.liquidateGraceStartedAt,
        assets: u.assets.map((a) => ({
          id: a.id,
          symbol: a.symbol,
          quantity: Number(a.quantity),
          currentPrice: Number(a.currentPrice),
        })),
        businesses: u.businesses.map((b) => ({
          id: b.id,
          type: b.type,
          name: b.name,
          revenuePerTick: Number(b.revenuePerTick),
          expensePerTick: Number(b.expensePerTick),
          createdAtTick: b.createdAtTick,
          salaryPerEmployee: Number(b.salaryPerEmployee),
        })),
        employments: u.employments.map((e) => ({
          id: e.id,
          salaryPerPay: Number(e.salaryPerPay),
          payPeriod: e.payPeriod,
          nextPayAtTick: e.nextPayAtTick,
          status: e.status,
          noticeUntilTick: e.noticeUntilTick,
          position: e.position,
          companyName: e.companyName,
        })),
        loansTaken: u.loansTaken.map((l) => ({
          id: l.id,
          remainingAmount: Number(l.remainingAmount),
          interestRate: Number(l.interestRate),
          amount: Number(l.amount),
          tenorMonths: l.tenorMonths,
        })),
      }, tickNumber, isMonthBoundary)
      .then((r) => {
        if (r) {
          updatedIds.push(r.id);
          for (const n of r.notifications) allNotifications.push(n);
        }
      })));
  }

  return { usersProcessed: users.length, updatedUserIds: updatedIds, notifications: allNotifications };
}

/**
 * Run the per-user financial computation. Returns the user's id + collected
 * notifications on success, or null on failure (isolated from other users).
 */
async function processOneUser(
  u: {
    id: string;
    cash: number;
    financialStatus: string;
    financialStatusManual: boolean;
    isLiquidated: boolean;
    liquidateAt: Date | null;
    liquidateGraceStartedAt: Date | null;
    assets: { id: string; symbol: string; quantity: number; currentPrice: number }[];
    businesses: {
      id: string;
      type: string;
      name: string;
      revenuePerTick: number;
      expensePerTick: number;
      createdAtTick: number;
      salaryPerEmployee: number;
    }[];
    employments: {
      id: string;
      salaryPerPay: number;
      payPeriod: string;
      nextPayAtTick: number;
      status: string;
      noticeUntilTick: number | null;
      position: string;
      companyName: string;
    }[];
    loansTaken: {
      id: string;
      remainingAmount: number;
      interestRate: number;
      amount: number;
      tenorMonths: number;
    }[];
  },
  tickNumber: number,
  isMonthBoundary: boolean,
): Promise<{ id: string; notifications: { userId: string; title: string; message: string }[] } | null> {
  try {
    let cash = u.cash;

    // ── Jobs: periodic salary payment (FR-29). Salary does NOT pay per-tick;
    // it pays once at nextPayAtTick. Status NOTICE still pays the next cycle,
    // then flips to TERMINATED when noticeUntilTick is reached.
    let income = 0;
    const salaryTransactions: { amount: number; description: string }[] = [];
    const employmentUpdates: { id: string; nextPayAtTick: number; status?: "ACTIVE" | "NOTICE" | "TERMINATED"; noticeUntilTick?: number | null }[] = [];

    for (const e of u.employments) {
      // Step NOTICE → TERMINATED when notice window ends.
      if (e.status === "NOTICE" && e.noticeUntilTick !== null && tickNumber >= e.noticeUntilTick) {
        employmentUpdates.push({
          id: e.id,
          nextPayAtTick: e.nextPayAtTick,
          status: "TERMINATED",
        });
      }
      // Pay salary if due (also pays during NOTICE — last paycheck).
      if (tickNumber >= e.nextPayAtTick && e.status !== "TERMINATED" && e.salaryPerPay > 0) {
        income += e.salaryPerPay;
        salaryTransactions.push({
          amount: e.salaryPerPay,
          description: `Salary — ${e.position} @ ${e.companyName}`,
        });
        const next = e.nextPayAtTick + payPeriodTicks(e.payPeriod as "WEEKLY" | "MONTHLY");
        const statusUpdate = e.status === "NOTICE" ? { status: "NOTICE" as const } : {};
        const noticeUpdate =
          e.noticeUntilTick !== null && e.noticeUntilTick !== undefined
            ? { noticeUntilTick: e.noticeUntilTick }
            : {};
        employmentUpdates.push({ id: e.id, nextPayAtTick: next, ...statusUpdate, ...noticeUpdate });
      }
    }

    // Business revenue: wage→morale→multiplier, plus volatility noise and
    // discrete incident events (supply break, walkout) that slash a tick's revenue.
    const bizIncidents: { bizName: string; loss: number }[] = [];
    const bizRevenue = u.businesses.reduce((s, b) => {
      const def = getBusinessType(b.type);
      let vol = def?.volatility ?? 0.2;

      // Experience reduces volatility: 1% per game-month, max 5%.
      // Property excluded — passive income is inherently stable.
      if (b.type !== "PROPERTY") {
        const monthsActive = (tickNumber - b.createdAtTick) / GAME_CONFIG.TICKS_PER_GAME_DAY_PERIOD;
        const reduction = Math.min(0.05, Math.max(0, monthsActive * 0.01));
        vol *= 1 - reduction;
      }

      const morale = moraleFromWage(b.type, b.salaryPerEmployee ?? 0);
      const moraleMult = revenueMultiplierFromMorale(morale);

      // Gaussian noise around the morale-adjusted baseline.
      const noise = Math.max(0, 1 + vol * gaussian());

      // Discrete incident: rare, but morale 0 is ~2.7× riskier. When it hits,
      // revenue for this tick is slashed to INCIDENT_REVENUE_MULT.
      const incidentHit = Math.random() < incidentChance(b.type, b.salaryPerEmployee ?? 0);
      let tickRevenue = b.revenuePerTick * moraleMult * noise;
      if (incidentHit) {
        const before = tickRevenue;
        tickRevenue *= INCIDENT_REVENUE_MULT;
        bizIncidents.push({ bizName: b.name, loss: before - tickRevenue });
      }
      return s + tickRevenue;
    }, 0);
    const bizExpense = u.businesses.reduce((s, b) => s + b.expensePerTick, 0);

    // Living expense scales with financial status (cheaper as you climb tiers)
    // + compounding inflation on top. Status is the user's current tier; auto-
    // recompute happens further down, after we've recomputed netWorth.
    const inflationFactor = Math.pow(1 + GAME_CONFIG.LIVING_EXPENSE_INFLATION_PER_TICK, tickNumber);
    const statusExpense = LIVING_EXPENSE_BY_STATUS[u.financialStatus as FinancialStatusKey]
      ?? GAME_CONFIG.LIVING_EXPENSE_PER_TICK;
    const livingExpense = statusExpense * inflationFactor;

    cash += income + bizRevenue - bizExpense - livingExpense;

    // Loan interest (accrue daily portion of monthly rate)
    const dailyRateFraction = 1 / GAME_CONFIG.TICKS_PER_GAME_DAY_PERIOD;
    const interestAccrued = u.loansTaken.reduce(
      (s, l) => s + l.remainingAmount * l.interestRate * dailyRateFraction,
      0,
    );
    cash -= interestAccrued;

    // Auto-repayment at month boundary
    const notifications: { title: string; message: string }[] = [];
    for (const inc of bizIncidents) {
      notifications.push({
        title: "Business incident",
        message: `${inc.bizName} hit a disruption this tick — revenue slashed ~${Math.round((1 - INCIDENT_REVENUE_MULT) * 100)}%.`,
      });
    }
    let creditScoreDelta = 0;
    const loansPaid: { id: string; remainingAmount: number; status: "ACTIVE" | "PAID" }[] = [];

    if (isMonthBoundary) {
      for (const loan of u.loansTaken) {
        const installment = (loan.amount * (1 + loan.interestRate)) / Math.max(1, loan.tenorMonths);

        if (cash >= installment) {
          cash -= installment;
          const newRemaining = Math.max(0, loan.remainingAmount - installment);
          loansPaid.push({
            id: loan.id,
            remainingAmount: newRemaining,
            status: newRemaining <= 0.01 ? "PAID" : "ACTIVE",
          });
        } else {
          // Late: penalty + credit score hit
          const penalty = installment * GAME_CONFIG.LATE_PENALTY_RATE;
          cash -= penalty;
          creditScoreDelta -= GAME_CONFIG.LATE_CREDIT_SCORE_PENALTY;
          notifications.push({
            title: "Late payment",
            message: `Loan ${loan.id.slice(0, 8)} due but insufficient balance. Penalty & credit score penalty applied.`,
          });
        }
      }
    }

    const assetsValue = u.assets.reduce((s, a) => s + a.quantity * a.currentPrice, 0);
    const totalDebt = u.loansTaken.reduce((s, l) => s + l.remainingAmount, 0);
    const netWorth = cash + assetsValue - totalDebt;

    // ── Liquidation hook ─────────────────────────────────────────────────
    // If the user has been at netWorth <= 0 for LIQUIDATION_GRACE_MS in
    // real time, sell everything, settle what we can, zero cash, and flag
    // the account so this fires exactly once. The user can recover via the
    // reset endpoint (gives a fresh STARTING_CASH). We measure grace in real
    // time — game-tick math would tie grace to TICK_INTERVAL_MS, which is
    // tunable. Real days are predictable for the player.
    //
    // While netWorth > 0, the grace start timestamp stays null. As soon as
    // we dip below 0, we set it; recovery clears it.
    const now = new Date();
    const graceExpired =
      u.liquidateGraceStartedAt !== null &&
      now.getTime() - u.liquidateGraceStartedAt.getTime() >= GAME_CONFIG.LIQUIDATION_GRACE_MS;
    if (!u.isLiquidated && netWorth <= 0 && graceExpired) {
      const liquidationCash = Math.max(0, assetsValue - totalDebt);
      await prisma.$transaction(async (tx) => {
        // Sell all asset holdings at current price.
        if (u.assets.length > 0) {
          await tx.asset.deleteMany({ where: { userId: u.id } });
        }
        // Deactivate businesses (don't hard-delete — preserves history for audit).
        if (u.businesses.length > 0) {
          await tx.business.updateMany({
            where: { ownerId: u.id, isActive: true },
            data: { isActive: false },
          });
        }
        // Cancel outstanding loans: lender loses claim, borrower no longer owes.
        // (Single-player-safe choice; for real P2P this would need escrow rules.)
        if (u.loansTaken.length > 0) {
          await tx.loan.updateMany({
            where: { borrowerId: u.id, status: "ACTIVE" },
            data: { status: "DEFAULTED" },
          });
        }
        await tx.user.update({
          where: { id: u.id },
          data: {
            cash: liquidationCash,
            totalAssets: 0,
            totalDebt: 0,
            netWorth: liquidationCash,
            isLiquidated: true,
            liquidateAt: now,
            liquidateGraceStartedAt: null,
            financialStatus: FinancialStatus.STRUGGLING,
            financialStatusManual: false,
          },
        });
      });
      notifications.push({
        title: "Account liquidated",
        message: `Your net worth stayed at or below $0 for over ${GAME_CONFIG.LIQUIDATION_GRACE_DAYS} days. Assets were sold and loans settled. Cash is now $${liquidationCash.toLocaleString("en-US")}. Visit the dashboard to reset and start fresh.`,
      });
      return { id: u.id, notifications: notifications.map((n) => ({ userId: u.id, ...n })) };
    }

    // Track grace start: stamp when first dipping below 0; clear on recovery.
    const graceUpdate =
      netWorth > 0
        ? { liquidateGraceStartedAt: null }
        : u.liquidateGraceStartedAt === null
          ? { liquidateGraceStartedAt: now }
          : {};

    // Auto-recompute financial status unless the user pinned it manually.
    // tier flip is rare and idempotent — single UPDATE, no notification
    // spam. The next time it changes, the notification below only fires on the
    // boundary crossing tick (statusChanged gate).
    let statusChanged = false;
    let effectiveStatus: FinancialStatusKey = u.financialStatus as FinancialStatusKey;
    if (!u.financialStatusManual) {
      const next = computeFinancialStatus(netWorth);
      if (next !== u.financialStatus) {
        effectiveStatus = next;
        statusChanged = true;
      } else {
        effectiveStatus = u.financialStatus as FinancialStatusKey;
      }
    }
    if (statusChanged) {
      notifications.push({
        title: "Financial status changed",
        message: `You're now ${effectiveStatus.toLowerCase()} — living expense adjusted automatically.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: u.id },
        data: {
          cash,
          totalAssets: assetsValue,
          totalDebt,
          netWorth,
          ...(statusChanged ? { financialStatus: effectiveStatus } : {}),
          ...graceUpdate,
        },
      });

      if (income > 0) {
        // one row per pay cycle per employment keeps the history
        // inspectable instead of an opaque total. Cheap on insert, useful on
        // Reports. Merge to a sum only if profiling shows it matters.
        for (const st of salaryTransactions) {
          await tx.transaction.create({
            data: { userId: u.id, type: "SALARY", amount: st.amount, description: st.description },
          });
        }
      }

      // Employment state machine: pay cadence advance + auto-terminate NOTICE.
      // Updates are deduped by employment id (last write wins, but they're
      // always aligned — pay cadence bump plus optional status flip).
      const employmentMerged = new Map<string, { id: string; nextPayAtTick: number; status?: "ACTIVE" | "NOTICE" | "TERMINATED"; noticeUntilTick?: number | null }>();
      for (const u2 of employmentUpdates) {
        const prev = employmentMerged.get(u2.id);
        if (!prev) { employmentMerged.set(u2.id, u2); continue; }
        employmentMerged.set(u2.id, {
          id: u2.id,
          nextPayAtTick: u2.nextPayAtTick,
          status: u2.status ?? prev.status,
          noticeUntilTick: u2.noticeUntilTick !== undefined ? u2.noticeUntilTick : prev.noticeUntilTick,
        });
      }
      for (const eu of employmentMerged.values()) {
        await tx.employment.update({
          where: { id: eu.id },
          data: {
            nextPayAtTick: eu.nextPayAtTick,
            ...(eu.status ? { status: eu.status } : {}),
            ...(eu.noticeUntilTick !== undefined ? { noticeUntilTick: eu.noticeUntilTick } : {}),
          },
        });
      }

      if (bizRevenue - bizExpense !== 0) {
        await tx.transaction.create({
          data: {
            userId: u.id,
            type: "BUSINESS_REVENUE",
            amount: bizRevenue - bizExpense,
            description: "Business profit",
          },
        });
      }
      await tx.transaction.create({
        data: {
          userId: u.id,
          type: "EXPENSE",
          amount: livingExpense,
          description: `Living expense (${effectiveStatus})`,
        },
      });
      if (interestAccrued > 0) {
        await tx.transaction.create({
          data: {
            userId: u.id,
            type: "LOAN_INTEREST",
            amount: interestAccrued,
            description: "Loan interest",
          },
        });
      }

      for (const lp of loansPaid) {
        await tx.loan.update({
          where: { id: lp.id },
          data: { remainingAmount: lp.remainingAmount, status: lp.status },
        });
      }

      if (creditScoreDelta !== 0) {
        await tx.creditScore.update({
          where: { userId: u.id },
          data: { score: { increment: creditScoreDelta } },
        });
      }

      for (const n of notifications) {
        await tx.notification.create({ data: { userId: u.id, ...n } });
      }
    });

    return { id: u.id, notifications: notifications.map((n) => ({ userId: u.id, ...n })) };
  } catch (err) {
    // One user's failure must not break the whole tick — log and skip.
    console.error("[financial-tick] user failed", u.id, err);
    return null;
  }
}
