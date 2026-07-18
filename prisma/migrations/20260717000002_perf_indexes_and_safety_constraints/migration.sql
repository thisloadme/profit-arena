-- =====================================================================
-- M9 — DB indexes for hot query paths
-- =====================================================================
-- User.netWorth: leaderboard sort + per-tick recompute
CREATE INDEX IF NOT EXISTS "users_netWorth_idx" ON "users" ("netWorth");

-- Transaction(userId, createdAt): /api/transactions orderBy createdAt DESC
CREATE INDEX IF NOT EXISTS "transactions_userId_createdAt_idx"
  ON "transactions" ("userId", "createdAt" DESC);

-- Notification(userId, isRead, createdAt): bell badge + list query
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx"
  ON "notifications" ("userId", "isRead", "createdAt" DESC);

-- Loan(lenderId), (borrowerId): P2P marketplace / my-loans queries
CREATE INDEX IF NOT EXISTS "loans_lenderId_idx" ON "loans" ("lenderId");
CREATE INDEX IF NOT EXISTS "loans_borrowerId_idx" ON "loans" ("borrowerId");
CREATE INDEX IF NOT EXISTS "loans_status_dueDate_idx"
  ON "loans" ("status", "dueDate")
  WHERE "status" = 'ACTIVE';

-- Business(ownerId, isActive): /api/business list
CREATE INDEX IF NOT EXISTS "businesses_ownerId_isActive_idx"
  ON "businesses" ("ownerId", "isActive");

-- =====================================================================
-- M4 — Defense-in-depth: users.cash >= -100000 (tolerant of legacy debt)
-- =====================================================================
-- App-level guards (updateMany WHERE cash >= X) are the primary defense;
-- this CHECK catches anything that slips past (bugs, manual edits, etc.).
--
-- Why -100000 and not 0: two pre-C-tier users (`alice`, `dionbudi`) ended
-- up with negative cash from a TOCTOU race that existed before the
-- session fix (race between concurrent buy/sell & financial-tick debits).
-- The full audit fix (CRITICAL 2) now closes that race, so newly written
-- cash will never go below 0. The CHECK allows up to -100k so existing
-- legacy rows can satisfy the constraint, and any future regression that
-- drains cash below -100k trips the constraint (a much louder failure
-- than silent negative balance).
--
-- Operationally, the next financial tick will re-clamp cash by recomputing
-- netWorth from current assets/debt. If cash is still pinned below 0 by
-- future code, the constraint fires — surfaced as a transaction error,
-- not as silent corruption.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_cash_floor'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_cash_floor" CHECK ("cash" >= -100000);
  END IF;
END $$;

-- NOTE: tokenVersion migration is in a separate file
-- (20260717000000_add_user_token_version/migration.sql).
-- The Float→Decimal conversion (M1) is intentionally deferred — see audit
-- report. Requires app-wide .toNumber() conversions before it can land.
