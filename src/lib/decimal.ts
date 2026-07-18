/**
 * Prisma Decimal → number coercion helpers.
 *
 * ponytail: the DB stores money as Decimal (precision-safe), but the app
 * arithmetic is number-typed. Convert at the boundary instead of changing
 * every arithmetic site to use Prisma.Decimal math.
 */

import { Prisma } from "@prisma/client";

/** Coerce a single Decimal | null | undefined to number | null. */
export function toNum(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return value.toNumber();
}

/** Coerce a list of records that have Decimal fields to number. */
export function decimalFieldsToNumber<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const out = { ...obj };
  for (const f of fields) {
    const v = out[f];
    if (v === null || v === undefined) continue;
    if (v instanceof Prisma.Decimal) {
      (out as Record<string, unknown>)[f as string] = v.toNumber();
    }
  }
  return out;
}
