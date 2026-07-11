import { AssetType } from "@prisma/client";

export type AssetSeed = {
  symbol: string;
  name: string;
  type: AssetType;
  basePrice: number;
  volatility: number; // 0.0 - 1.0
  trendFactor: number; // -1.0 to 1.0 macro bias
};

/**
 * Initial market universe. Volatility & trend are starting values —
 * the simulation engine mutates them at runtime via events.
 */
export const ASSET_SEEDS: AssetSeed[] = [
  // Stocks — moderate vol, slight positive trend
  { symbol: "APPL", name: "Apel Corp",      type: AssetType.STOCK, basePrice: 185,  volatility: 0.015, trendFactor: 0.0004 },
  { symbol: "TSLR", name: "Teslo Inc",      type: AssetType.STOCK, basePrice: 240,  volatility: 0.03,  trendFactor: 0.0006 },
  { symbol: "NVDA", name: "NVIDA",          type: AssetType.STOCK, basePrice: 880,  volatility: 0.025, trendFactor: 0.0008 },
  { symbol: "GOGL", name: "Goggle",         type: AssetType.STOCK, basePrice: 165,  volatility: 0.012, trendFactor: 0.0003 },
  { symbol: "MSFT", name: "Megasoft",       type: AssetType.STOCK, basePrice: 420,  volatility: 0.013, trendFactor: 0.0004 },

  // Crypto — high vol
  { symbol: "BTC",  name: "Bitcoin",        type: AssetType.CRYPTO, basePrice: 64_000, volatility: 0.04, trendFactor: 0.0007 },
  { symbol: "ETH",  name: "Ethereum",       type: AssetType.CRYPTO, basePrice: 3_400,  volatility: 0.045, trendFactor: 0.0006 },
  { symbol: "SOL",  name: "Solana",         type: AssetType.CRYPTO, basePrice: 145,    volatility: 0.06,  trendFactor: 0.0008 },
  { symbol: "XRP",  name: "Ripple",         type: AssetType.CRYPTO, basePrice: 1.50,  volatility: 0.05,  trendFactor: 0.0003 },
  { symbol: "DOGE", name: "Dogecoin",       type: AssetType.CRYPTO, basePrice: 2.00,  volatility: 0.08,  trendFactor: 0.0001 },

  // Bonds — low vol, capital preservation
  { symbol: "GB10Y", name: "Govt Bond 10Y",  type: AssetType.BOND, basePrice: 1_000, volatility: 0.003, trendFactor: 0.00005 },
  { symbol: "CB05Y", name: "Corp Bond 5Y",   type: AssetType.BOND, basePrice: 1_000, volatility: 0.005, trendFactor: 0.0001 },
  { symbol: "MB03Y", name: "Muni Bond 3Y",   type: AssetType.BOND, basePrice: 500,   volatility: 0.004, trendFactor: 0.00008 },
  { symbol: "IB07Y", name: "Infl-Linked 7Y", type: AssetType.BOND, basePrice: 1_000, volatility: 0.0035, trendFactor: 0.0001 },

  // Mutual funds — medium vol, diversified
  { symbol: "SPX",  name: "S&P 500 Index Fund", type: AssetType.MUTUAL_FUND, basePrice: 5_200, volatility: 0.008, trendFactor: 0.0003 },
  { symbol: "TECH", name: "Tech Sector Fund",   type: AssetType.MUTUAL_FUND, basePrice: 980,  volatility: 0.018, trendFactor: 0.0005 },
  { symbol: "DIV",  name: "Dividend Income Fund", type: AssetType.MUTUAL_FUND, basePrice: 75, volatility: 0.006, trendFactor: 0.0002 },
];
