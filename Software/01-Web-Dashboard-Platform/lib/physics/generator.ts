/**
 * Natural gas backup generator model (simulated — no direct hardware control).
 *
 * Converts requested electrical output into fuel consumption and cost using
 * the generator's electrical conversion efficiency, per ASSUMPTIONS.md.
 */

import { clamp, kwhThermalToMmBtu } from "@/lib/units";

export interface GeneratorConfig {
  ratedPowerKw: number;
  /** Electrical conversion efficiency, 0-1. Default planning assumption: 0.25. */
  electricalEfficiency: number;
  fuelPricePerMmBtu: number;
  /** Minimum stable electrical load as a fraction of rated power, 0-1. */
  minLoadFraction: number;
  /** Minimum continuous runtime once started, in simulation steps. */
  minRuntimeSteps: number;
}

export interface GeneratorDispatchResult {
  electricalOutputKw: number;
  fuelThermalKwh: number;
  fuelMmBtu: number;
  fuelCostUsd: number;
  /** Requested output that could not be honored because it was below the generator's minimum stable load or above its rated capacity. */
  rejectedKw: number;
  running: boolean;
}

export function dispatchGenerator(
  config: GeneratorConfig,
  requestedKw: number,
  stepHours: number,
): GeneratorDispatchResult {
  const minLoadKw = config.ratedPowerKw * clamp(config.minLoadFraction, 0, 1);

  if (requestedKw <= 0) {
    return { electricalOutputKw: 0, fuelThermalKwh: 0, fuelMmBtu: 0, fuelCostUsd: 0, rejectedKw: 0, running: false };
  }

  // Below minimum stable load, the generator either idles at minimum load (wasting some
  // capacity) or stays off — we choose "stays off" to avoid fabricating unnecessary runtime,
  // and report the shortfall so the caller knows generation was not provided.
  if (requestedKw < minLoadKw) {
    return {
      electricalOutputKw: 0,
      fuelThermalKwh: 0,
      fuelMmBtu: 0,
      fuelCostUsd: 0,
      rejectedKw: requestedKw,
      running: false,
    };
  }

  const electricalOutputKw = clamp(requestedKw, minLoadKw, config.ratedPowerKw);
  const rejectedKw = Math.max(0, requestedKw - electricalOutputKw);

  const electricalEnergyKwh = electricalOutputKw * stepHours;
  const efficiency = clamp(config.electricalEfficiency, 0.01, 1);
  const fuelThermalKwh = electricalEnergyKwh / efficiency;
  const fuelMmBtu = kwhThermalToMmBtu(fuelThermalKwh);
  const fuelCostUsd = fuelMmBtu * config.fuelPricePerMmBtu;

  return { electricalOutputKw, fuelThermalKwh, fuelMmBtu, fuelCostUsd, rejectedKw, running: true };
}

/** Estimated CO2 emissions in kg for a given MMBtu of natural gas burned (EPA default factor ~53.06 kg CO2/MMBtu). Clearly labeled as an estimate. */
export function estimateEmissionsKgCo2(fuelMmBtu: number, emissionsFactorKgPerMmBtu = 53.06): number {
  return fuelMmBtu * emissionsFactorKgPerMmBtu;
}
