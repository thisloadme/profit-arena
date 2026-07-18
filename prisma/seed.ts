/**
 * Seed: market universe + initial game event placeholders + a demo user.
 * Run: bun run db:seed
 */
import { PrismaClient, AssetType, FinancialStatus } from "@prisma/client";
import { ASSET_SEEDS } from "../src/config/assets";
import { GAME_CONFIG } from "../src/config/game";
import { hashPassword } from "../src/lib/auth";

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

// Job catalog (NPC companies). Multiplayer-safe: static, all players see same.
// Salary numbers are calibrated to give a comparable boost to STRUGGLING tier:
// a single ENTRY weekly job ≈ $400/week. Seniors scale up accordingly.
const JOB_CATALOG = [
  { code: "BARISTA_WK",    title: "Barista",            company: "Daily Grind Co.",   tier: "ENTRY",  salaryPerPay: 320,  payPeriod: "WEEKLY"  as const, workStartHour: 7,  workEndHour: 14, description: "Pour espresso, smile at customers, clean the grinder. Early mornings, free coffee.", badgeColor: "warning" },
  { code: "FREELANCE_WK",  title: "Freelance Writer",   company: "QuickCopy Studio",  tier: "ENTRY",  salaryPerPay: 480,  payPeriod: "WEEKLY"  as const, workStartHour: 10, workEndHour: 16, description: "Write blog posts and ad copy on flexible hours. Work from anywhere.",          badgeColor: "info" },
  { code: "RETAIL_WK",    title: "Retail Associate",   company: "Sunset Mall",       tier: "ENTRY",  salaryPerPay: 360,  payPeriod: "WEEKLY"  as const, workStartHour: 14, workEndHour: 22, description: "Help customers, restock shelves, operate register. Evening shift.",           badgeColor: "primary" },
  { code: "DRIVER_WK",    title: "Delivery Driver",    company: "SpeedyBox",         tier: "ENTRY",  salaryPerPay: 540,  payPeriod: "WEEKLY"  as const, workStartHour: 9,  workEndHour: 18, description: "Drop packages across the city. Mileage reimbursed, tips not included.",        badgeColor: "warning" },
  { code: "NURSE_WK",     title: "Nurse",              company: "City Hospital",     tier: "MID",    salaryPerPay: 1200, payPeriod: "WEEKLY"  as const, workStartHour: 6,  workEndHour: 14, description: "Care for patients on the morning shift. Stable hours, meaningful work.",      badgeColor: "info" },
  { code: "DEV_MO",      title: "Software Engineer",  company: "TechNova Labs",     tier: "MID",    salaryPerPay: 4200, payPeriod: "MONTHLY" as const, workStartHour: 9,  workEndHour: 18, description: "Build features, review PRs, debate tabs vs spaces. Hybrid, full benefits.",     badgeColor: "primary" },
  { code: "ACCT_MO",     title: "Accountant",         company: "Ledger & Co.",      tier: "MID",    salaryPerPay: 3800, payPeriod: "MONTHLY" as const, workStartHour: 8,  workEndHour: 17, description: "Reconcile books, prep tax filings, advise clients. Numbers don't lie.",        badgeColor: "info" },
  { code: "PM_MO",       title: "Project Manager",    company: "BuildRight",        tier: "SENIOR", salaryPerPay: 6800, payPeriod: "MONTHLY" as const, workStartHour: 8,  workEndHour: 19, description: "Run sprints, unblock teams, ship on time. Stock options included.",            badgeColor: "primary" },
  { code: "LAWYER_MO",   title: "Corporate Lawyer",   company: "Hart & Partners",   tier: "SENIOR", salaryPerPay: 9500, payPeriod: "MONTHLY" as const, workStartHour: 9,  workEndHour: 19, description: "Negotiate deals, draft contracts, bill by the hour. Prestige, long hours.",     badgeColor: "loss" },
  { code: "NIGHT_MO",    title: "Security Analyst",   company: "NightOwl SOC",      tier: "MID",    salaryPerPay: 4400, payPeriod: "MONTHLY" as const, workStartHour: 22, workEndHour: 6,  description: "Watch dashboards, respond to incidents. Graveyard shift, plus premium pay.",   badgeColor: "info" },
];

const prisma = new PrismaClient();

async function main() {
	console.log("→ Seeding market data…");
	// delete orphans not in current config so stock count matches config.
	const activeSymbols = ASSET_SEEDS.map((a) => a.symbol);
	await prisma.marketData.deleteMany({ where: { symbol: { notIn: activeSymbols } } });

	// upsert pattern keeps seed idempotent without a separate reset.
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
  const demoPasswordHash = await hashPassword("demo123");
  const demo = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      username: "alice",
      email: "alice@example.com",
      passwordHash: demoPasswordHash,
      financialStatus: FinancialStatus.STABLE,
      cash: 10_000, // small seed so demo user can act; fresh users start at STARTING_CASH
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

  console.log("→ Seeding job catalog…");
  for (const j of JOB_CATALOG) {
    await prisma.job.upsert({
      where: { code: j.code },
      update: {},
      create: j,
    });
  }
  console.log("  ✓ jobs:", JOB_CATALOG.length);

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
