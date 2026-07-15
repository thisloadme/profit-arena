/**
 * Jobs module constants and helpers.
 * Single source of truth for job-related game logic. No magic numbers.
 */
import { GAME_CONFIG } from "./game";

/** 1 game-hour = 60 game-minutes = 60 ticks. */
export const TICKS_PER_GAME_HOUR = 60;

/** 1 game-week = 7 game-days. */
export const TICKS_PER_GAME_WEEK = GAME_CONFIG.TICKS_PER_GAME_DAY * 7; // 10080

/** 1 game-month = 30 game-days. */
export const TICKS_PER_GAME_MONTH = GAME_CONFIG.TICKS_PER_GAME_DAY * 30; // 43200

/** Notice period when resigning: 1 game-day. */
export const JOB_NOTICE_PERIOD_TICKS = GAME_CONFIG.TICKS_PER_GAME_DAY; // 1440

/** Minimum gap (hours) between two jobs' work windows. */
export const JOB_MIN_WORK_HOUR_GAP = 1;

/** Map pay period → tick interval. */
export function payPeriodTicks(period: "WEEKLY" | "MONTHLY"): number {
  return period === "MONTHLY" ? TICKS_PER_GAME_MONTH : TICKS_PER_GAME_WEEK;
}

/** Map pay period → human-readable game-time label. */
export function payPeriodLabel(period: "WEEKLY" | "MONTHLY"): string {
  return period === "MONTHLY" ? "month" : "week";
}

/** Resolve game-hour (0..23) from absolute game tick number. */
export function gameHourOfTick(tick: number): number {
  return Math.floor((tick / TICKS_PER_GAME_HOUR) % 24);
}

/** Format tick → "Day N" relative to game start. */
export function gameDayOfTick(tick: number): number {
  return Math.floor(tick / GAME_CONFIG.TICKS_PER_GAME_DAY) + 1;
}

/**
 * Detect overlap between two [startHour, endHour) work windows (24h clock).
 * Both are 0..23 inclusive start, end is exclusive. Returns true if the two
 * windows share any hour.
 */
export function workHoursOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  const aStart = ((a.start % 24) + 24) % 24;
  const aEnd = ((a.end % 24) + 24) % 24;
  const bStart = ((b.start % 24) + 24) % 24;
  const bEnd = ((b.end % 24) + 24) % 24;

  // Normalize to half-open intervals over 0..24 axis. If end <= start → wrap midnight.
  const aSpans = expandSpan(aStart, aEnd);
  const bSpans = expandSpan(bStart, bEnd);
  for (const A of aSpans) {
    for (const B of bSpans) {
      if (A.start < B.end && B.start < A.end) return true;
    }
  }
  return false;
}

/** Expand [start,end) into 1 or 2 linear spans, no modulo. */
function expandSpan(start: number, end: number): { start: number; end: number }[] {
  if (end > start) return [{ start, end }];
  return [{ start, end: 24 }, { start: 0, end }];
}

/** Format work hours as e.g. "09:00–17:00". */
export function formatWorkHours(start: number, end: number): string {
  const fmt = (h: number) =>
    `${String(Math.floor(h) % 24).padStart(2, "0")}:00`;
  return `${fmt(start)}–${fmt(end)}`;
}

/** Job tier labels. */
export const JOB_TIER_LABELS = {
  ENTRY: "Entry",
  MID: "Mid",
  SENIOR: "Senior",
} as const;

export type JobTier = keyof typeof JOB_TIER_LABELS;
