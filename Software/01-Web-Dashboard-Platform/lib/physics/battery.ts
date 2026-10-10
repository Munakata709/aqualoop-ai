/**
 * Battery energy storage model.
 *
 * Tracks state of charge within hard capacity/power limits. Never allows
 * negative energy or state of charge outside [0, 1], and applies round-trip
 * efficiency so charge/discharge never fabricates energy.
 */

import { clamp } from "@/lib/units";

export interface BatteryConfig {
  nominalCapacityKwh: number;
  /** 0-1 fraction of nominal capacity usable (derated for longevity/degradation). */
  usableFraction: number;
  chargePowerLimitKw: number;
  dischargePowerLimitKw: number;
  /** Round-trip efficiency, 0-1. Applied on discharge (charge stored at face value, delivered at a loss). */
  roundTripEfficiency: number;
  /** Minimum state of charge the controller should preserve (0-1), e.g. for emergency reserve. */
  minReserveFraction: number;
  /** Maximum state of charge (0-1), e.g. to protect battery longevity. */
  maxSocFraction: number;
}

export interface BatteryState {
  stateOfChargeKwh: number;
}

export interface BatteryStepResult {
  nextStateOfChargeKwh: number;
  /** Energy actually delivered to the load (kWh), after round-trip losses. */
  energyDeliveredKwh: number;
  /** Energy actually drawn from the battery's stored charge for this discharge (kWh), before losses. */
  energyDrawnKwh: number;
  /** Energy actually accepted into storage (kWh) during a charge step. */
  energyAcceptedKwh: number;
  /** Requested amount that could not be honored because of power or capacity limits (kWh). */
  curtailedKwh: number;
}

export function usableCapacityKwh(config: BatteryConfig): number {
  return config.nominalCapacityKwh * clamp(config.usableFraction, 0, 1);
}

export function socFraction(config: BatteryConfig, state: BatteryState): number {
  const usable = usableCapacityKwh(config);
  if (usable <= 0) return 0;
  return clamp(state.stateOfChargeKwh / usable, 0, 1);
}

/** Discharge up to `requestedKwh` of load, respecting power limit, reserve, and round-trip efficiency. */
export function dischargeBattery(
  config: BatteryConfig,
  state: BatteryState,
  requestedKwh: number,
  stepHours: number,
): BatteryStepResult {
  const usable = usableCapacityKwh(config);
  const reserveKwh = usable * clamp(config.minReserveFraction, 0, 1);
  const availableAboveReserveKwh = Math.max(0, state.stateOfChargeKwh - reserveKwh);

  const powerLimitedKwh = config.dischargePowerLimitKw * stepHours;
  const efficiency = clamp(config.roundTripEfficiency, 0.01, 1);

  // Energy drawn from storage needed to deliver requestedKwh to the load.
  const requestedDrawKwh = safeguardDivide(requestedKwh, efficiency);
  const drawKwh = clamp(Math.min(requestedDrawKwh, powerLimitedKwh, availableAboveReserveKwh), 0, availableAboveReserveKwh);
  const deliveredKwh = drawKwh * efficiency;
  const curtailedKwh = Math.max(0, requestedKwh - deliveredKwh);

  return {
    nextStateOfChargeKwh: clamp(state.stateOfChargeKwh - drawKwh, 0, usable),
    energyDeliveredKwh: deliveredKwh,
    energyDrawnKwh: drawKwh,
    energyAcceptedKwh: 0,
    curtailedKwh,
  };
}

/** Charge the battery with up to `availableKwh` of surplus energy, respecting power limit and max SOC. */
export function chargeBattery(
  config: BatteryConfig,
  state: BatteryState,
  availableKwh: number,
  stepHours: number,
): BatteryStepResult {
  const usable = usableCapacityKwh(config);
  const maxSocKwh = usable * clamp(config.maxSocFraction, 0, 1);
  const headroomKwh = Math.max(0, maxSocKwh - state.stateOfChargeKwh);
  const powerLimitedKwh = config.chargePowerLimitKw * stepHours;

  const acceptedKwh = clamp(Math.min(availableKwh, powerLimitedKwh, headroomKwh), 0, headroomKwh);
  const curtailedKwh = Math.max(0, availableKwh - acceptedKwh);

  return {
    nextStateOfChargeKwh: clamp(state.stateOfChargeKwh + acceptedKwh, 0, usable),
    energyDeliveredKwh: 0,
    energyDrawnKwh: 0,
    energyAcceptedKwh: acceptedKwh,
    curtailedKwh,
  };
}

function safeguardDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}
