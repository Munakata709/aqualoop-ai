/**
 * Deterministic seeded pseudo-random generator (mulberry32).
 *
 * Given the same seed, calling `next()` repeatedly always produces the same
 * sequence — this is what makes "identical scenario seeds produce identical
 * results" possible (see tests/simulation/determinism.test.ts). Do not use
 * Math.random() anywhere in the simulation engine or optimizer.
 */

export interface SeededRng {
  next(): number; // [0, 1)
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min: number, max: number): number {
    return min + next() * (max - min);
  }

  function pick<T>(items: readonly T[]): T {
    return items[Math.floor(next() * items.length)];
  }

  return { next, range, pick };
}
