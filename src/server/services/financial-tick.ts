import { prisma } from "@/lib/prisma";
import { GAME_CONFIG } from "@/config/game";
import { getBusinessType, moraleFromWage, revenueMultiplierFromMorale, incidentChance, INCIDENT_REVENUE_MULT } from "@/config/businesses";
import { gaussian } from "@/server/engine/rng";

export type FinancialTickResult = {
  usersProcessed: number;
  updatedUserIds: string[];
  notifications: { userId: string; title: string; message: string }[];
};

/**
 * One financial tick: salary, business P/L, living expense, loan interest,
 * loan auto-repayment (game-monthly), late penalty, net worth recompute.
 *
 * ponytail: per-user transactions for ACID. Batching into one giant tx would
 * be faster but locks the whole user table on a single tick — and 1 user's
 * bad row shouldn't roll back everyone else. Switch to bulk UPDATEs if
 * profiling shows per-user txns are the bottleneck.
 *
 * Tick → game-month boundary is decided by caller via TICKS_PER_GAME_MONTH.
 */
export async function runFinancialTick(opts: {
  tickNumber: number;
}): Promise<FinancialTickResult> {
  const { tickNumber } = opts;
  const isMonthBoundary = tickNumber % GAME_CONFIG.TICKS_PER_GAME_MONTH === 0;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      cash: true,
      assets: { select: { symbol: true, quantity: true, currentPrice: true } },
      businesses: {
        where: { isActive: true },
        select: { id: true, type: true, name: true, revenuePerTick: true, expensePerTick: true, createdAtTick: true, salaryPerEmployee: true },
      },
      employments: {
        where: { isActive: true },
        select: { salaryPerTick: true },
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

    // Income
    const income = u.employments.reduce((s, e) => s + e.salaryPerTick, 0);

    // Business revenue: wage→morale→multiplier, plus volatility noise and
    // discrete incident events (supply break, walkout) that slash a tick's revenue.
    const bizIncidents: { bizName: string; loss: number }[] = [];
    const bizRevenue = u.businesses.reduce((s, b) => {
      const def = getBusinessType(b.type);
      let vol = def?.volatility ?? 0.2;

      // Experience reduces volatility: 1% per game-month, max 5%.
      // Property excluded — passive income is inherently stable.
      if (b.type !== "PROPERTY") {
        const monthsActive = (tickNumber - b.createdAtTick) / GAME_CONFIG.TICKS_PER_GAME_MONTH;
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

    // Living expense with compounding inflation per tick
    const inflationFactor = Math.pow(1 + GAME_CONFIG.LIVING_EXPENSE_INFLATION_PER_TICK, tickNumber);
    const livingExpense = GAME_CONFIG.LIVING_EXPENSE_PER_TICK * inflationFactor;

    cash += income + bizRevenue - bizExpense - livingExpense;

    // Loan interest (accrue daily portion of monthly rate)
    const dailyRateFraction = 1 / GAME_CONFIG.TICKS_PER_GAME_MONTH;
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

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: u.id },
        data: { cash, totalAssets: assetsValue, totalDebt, netWorth },
      });

      if (income > 0) {
        await tx.transaction.create({
          data: { userId: u.id, type: "SALARY", amount: income, description: "Salary" },
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
        data: { userId: u.id, type: "EXPENSE", amount: livingExpense, description: "Living expense" },
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
