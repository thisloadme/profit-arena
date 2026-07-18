import crypto from "node:crypto";

/**
 * Crypto-secure Gaussian random via Box-Muller transform.
 * Returns a sample from N(0, 1).
 *
 * stdlib doesn't expose crypto-secure Gaussian; Box-Muller is the
 * textbook 10-line implementation. Ceiling: if you need millions/sec,
 * switch to a ziggurat table — but RNG isn't the bottleneck here.
 */
export function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = cryptoRandom01();
  while (v === 0) v = cryptoRandom01();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Uniform [0, 1) using crypto.randomBytes. */
export function cryptoRandom01(): number {
  // 4 bytes → uint32 → /2^32 gives [0,1)
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0);
  return num / 0x1_0000_0000;
}

/** Random integer in [min, max] inclusive. */
export function cryptoRandomInt(min: number, max: number): number {
  if (min > max) throw new Error("min > max");
  const range = max - min + 1;
  // Avoid modulo bias
  const maxUint32 = 0xffff_ffff;
  const limit = maxUint32 - (maxUint32 % range);
  let r: number;
  do {
    r = crypto.randomBytes(4).readUInt32BE(0);
  } while (r >= limit);
  return min + (r % range);
}

/** True with probability p (0..1). */
export function chance(p: number): boolean {
  return cryptoRandom01() < p;
}

/** Pick a random element from a non-empty array. */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty");
  return arr[cryptoRandomInt(0, arr.length - 1)];
}
