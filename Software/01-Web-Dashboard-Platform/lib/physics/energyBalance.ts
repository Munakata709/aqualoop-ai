/**
 * Energy dispatch for a single simulation step.
 *
 * Merit order: solar first (serves load, then charges battery with any
 * surplus) -> battery discharge -> natural gas generator -> unmet load.
 * This function never fabricates energy: it is structured so that
 *
 *   solarUsedKw + batteryDischargeKw + generatorKw + unmetKw === totalLoadKw
 *
 * holds for every call (verified in tests/physics/energyBalance.test.ts).
 * Optimization strategies change *how much* load is requested and *when*
 * (see lib/optimization), not this conservation law.
 */

import { safeDivide } from "@/lib/units";
import { type BatteryConfig, type BatteryState, chargeBattery, dischargeBattery } from "@/lib/physics/battery";
import { type GeneratorConfig, type GeneratorDispatchResult, dispatchGenerator } from "@/lib/physics/generator";

export interface EnergyDispatchInput {
  requestedLoadKw: number;
  auxLoadKw?: number;
  solarAvailableKw: number;
  batteryConfig: BatteryConfig;
  batteryState: BatteryState;
  generatorConfig: GeneratorConfig;
  stepHours: number;
  /** Set false to simulate a generator outage scenario. */
  allowGenerator?: boolean;
  /** Set false to simulate a battery that should not be used (e.g. isolated for maintenance). */
  allowBattery?: boolean;
}

export interface EnergyDispatchResult {
  totalLoadKw: number;
  solarUsedKw: number;
  solarCurtailedKw: number;
  batteryChargeKw: number;
  batteryDischargeKw: number;
  generatorKw: number;
  generatorResult: GeneratorDispatchResult;
  unmetKw: number;
  nextBatteryState: BatteryState;
}

export function resolveEnergyDispatch(input: EnergyDispatchInput): EnergyDispatchResult {
  const totalLoadKw = Math.max(0, input.requestedLoadKw + (input.auxLoadKw ?? 0));
  const solarAvailableKw = Math.max(0, input.solarAvailableKw);
  const allowBattery = input.allowBattery ?? true;
  const allowGenerator = input.allowGenerator ?? true;

  const solarUsedKw = Math.min(solarAvailableKw, totalLoadKw);
  let remainingLoadKw = totalLoadKw - solarUsedKw;
  const solarSurplusKw = solarAvailableKw - solarUsedKw;

  let nextBatteryState: BatteryState = input.batteryState;
  let batteryChargeKw = 0;
  let solarCurtailedKw = solarSurplusKw;

  if (allowBattery && solarSurplusKw > 0) {
    const chargeResult = chargeBattery(
      input.batteryConfig,
      input.batteryState,
      solarSurplusKw * input.stepHours,
      input.stepHours,
    );
    batteryChargeKw = safeDivide(chargeResult.energyAcceptedKwh, input.stepHours);
    solarCurtailedKw = safeDivide(chargeResult.curtailedKwh, input.stepHours);
    nextBatteryState = { stateOfChargeKwh: chargeResult.nextStateOfChargeKwh };
  }

  let batteryDischargeKw = 0;
  if (allowBattery && remainingLoadKw > 0) {
    const dischargeResult = dischargeBattery(
      input.batteryConfig,
      nextBatteryState,
      remainingLoadKw * input.stepHours,
      input.stepHours,
    );
    batteryDischargeKw = safeDivide(dischargeResult.energyDeliveredKwh, input.stepHours);
    nextBatteryState = { stateOfChargeKwh: dischargeResult.nextStateOfChargeKwh };
    remainingLoadKw = Math.max(0, remainingLoadKw - batteryDischargeKw);
  }

  let generatorResult: GeneratorDispatchResult = {
    electricalOutputKw: 0,
    fuelThermalKwh: 0,
    fuelMmBtu: 0,
    fuelCostUsd: 0,
    rejectedKw: 0,
    running: false,
  };
  if (allowGenerator && remainingLoadKw > 0) {
    generatorResult = dispatchGenerator(input.generatorConfig, remainingLoadKw, input.stepHours);
    remainingLoadKw = Math.max(0, remainingLoadKw - generatorResult.electricalOutputKw);
  }

  return {
    totalLoadKw,
    solarUsedKw,
    solarCurtailedKw,
    batteryChargeKw,
    batteryDischargeKw,
    generatorKw: generatorResult.electricalOutputKw,
    generatorResult,
    unmetKw: remainingLoadKw,
    nextBatteryState,
  };
}
