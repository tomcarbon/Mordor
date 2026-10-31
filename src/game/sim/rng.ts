// Seeded PRNG (mulberry32). The whole state is one uint32, so it serialises with the World.

export interface Rng {
  state: number;
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

/** Uniform in [0, 1). */
export function random(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [low, high], both inclusive. */
export function randomInt(rng: Rng, low: number, high: number): number {
  return low + Math.floor(random(rng) * (high - low + 1));
}

export function randomRange(rng: Rng, low: number, high: number): number {
  return low + random(rng) * (high - low);
}

/** Derives an independent seed, so one stage's generation cannot disturb another's. */
export function mixSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
