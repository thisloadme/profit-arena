/**
 * Single source of truth for tunable game constants.
 * No magic numbers in business logic — import from here.
 */

export const GAME_CONFIG = {
  /** Player starting cash. Per PRD: start from 0. Cash buffer for new player survival. */
  STARTING_CASH: 5000,

  /** Default salary per tick for a fresh corporate job. */
  DEFAULT_SALARY_PER_TICK: 50,

  /** Living expense deducted every tick (with inflation applied). */
  LIVING_EXPENSE_PER_TICK: 20,
  LIVING_EXPENSE_INFLATION_PER_TICK: 0.0003, // 0.03% compounding — gentle pressure, not punishing

  /** Tick interval in ms (overridable via env). 1 tick = 1 game minute. */
  TICK_INTERVAL_MS: Number(process.env.TICK_INTERVAL_MS) || 10_000,

  /** How many ticks in one game day (1440 min). Financial tick runs at this boundary. */
  TICKS_PER_GAME_DAY: 1440,

  /** Game-time mapping: 1 game-day = 1440 ticks (1 game-month ≈ 1 game-day for loan feedback). */
  TICKS_PER_GAME_MONTH: 1_440, // Loan repayment every ~4h real-time instead of 5 days

  /** Start date of the game world. All game time is relative to this. */
  GAME_START_DATE: new Date("2018-01-01T00:00:00Z"),

  /** Stock market hours (in-game time). */
  STOCK_MARKET_OPEN_HOUR: 20, // 8 PM
  STOCK_MARKET_CLOSE_HOUR: 3, // 3 AM

  /** Bank NPC lending. */
  BANK_BASE_RATE_MONTHLY: 0.01, // 1% / month
  BANK_MAX_LOAN_TO_NETWORTH: 0.5, // cap at 50% of net worth
  BANK_MIN_CREDIT_SCORE: 600,

  /** Late payment. */
  LATE_PENALTY_RATE: 0.05, // 5% of installment
  LATE_CREDIT_SCORE_PENALTY: 25,
  DEFAULT_AFTER_LATE_MONTHS: 3,

  /** Player credit score. */
  CREDIT_SCORE_DEFAULT: 700,
  CREDIT_SCORE_MIN: 300,
  CREDIT_SCORE_MAX: 850,

  /** Trade anti-cheat: max trades per user per tick. */
  MAX_TRADES_PER_TICK: 10,
} as const;

/** Number formatter for currency. */
export const CURRENCY_LOCALE = "en-US";
export const CURRENCY_CODE = "USD";

export function formatMoney(value: number, opts?: { compact?: boolean }) {
  if (opts?.compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: CURRENCY_CODE,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
