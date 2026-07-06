/**
 * Business type definitions — single source of truth for costs & scaling.
 */
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
  /** Revenue volatility per tick (0-1). Higher = more fluctuation. */
  volatility: number;
};

export const BUSINESS_TYPES: BusinessTypeDef[] = [
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

export function expenseForLevel(type: string, level: number, employees: number): number {
  const t = BIZ_MAP.get(type);
  if (!t) return 0;
  return t.baseExpense + t.expensePerLevel * (level - 1) + employees * 5;
}

export function upgradeCost(type: string, fromLevel: number): number {
  const t = BIZ_MAP.get(type);
  if (!t) return Infinity;
  return Math.round(t.setupCost * 0.4 * fromLevel);
}

export function setupCost(type: string): number {
  return BIZ_MAP.get(type)?.setupCost ?? Infinity;
}
