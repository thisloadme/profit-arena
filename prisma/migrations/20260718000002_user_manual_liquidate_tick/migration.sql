-- =====================================================================
-- Manual liquidation cooldown field (game-time, not real-time).
-- lastManualLiquidateAtTick stores SimulationState.tickNumber of the last
-- manual liquidation. The settings-page endpoint enforces a
-- TICKS_PER_GAME_MONTH (43200) gap between successive calls.
--
-- Why Int and not DateTime: game-time is monotonic and immune to wall-clock
-- changes (DST, server pause, NTP drift). Comparison stays simple.
--
-- Manual run: `bun run db:deploy` after merging. NOT auto-applied.
-- =====================================================================

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "lastManualLiquidateAtTick" INTEGER;
