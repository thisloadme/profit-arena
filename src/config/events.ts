/**
 * Random event templates. The engine rolls against `probability` each evaluation
 * tick and applies `impactBySector` as a temporary multiplier to volatility &
 * trend for affected asset types for the duration.
 */
export type GameEventTemplate = {
  code: string;
  eventType: string;
  description: string;
  /** Per-evaluation probability (0-1). */
  probability: number;
  /** Duration in ticks. */
  durationTicks: number;
  /** Impact on affected sectors: { volatilityMult, trendShift }. */
  volatilityMult: number;
  trendShift: number;
  /** Asset types affected. Empty = global. */
  affectedTypes: string[];
};

export const EVENT_TEMPLATES: GameEventTemplate[] = [
  {
    code: "RECESSION",
    eventType: "macro",
    description: "Global recession hits the market. Asset prices under pressure.",
    probability: 0.04,
    durationTicks: 50,
    volatilityMult: 1.6,
    trendShift: -0.0008,
    affectedTypes: ["STOCK", "MUTUAL_FUND", "PROPERTY"],
  },
  {
    code: "BOOM",
    eventType: "macro",
    description: "Economic boom! Optimism drives prices up.",
    probability: 0.05,
    durationTicks: 40,
    volatilityMult: 0.9,
    trendShift: 0.0009,
    affectedTypes: ["STOCK", "MUTUAL_FUND"],
  },
  {
    code: "INFLATION",
    eventType: "macro",
    description: "High inflation — bonds pressured, commodities rally.",
    probability: 0.06,
    durationTicks: 30,
    volatilityMult: 1.3,
    trendShift: -0.0002,
    affectedTypes: ["BOND"],
  },
  {
    code: "CRYPTO_CRASH",
    eventType: "sector",
    description: "Crypto bubble bursts. BTC and altcoins plummet.",
    probability: 0.03,
    durationTicks: 15,
    volatilityMult: 2.2,
    trendShift: -0.0015,
    affectedTypes: ["CRYPTO"],
  },
  {
    code: "CRYPTO_BULL",
    eventType: "sector",
    description: "Institutional adoption surge, crypto bullish.",
    probability: 0.04,
    durationTicks: 25,
    volatilityMult: 1.4,
    trendShift: 0.0016,
    affectedTypes: ["CRYPTO"],
  },
  {
    code: "TECH_EARNINGS_BEAT",
    eventType: "sector",
    description: "Tech giant earnings beat expectations.",
    probability: 0.05,
    durationTicks: 10,
    volatilityMult: 1.1,
    trendShift: 0.0008,
    affectedTypes: ["STOCK"],
  },
  {
    code: "RATE_HIKE",
    eventType: "macro",
    description: "Central bank raises interest rates. Bonds & stocks pressured.",
    probability: 0.04,
    durationTicks: 35,
    volatilityMult: 1.2,
    trendShift: -0.0006,
    affectedTypes: ["BOND", "STOCK"],
  },
  {
    code: "GEOPOLITICAL",
    eventType: "macro",
    description: "Geopolitical tensions heighten global volatility.",
    probability: 0.03,
    durationTicks: 20,
    volatilityMult: 1.5,
    trendShift: -0.0003,
    affectedTypes: [],
  },
  {
    code: "PANIC_SELL",
    eventType: "sentiment",
    description: "Market panic triggers mass sell-off.",
    probability: 0.02,
    durationTicks: 8,
    volatilityMult: 2.5,
    trendShift: -0.0012,
    affectedTypes: [],
  },
  {
    code: "EUPHORIA",
    eventType: "sentiment",
    description: "Investor euphoria drives broad rally.",
    probability: 0.02,
    durationTicks: 8,
    volatilityMult: 1.8,
    trendShift: 0.0013,
    affectedTypes: [],
  },
];
