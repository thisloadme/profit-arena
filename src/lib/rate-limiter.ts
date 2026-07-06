import { GAME_CONFIG } from "@/config/game";
import { getTickerState } from "@/server/engine/tick-scheduler";

/**
 * Per-user trade rate limiter — max N trades per tick.
 *
 * ponytail: in-memory Map, reset every tick. At MVP scale (<1000 users,
 * <10 trades/user/tick) this uses negligible memory (~100KB). Replace
 * with Redis if multi-instance scaling is needed (Fase 13).
 */
const tradeCounts = new Map<string, { tick: number; count: number }>();

export function checkTradeLimit(userId: string): boolean {
  const state = getTickerState();
  const currentTick = state.tickNumber;

  const entry = tradeCounts.get(userId);
  if (!entry || entry.tick !== currentTick) {
    tradeCounts.set(userId, { tick: currentTick, count: 1 });
    return true;
  }

  if (entry.count >= GAME_CONFIG.MAX_TRADES_PER_TICK) return false;
  entry.count++;
  return true;
}
