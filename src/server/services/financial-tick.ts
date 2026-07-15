import { prisma } from "@/lib/prisma";
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
 * ponytail: per-user transactions for ACID. Batching into one giant tx would
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
      assets: { select: { symbol: true, quantity: true, currentPrice: true } },
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

  for (const u of users) {
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
        const next = e.nextPayAtTick + payPeriodTicks(e.payPeriod);
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

    // Auto-recompute financial status unless the user pinned it manually.
    // ponytail: tier flip is rare and idempotent — single UPDATE, no notification
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
        },
      });

      if (income > 0) {
        // ponytail: one row per pay cycle per employment keeps the history
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

    updatedIds.push(u.id);
    for (const n of notifications) allNotifications.push({ userId: u.id, ...n });
  }

  return { usersProcessed: users.length, updatedUserIds: updatedIds, notifications: allNotifications };
}
