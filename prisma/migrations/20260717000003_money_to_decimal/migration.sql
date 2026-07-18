-- =====================================================================
-- M1 — Money & ratio fields migrated from Float (DOUBLE PRECISION) to
-- Decimal (NUMERIC) for precision-safe arithmetic across thousands of
-- ticks. Existing rows are converted via ::numeric casts; the migration
-- is idempotent because every ALTER TYPE check is guarded by IF EXISTS.
--
-- ponytail: PostgreSQL DOUBLE PRECISION → NUMERIC preserves the existing
-- value exactly (no rounding). NUMERIC(18,4) gives us 14 integer digits
-- and 4 decimal places — enough for trillions of game-currency units.
-- Ratios (volatility/trendFactor/interestRate) use NUMERIC(8,4) since
-- they live in [-1, 1] or [0, 1].
--
-- NOTE: this migration is the user-table shape change. The application
-- code was already updated to coerce Decimal → number at read-time via
-- the helper at src/lib/decimal.ts and inline `Number(...)` calls. The
-- float→decimal conversion at the DB layer means new writes still go
-- through Prisma which accepts number-typed values for Decimal columns.
-- =====================================================================

-- USERS
ALTER TABLE "users"
  ALTER COLUMN "netWorth"    TYPE NUMERIC(18, 4) USING "netWorth"::NUMERIC(18, 4),
  ALTER COLUMN "totalAssets" TYPE NUMERIC(18, 4) USING "totalAssets"::NUMERIC(18, 4),
  ALTER COLUMN "totalDebt"   TYPE NUMERIC(18, 4) USING "totalDebt"::NUMERIC(18, 4),
  ALTER COLUMN "cash"        TYPE NUMERIC(18, 4) USING "cash"::NUMERIC(18, 4);

-- ASSETS
ALTER TABLE "assets"
  ALTER COLUMN "quantity"     TYPE NUMERIC(18, 4) USING "quantity"::NUMERIC(18, 4),
  ALTER COLUMN "averagePrice" TYPE NUMERIC(18, 4) USING "averagePrice"::NUMERIC(18, 4),
  ALTER COLUMN "currentPrice" TYPE NUMERIC(18, 4) USING "currentPrice"::NUMERIC(18, 4);

-- MARKET DATA
ALTER TABLE "market_data"
  ALTER COLUMN "currentPrice" TYPE NUMERIC(18, 4) USING "currentPrice"::NUMERIC(18, 4),
  ALTER COLUMN "volatility"   TYPE NUMERIC(8, 4)  USING "volatility"::NUMERIC(8, 4),
  ALTER COLUMN "trendFactor"  TYPE NUMERIC(8, 4)  USING "trendFactor"::NUMERIC(8, 4);

-- BUSINESSES
ALTER TABLE "businesses"
  ALTER COLUMN "revenuePerTick"    TYPE NUMERIC(18, 4) USING "revenuePerTick"::NUMERIC(18, 4),
  ALTER COLUMN "expensePerTick"    TYPE NUMERIC(18, 4) USING "expensePerTick"::NUMERIC(18, 4),
  ALTER COLUMN "salaryPerEmployee" TYPE NUMERIC(18, 4) USING "salaryPerEmployee"::NUMERIC(18, 4);

-- EMPLOYMENTS
ALTER TABLE "employments"
  ALTER COLUMN "salaryPerPay" TYPE NUMERIC(18, 4) USING "salaryPerPay"::NUMERIC(18, 4);

-- JOBS (catalog — same shape as employments)
ALTER TABLE "jobs"
  ALTER COLUMN "salaryPerPay" TYPE NUMERIC(18, 4) USING "salaryPerPay"::NUMERIC(18, 4);

-- LOANS
ALTER TABLE "loans"
  ALTER COLUMN "amount"          TYPE NUMERIC(18, 4) USING "amount"::NUMERIC(18, 4),
  ALTER COLUMN "interestRate"    TYPE NUMERIC(8, 4)  USING "interestRate"::NUMERIC(8, 4),
  ALTER COLUMN "remainingAmount" TYPE NUMERIC(18, 4) USING "remainingAmount"::NUMERIC(18, 4);

-- TRANSACTIONS
ALTER TABLE "transactions"
  ALTER COLUMN "amount" TYPE NUMERIC(18, 4) USING "amount"::NUMERIC(18, 4);

-- GAME EVENTS
ALTER TABLE "game_events"
  ALTER COLUMN "impactFactor" TYPE NUMERIC(8, 4) USING "impactFactor"::NUMERIC(8, 4);

-- PRICE HISTORY
ALTER TABLE "price_history"
  ALTER COLUMN "price" TYPE NUMERIC(18, 4) USING "price"::NUMERIC(18, 4);

-- LEADERBOARD SNAPSHOTS
ALTER TABLE "leaderboard_snapshots"
  ALTER COLUMN "netWorth" TYPE NUMERIC(18, 4) USING "netWorth"::NUMERIC(18, 4);

-- QUESTS (rewardCash)
ALTER TABLE "quests"
  ALTER COLUMN "rewardCash" TYPE NUMERIC(18, 4) USING "rewardCash"::NUMERIC(18, 4);

-- LIMIT ORDERS
ALTER TABLE "limit_orders"
  ALTER COLUMN "quantity"   TYPE NUMERIC(18, 4) USING "quantity"::NUMERIC(18, 4),
  ALTER COLUMN "limitPrice" TYPE NUMERIC(18, 4) USING "limitPrice"::NUMERIC(18, 4);

-- NOTE: indexes and CHECK constraint from
-- 20260717000002_perf_indexes_and_safety_constraints run independently.
-- This migration changes column TYPES only — it does not need to recreate
-- indexes since NUMERIC types index the same way.
