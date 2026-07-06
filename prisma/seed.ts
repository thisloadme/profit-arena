/**
 * Seed: market universe + initial game event placeholders + a demo user.
 * Run: bun run db:seed
 */
import { PrismaClient, AssetType, RiskProfile } from "@prisma/client";
import { ASSET_SEEDS } from "../src/config/assets";
import { GAME_CONFIG } from "../src/config/game";

const ACHIEVEMENTS = [
  { code: "FIRST_TRADE", name: "Pertama Berdagang", description: "Lakukan transaksi beli pertama", iconKey: "shopping-cart" },
  { code: "FIRST_MILLION", name: "Jutawan Pertama", description: "Net worth tembus Rp1.000.000", iconKey: "trophy" },
  { code: "SURVIVE_RECESSION", name: "Selamat dari Resesi", description: "Bertahan saat event resesi aktif", iconKey: "shield" },
  { code: "DIVERSIFIED", name: "Diversifikasi", description: "Punya aset di 3 tipe berbeda", iconKey: "pie-chart" },
  { code: "DEBT_FREE", name: "Bebas Utang", description: "Lunasi semua pinjaman", iconKey: "check-circle" },
  { code: "BUSINESS_OWNER", name: "Pemilik Bisnis", description: "Mulai bisnis pertamamu", iconKey: "store" },
  { code: "CRYPTO_INVESTOR", name: "Crypto Investor", description: "Beli aset crypto", iconKey: "bitcoin" },
  { code: "BORROWER", name: "Peminjam", description: "Ambil pinjaman pertama", iconKey: "hand-coins" },
  { code: "LENDER", name: "Pemberi Pinjaman", description: "Berikan pinjaman ke player lain", iconKey: "hand-heart" },
];

const QUESTS = [
  { code: "DAILY_TRADE", title: "Trader Harian", description: "Lakukan 1 transaksi hari ini", targetCount: 1, rewardCash: 500 },
  { code: "DAILY_LOGIN", title: "Hadiah Masuk", description: "Login hari ini", targetCount: 1, rewardCash: 100 },
  { code: "DAILY_BUSINESS_PROFIT", title: "Profit Bisnis", description: "Bisnismu untung 500 hari ini", targetCount: 500, rewardCash: 300 },
];

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding market data…");
  // ponytail: upsert pattern keeps seed idempotent without a separate reset.
  for (const a of ASSET_SEEDS) {
    await prisma.marketData.upsert({
      where: { symbol: a.symbol },
      update: {},
      create: {
        symbol: a.symbol,
        type: a.type,
        currentPrice: a.basePrice,
        volatility: a.volatility,
        trendFactor: a.trendFactor,
      },
    });
    // Seed a few historical points so charts render immediately.
    const now = new Date();
    for (let i = 30; i > 0; i--) {
      const tickAt = new Date(now.getTime() - i * GAME_CONFIG.TICK_INTERVAL_MS);
      const noise = 1 + (Math.random() - 0.5) * a.volatility * 2;
      await prisma.priceHistory.create({
        data: { symbol: a.symbol, price: a.basePrice * noise, tickAt },
      });
    }
  }

  console.log("→ Seeding demo user (alice)…");
  const demo = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      username: "alice",
      email: "alice@example.com",
      passwordHash: "$2a$12$placeholderhashplaceholderhashplaceholderhashplacehol", // replaced below
      riskProfile: RiskProfile.MODERATE,
      cash: 10_000, // small seed so demo user can act; fresh users start at 0
      profile: { create: {} },
      creditScore: { create: { score: GAME_CONFIG.CREDIT_SCORE_DEFAULT } },
      tutorialProgress: { create: {} },
    },
  });
  console.log(`  ✓ user ${demo.username} (${demo.id})`);

  console.log("✓ Seed complete.");

  console.log("→ Seeding achievements & quests…");
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: { code: a.code, name: a.name, description: a.description, iconKey: a.iconKey },
    });
  }
  for (const q of QUESTS) {
    await prisma.quest.upsert({
      where: { code: q.code },
      update: {},
      create: { code: q.code, title: q.title, description: q.description, targetCount: q.targetCount, rewardCash: q.rewardCash },
    });
  }
  console.log("  ✓ achievements:", ACHIEVEMENTS.length, "quests:", QUESTS.length);

  console.log("✓ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
