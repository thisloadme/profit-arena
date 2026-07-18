-- =====================================================================
-- Liquidation hook — one-shot trigger when a user stays at netWorth <= 0
-- for LIQUIDATION_GRACE_DAYS (7) consecutive game-days. Adds two columns:
--   isLiquidated: boolean — set true after fire; prevents re-trigger
--   liquidateAt:  timestamptz — game-time (real UTC clock) when fired
--
-- Default false / null so existing users (including alice/dionbudi at
-- negative net worth) need to cross the grace window before this fires.
-- Grace starts tracking from this migration's apply time, not from when
-- the user first hit NW <= 0, so legacy negative-cash users get a clean
-- grace window to recover before the hook triggers.
--
-- Manual run: `bun run db:deploy` after merging. NOT auto-applied.
-- =====================================================================

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isLiquidated"            BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "liquidateAt"             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "liquidateGraceStartedAt" TIMESTAMPTZ;
