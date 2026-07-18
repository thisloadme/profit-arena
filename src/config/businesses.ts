/**
 * Business type definitions — single source of truth for costs & scaling,
 * wages, morale, and risk incidents.
 */

/** Wage ratio (actual / base) at which morale hits floor (0) and ceiling (100). */
export const WAGE_RATIO_FLOOR = 0.4; // 0.4× base → morale ~0 (sweatshop, high incidents)
export const WAGE_RATIO_NEUTRAL = 1; // 1× base → morale ~70 (sustainable)
export const WAGE_RATIO_CEILING = 2; // 2× base → morale 100 (premium, low incidents)

/** Player can nudge wage in 5% steps within this band. */
export const WAGE_STEP = 0.05;
export const WAGE_MIN_RATIO = WAGE_RATIO_FLOOR;
export const WAGE_MAX_RATIO = WAGE_RATIO_CEILING;

/** Revenue multiplier at morale 0 and 100 respectively. */
const REVENUE_MULT_FLOOR = 0.75; // low morale cuts output 25%
const REVENUE_MULT_CEIL = 1.25; // high morale boosts output 25%

/** Incident: revenue multiplier applied on a bad-luck tick. */
export const INCIDENT_REVENUE_MULT = 0.25;
/** Base chance per tick of an incident, scaled by volatility & low morale. */
export const INCIDENT_BASE_CHANCE = 0.03;

export type BusinessTypeDef = {
  code: string;
  label: string;
  description: string;
  setupCost: number;
  baseRevenue: number;
  baseExpense: number;
  revenuePerLevel: number;
  expensePerLevel: number;
  maxLevel: number;
  /** Revenue volatility per tick (0-1). Higher = more fluctuation & incident chance. */
  volatility: number;
  /** Base salary per employee per tick at 1× wage. */
  baseSalary: number;
};

export const BUSINESS_TYPES: BusinessTypeDef[] = [
  {
    code: "STREET_FOOD",
    label: "Street Food",
    description: "Street stall. Minimal capital, modest but steady income.",
    setupCost: 8_000,
    baseRevenue: 30,
    baseExpense: 12,
    revenuePerLevel: 8,
    expensePerLevel: 4,
    maxLevel: 10,
    volatility: 0.10,
    baseSalary: 3,
  },
  {
    code: "CAFE",
    label: "Cafe",
    description: "Small specialty coffee cafe. Low capital, stable margins.",
    setupCost: 50_000,
    baseRevenue: 80,
    baseExpense: 40,
    revenuePerLevel: 25,
    expensePerLevel: 12,
    maxLevel: 10,
    volatility: 0.15,
    baseSalary: 5,
  },
  {
    code: "TECH_STARTUP",
    label: "Tech Startup",
    description: "Technology startup. High capital, exponential potential.",
    setupCost: 200_000,
    baseRevenue: 100,
    baseExpense: 70,
    revenuePerLevel: 50,
    expensePerLevel: 18,
    maxLevel: 10,
    volatility: 0.40,
    baseSalary: 12,
  },
  {
    code: "RETAIL",
    label: "Retail Store",
    description: "Physical retail store. Stable cash flow, gradual expansion.",
    setupCost: 75_000,
    baseRevenue: 90,
    baseExpense: 50,
    revenuePerLevel: 20,
    expensePerLevel: 10,
    maxLevel: 10,
    volatility: 0.15,
    baseSalary: 6,
  },
  {
    code: "MANUFACTURING",
    label: "Manufacturing",
    description: "Small-to-medium factory. High capex, large margins.",
    setupCost: 300_000,
    baseRevenue: 200,
    baseExpense: 120,
    revenuePerLevel: 40,
    expensePerLevel: 22,
    maxLevel: 10,
    volatility: 0.20,
    baseSalary: 9,
  },
  {
    code: "PROPERTY",
    label: "Property",
    description: "Commercial property rental. Passive income, slow growth.",
    setupCost: 500_000,
    baseRevenue: 150,
    baseExpense: 30,
    revenuePerLevel: 35,
    expensePerLevel: 8,
    maxLevel: 10,
    volatility: 0.08,
    baseSalary: 4,
  },
];

const BIZ_MAP = new Map(BUSINESS_TYPES.map((b) => [b.code, b]));

export function getBusinessType(code: string): BusinessTypeDef | undefined {
  return BIZ_MAP.get(code);
}

/** Compute revenue per tick for a given type and level (includes base). */
export function revenueForLevel(type: string, level: number): number {
  const t = BIZ_MAP.get(type);
  if (!t) return 0;
  return t.baseRevenue + t.revenuePerLevel * (level - 1);
}

/**
 * Effective per-employee wage. Stored value 0 = fall back to type default.
 * 0-sentinel avoids a one-time backfill migration for existing rows.
 */
export function effectiveWage(type: string, stored: number): number {
  const t = BIZ_MAP.get(type);
  const base = t?.baseSalary ?? 5;
  return stored > 0 ? stored : base;
}

/** Wage ratio clamped to the legal band — used by morale math & UI. */
export function wageRatio(type: string, stored: number): number {
  const t = BIZ_MAP.get(type);
  const base = t?.baseSalary ?? 5;
  const r = effectiveWage(type, stored) / base;
  return clamp(r, WAGE_MIN_RATIO, WAGE_MAX_RATIO);
}

/**
 * Morale derived from wage ratio — 0..100, monotonic.
 * stored-on-the-fly, not in DB. Wage is the single source of truth;
 * persisting morale separately would drift from wage the moment a player edits it.
 */
export function moraleFromWage(type: string, stored: number): number {
  const r = wageRatio(type, stored);
  // Linear: floor→0, neutral→70, ceiling→100. Two segments.
  if (r <= WAGE_RATIO_NEUTRAL) {
    return Math.round((r - WAGE_RATIO_FLOOR) / (WAGE_RATIO_NEUTRAL - WAGE_RATIO_FLOOR) * 70);
  }
  return Math.round(70 + (r - WAGE_RATIO_NEUTRAL) / (WAGE_RATIO_CEILING - WAGE_RATIO_NEUTRAL) * 30);
}

/** Revenue multiplier derived from morale (0..1 → 0.75..1.25). */
export function revenueMultiplierFromMorale(morale: number): number {
  return REVENUE_MULT_FLOOR + (morale / 100) * (REVENUE_MULT_CEIL - REVENUE_MULT_FLOOR);
}

/**
 * Per-tick chance of an incident (supply break, walkout, equipment failure).
 * Scales with volatility and inversely with morale: a 0-morale shop is ~2.7× riskier.
 */
export function incidentChance(type: string, stored: number): number {
  const t = BIZ_MAP.get(type);
  const vol = t?.volatility ?? 0.2;
  const morale = moraleFromWage(type, stored);
  const moraleRisk = 1 + (100 - morale) / 60; // morale 0 → 2.67×, 100 → 1×
  // incident frequency is volatile per type; tune INCIDENT_BASE_CHANCE to retune globally
  return clamp(INCIDENT_BASE_CHANCE * vol * 4 * moraleRisk, 0, 0.5);
}

type ExpenseInputs = { type: string; level: number; employees: number; wage?: number };

/** Expense = base + per-level scaling + payroll (employees × effective wage). */
export function expenseForLevel({ type, level, employees, wage = 0 }: ExpenseInputs): number {
  const t = BIZ_MAP.get(type);
  if (!t) return 0;
  return t.baseExpense + t.expensePerLevel * (level - 1) + employees * effectiveWage(type, wage);
}

/** Total payroll cost per tick for a business. */
export function payrollCost(type: string, employees: number, wage: number): number {
  return employees * effectiveWage(type, wage);
}

export function upgradeCost(type: string, fromLevel: number): number {
  const t = BIZ_MAP.get(type);
  if (!t) return Infinity;
  return Math.round(t.setupCost * 0.4 * fromLevel);
}

export function setupCost(type: string): number {
  return BIZ_MAP.get(type)?.setupCost ?? Infinity;
}

/** Staffing adequacy vs level capacity — informational nudge. */
export function staffingLevel(level: number, employees: number): "understaffed" | "optimal" | "overstaffed" {
  const target = level + 1; // heuristic — 1 employee per level + 1 baseline
  if (employees < target) return "understaffed";
  if (employees > target * 2) return "overstaffed";
  return "optimal";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Self-check moved out — config is imported by client bundles where `require`
// and `module` don't exist. Verified manually during authoring; math is linear.
