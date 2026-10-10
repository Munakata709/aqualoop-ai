/**
 * Atmospheric water generation (AWG) physics model.
 *
 * This is a documented SIMPLIFIED / SYNTHETIC model for demonstration
 * purposes (see SIMULATION_VALIDATION.md). It uses standard meteorological
 * approximations (Magnus-Tetens dew point, standard absolute humidity
 * formula) combined with an explicit, editable reference operating point
 * rather than a validated manufacturer performance curve. It is architected
 * so a real manufacturer performance table (lib/equipment) can replace
 * `estimateWaterProductionRate` without touching callers.
 *
 * It never reports condensation when the coil is not physically below the
 * dew point, and never reports production above a documented equipment
 * ceiling.
 */

import { clamp, safeDivide } from "@/lib/units";

export interface AwgOperatingConditions {
  temperatureC: number;
  relativeHumidityPct: number;
  /** Evaporator coil surface temperature, °C. Must be below dew point for condensation. */
  coilTempC?: number;
  /** 0-1 multiplier for equipment condition / derate (maintenance, altitude, etc). */
  performanceFactor?: number;
}

export interface AwgProductionResult {
  feasible: boolean;
  reason?: string;
  dewPointC: number;
  absoluteHumidityGPerM3: number;
  productionRateLPerHour: number;
}

/**
 * Magnus-Tetens dew point approximation. Valid roughly -45°C to 60°C.
 * Source: Alduchov & Eskridge (1996) refinement of the Magnus formula.
 */
export function estimateDewPointC(temperatureC: number, relativeHumidityPct: number): number {
  const rh = clamp(relativeHumidityPct, 0.1, 100);
  const a = 17.62;
  const b = 243.12;
  const alpha = Math.log(rh / 100) + (a * temperatureC) / (b + temperatureC);
  return (b * alpha) / (a - alpha);
}

/**
 * Standard approximate formula for absolute humidity (water vapor density)
 * in g/m³, derived from saturation vapor pressure (Tetens equation).
 */
export function estimateAbsoluteHumidityGPerM3(
  temperatureC: number,
  relativeHumidityPct: number,
): number {
  const rh = clamp(relativeHumidityPct, 0, 100);
  const saturationVaporPressureHPa = 6.1078 * Math.pow(10, (7.5 * temperatureC) / (temperatureC + 237.3));
  const actualVaporPressureHPa = saturationVaporPressureHPa * (rh / 100);
  return (216.7 * actualVaporPressureHPa) / (273.15 + temperatureC);
}

/**
 * Reference operating point used to scale the rated capacity of an AWG.
 * 27°C / 60% RH is a commonly cited AWG rating condition; absolute humidity
 * at that point is ~15.6 g/m³. This is an explicit, editable assumption,
 * not a measured constant — see ASSUMPTIONS.md.
 */
export const REFERENCE_ABSOLUTE_HUMIDITY_G_PER_M3 = estimateAbsoluteHumidityGPerM3(27, 60);

/** Equipment cannot physically exceed this multiple of its rated hourly capacity. */
export const MAX_OVER_RATED_CAPACITY_FACTOR = 1.25;

export function estimateWaterProductionRate(
  conditions: AwgOperatingConditions,
  ratedProductionLPerDay: number,
): AwgProductionResult {
  const coilTempC = conditions.coilTempC ?? 5;
  const performanceFactor = clamp(conditions.performanceFactor ?? 1, 0, 1.25);

  const dewPointC = estimateDewPointC(conditions.temperatureC, conditions.relativeHumidityPct);
  const absoluteHumidityGPerM3 = estimateAbsoluteHumidityGPerM3(
    conditions.temperatureC,
    conditions.relativeHumidityPct,
  );

  // Hard physical constraint: no condensation if the coil can't get below dew point.
  if (dewPointC <= coilTempC) {
    return {
      feasible: false,
      reason:
        "Coil temperature is not below the estimated dew point under these conditions, so condensation is not physically possible.",
      dewPointC,
      absoluteHumidityGPerM3,
      productionRateLPerHour: 0,
    };
  }

  const ratedLPerHour = ratedProductionLPerDay / 24;
  const moistureRatio = clamp(
    safeDivide(absoluteHumidityGPerM3, REFERENCE_ABSOLUTE_HUMIDITY_G_PER_M3, 0),
    0,
    MAX_OVER_RATED_CAPACITY_FACTOR,
  );

  const rawRateLPerHour = ratedLPerHour * moistureRatio * performanceFactor;
  const productionRateLPerHour = clamp(rawRateLPerHour, 0, ratedLPerHour * MAX_OVER_RATED_CAPACITY_FACTOR);

  return {
    feasible: true,
    dewPointC,
    absoluteHumidityGPerM3,
    productionRateLPerHour,
  };
}

/**
 * Specific energy (kWh per liter) with a simple, documented high-ambient
 * derate: compressors lose efficiency as ambient temperature rises.
 * Default baseline is the planning assumption from ASSUMPTIONS.md (0.6 kWh/L).
 */
export function estimateSpecificEnergyKwhPerL(
  temperatureC: number,
  baseSpecificEnergyKwhPerL = 0.6,
): number {
  const derateThresholdC = 35;
  const derateRatePerDegree = 0.02;
  if (temperatureC <= derateThresholdC) return baseSpecificEnergyKwhPerL;
  const derate = 1 + (temperatureC - derateThresholdC) * derateRatePerDegree;
  return baseSpecificEnergyKwhPerL * derate;
}

export function electricalPowerKw(
  productionRateLPerHour: number,
  specificEnergyKwhPerL: number,
): number {
  return productionRateLPerHour * specificEnergyKwhPerL;
}

/** kWh per liter of water actually produced. Returns 0 (not NaN) when no water was produced. */
export function energyIntensityKwhPerL(totalElectricalEnergyKwh: number, waterProducedL: number): number {
  return safeDivide(totalElectricalEnergyKwh, waterProducedL, 0);
}

export interface TankBalanceResult {
  volumeL: number;
  /** Water that could not be stored because the tank was full (production was curtailed/wasted). */
  overflowL: number;
  /** Water that could not be withdrawn because the tank was empty (unmet demand). */
  deficitL: number;
}

/** Enforces 0 <= volume <= capacity and surfaces overflow/deficit rather than silently clipping. */
export function nextTankVolumeL(
  currentVolumeL: number,
  producedL: number,
  consumedL: number,
  lossesL: number,
  capacityL: number,
): TankBalanceResult {
  const raw = currentVolumeL + producedL - consumedL - lossesL;
  const overflowL = Math.max(0, raw - capacityL);
  const deficitL = Math.max(0, -raw);
  const volumeL = clamp(raw, 0, capacityL);
  return { volumeL, overflowL, deficitL };
}
