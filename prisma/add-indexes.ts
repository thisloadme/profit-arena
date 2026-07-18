// Run: bunx tsx prisma/migration-helpers/add-indexes.ts
// one-shot script to add performance indexes on hot columns.
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const INDEXES = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_userId_symbol ON assets ("userId", symbol)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_userId_createdAt ON transactions ("userId", "createdAt" DESC)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_symbol ON market_data (symbol)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_userId_read ON notifications ("userId", "isRead")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_borrowerId_status ON loans ("borrowerId", status)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_symbol_tickAt ON price_history (symbol, "tickAt")`,
];

async function main() {
  for (const sql of INDEXES) {
    console.log("→", sql.slice(0, 60) + "...");
    await p.$executeRawUnsafe(sql);
  }
  console.log("✓ indexes created");
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
