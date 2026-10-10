/**
 * Unit conversion constants and helpers.
 *
 * All conversion factors are documented in ASSUMPTIONS.md. Values here are
 * standard physical/engineering constants, not tunable assumptions — tunable
 * engineering assumptions (specific energy, PV performance factor, etc.)
 * live in lib/physics instead.
 */

export const LITERS_PER_GALLON = 3.785411784;
export const LITERS_PER_CUBIC_METER = 1000;
export const KWH_THERMAL_PER_MMBTU = 293.07;

export function gallonsToLiters(gallons: number): number {
  return gallons * LITERS_PER_GALLON;
}

export function litersToGallons(liters: number): number {
  return liters / LITERS_PER_GALLON;
}

export function litersToCubicMeters(liters: number): number {
  return liters / LITERS_PER_CUBIC_METER;
}

export function cubicMetersToLiters(cubicMeters: number): number {
  return cubicMeters * LITERS_PER_CUBIC_METER;
}

export function mmBtuToKwhThermal(mmBtu: number): number {
  return mmBtu * KWH_THERMAL_PER_MMBTU;
}

export function kwhThermalToMmBtu(kwhThermal: number): number {
  return kwhThermal / KWH_THERMAL_PER_MMBTU;
}

/** Safe division that returns a fallback instead of NaN/Infinity for zero denominators. */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  return Math.min(Math.max(value, min), max);
}
