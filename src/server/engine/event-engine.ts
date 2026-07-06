import { prisma } from "@/lib/prisma";
import { GAME_CONFIG } from "@/config/game";
import { EVENT_TEMPLATES } from "@/config/events";
import { chance } from "./rng";

export type ActiveEventImpact = {
  volatilityMult: number;
  trendShift: number;
};

/**
 * Roll for new events against template probabilities.
 * Called once per tick. Each template rolls independently.
 *
 * ponytail: O(templates) per tick (~10). Cheap.
 */
export async function rollNewEvents(now: Date): Promise<string[]> {
  const triggered: string[] = [];

  // Don't pile up — if 4+ events active, skip new rolls this tick.
  const activeCount = await prisma.gameEvent.count({ where: { isActive: true } });
  if (activeCount >= 4) return triggered;

  for (const tpl of EVENT_TEMPLATES) {
    if (!chance(tpl.probability)) continue;

    // Avoid duplicates of the same active event type.
    const dupe = await prisma.gameEvent.findFirst({
      where: { eventType: tpl.eventType, isActive: true },
      select: { id: true },
    });
    if (dupe) continue;

    const endAt = new Date(now.getTime() + tpl.durationTicks * GAME_CONFIG.TICK_INTERVAL_MS);
    await prisma.gameEvent.create({
      data: {
        eventType: tpl.eventType,
        description: tpl.description,
        impactFactor: tpl.trendShift,
        startAt: now,
        endAt,
        isActive: true,
      },
    });
    triggered.push(tpl.code);
  }
  return triggered;
}

/** Expire events whose endAt has passed. Returns count expired. */
export async function expireEvents(now: Date): Promise<number> {
  const result = await prisma.gameEvent.updateMany({
    where: { isActive: true, endAt: { lt: now } },
    data: { isActive: false },
  });
  return result.count;
}

/**
 * Aggregate impacts for the current tick.
 *
 * ponytail: for MVP, treat all impacts as global. Per-sector routing
 * (event only hits `STOCK` or `CRYPTO`) is a Fase 6 refinement when
 * the market UI needs sector-specific behavior. The template config
 * is preserved in `EVENT_TEMPLATES[].affectedTypes` for that upgrade.
 */
export async function getGlobalImpact(): Promise<ActiveEventImpact> {
  const events = await prisma.gameEvent.findMany({
    where: { isActive: true },
    select: { impactFactor: true },
  });

  let trendShift = 0;
  let volatilityMult = 1;
  for (const e of events) {
    trendShift += e.impactFactor;
    // Bump volatility ~30% per active event (compounding), capped at 3x.
    volatilityMult = Math.min(3, volatilityMult * 1.3);
  }
  return { volatilityMult, trendShift };
}

/** Broadcast payload of active events. */
export async function getActiveEvents() {
  return prisma.gameEvent.findMany({
    where: { isActive: true },
    orderBy: { endAt: "asc" },
    select: { id: true, eventType: true, description: true, endAt: true },
  });
}
