/**
 * Single source of truth for tunable game constants.
 * No magic numbers in business logic — import from here.
 */

export type FinancialStatusKey = "STRUGGLING" | "STABLE" | "COMFORTABLE" | "WEALTHY";

/**
 * Per-tick living expense, indexed by financial status.
 * Models "lifestyle creep": wealthier tiers spend more in absolute terms
 * (housing, transport, staff, leisure), even though their net worth makes the
 * ratio trivial. The poor burn less dollars but feel every tick. Sultan-tier
 * players still need passive income to sustain the burn.
 * ponytail: hand-tuned tiers; keep the STRUGGLING rate high enough that an
 * unemployed user visibly drains, but low enough that the default STABLE
 * job still grows net worth.
 */
export const LIVING_EXPENSE_BY_STATUS: Record<FinancialStatusKey, number> = {
  STRUGGLING: 3,    // basic needs, small cash burn every tick
  STABLE: 12,       // baseline (~$17K / game-day)
  COMFORTABLE: 28,  // comforts stack up (~$40K / game-day)
  WEALTHY: 55,      // mansion, cars, staff — demands real passive income
};

/**
 * Net worth tier boundaries. Status auto-updates when net worth crosses
 * these (and user hasn't pinned it manually). Boundaries read top→bottom.
 */
export const FINANCIAL_STATUS_THRESHOLDS: { status: FinancialStatusKey; minNetWorth: number }[] = [
  { status: "WEALTHY",    minNetWorth: 1_000_000 },
  { status: "COMFORTABLE", minNetWorth:   100_000 },
  { status: "STABLE",      minNetWorth:    10_000 },
  { status: "STRUGGLING",  minNetWorth:         0 },
];

/** Resolve status from net worth (auto-mode only). */
export function computeFinancialStatus(netWorth: number): FinancialStatusKey {
  for (const t of FINANCIAL_STATUS_THRESHOLDS) {
    if (netWorth >= t.minNetWorth) return t.status;
  }
  return "STRUGGLING";
}

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatusKey, { label: string; description: string }> = {
  STRUGGLING: {
    label: "Struggling",
    description: "Cash is tight and every tick hurts. Your daily burn is small but your income is smaller. Auto-upgrades at $10K net worth.",
  },
  STABLE: {
    label: "Stable",
    description: "You cover your bills and have a little left over. The default starting tier. Auto-upgrades at $100K.",
  },
  COMFORTABLE: {
    label: "Comfortable",
    description: "Your lifestyle costs more each tick — nicer place, better food, the occasional splurge. Income needs to keep pace. Auto-upgrades at $1M.",
  },
  WEALTHY: {
    label: "Wealthy",
    description: "Mansion, staff, cars, leisure. The lifestyle burns the most in absolute terms — passive income isn't optional, it's required.",
  },
};

export const GAME_CONFIG = {
  /** Player starting cash. Per PRD: start from 0. Cash buffer for new player survival. */
  STARTING_CASH: 5000,

  /** Living expense baseline (STABLE tier). Other tiers see higher/lower in LIVING_EXPENSE_BY_STATUS. */
  LIVING_EXPENSE_PER_TICK: 20,
  LIVING_EXPENSE_INFLATION_PER_TICK: 0.0003, // 0.03% compounding — gentle pressure, not punishing

  /** Tick interval in ms (overridable via env). 1 tick = 1 game minute. */
  TICK_INTERVAL_MS: Number(process.env.TICK_INTERVAL_MS) || 10_000,

  /** How many ticks in one game day (1440 min). Financial tick runs at this boundary. */
  TICKS_PER_GAME_DAY: 1440,

  /** Loan repayment cadence = 1 game-day (kept short for player feedback loop). */
  TICKS_PER_GAME_DAY_PERIOD: 1_440,

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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Rich in-game clock label, e.g. "Mon, W1 Jul, 22:10". No year. */
export function formatGameTimeRich(ms: number): string {
  const d = new Date(GAME_CONFIG.GAME_START_DATE.getTime() + ms);
  const weekday = WEEKDAY_SHORT[d.getUTCDay()];
  const weekOfMonth = Math.floor((d.getUTCDate() - 1) / 7) + 1;
  const month = MONTH_SHORT[d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${weekday}, W${weekOfMonth} ${month}, ${hh}:${mm}`;
}
