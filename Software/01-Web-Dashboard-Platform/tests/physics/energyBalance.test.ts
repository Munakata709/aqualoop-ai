import { describe, it, expect } from "vitest";
import { resolveEnergyDispatch, type EnergyDispatchInput } from "@/lib/physics/energyBalance";
import type { BatteryConfig } from "@/lib/physics/battery";
import type { GeneratorConfig } from "@/lib/physics/generator";

const batteryConfig: BatteryConfig = {
  nominalCapacityKwh: 600,
  usableFraction: 0.9,
  chargePowerLimitKw: 300,
  dischargePowerLimitKw: 300,
  roundTripEfficiency: 0.9,
  minReserveFraction: 0.1,
  maxSocFraction: 0.95,
};

const generatorConfig: GeneratorConfig = {
  ratedPowerKw: 200,
  electricalEfficiency: 0.25,
  fuelPricePerMmBtu: 8,
  minLoadFraction: 0.2,
  minRuntimeSteps: 4,
};

function baseInput(overrides: Partial<EnergyDispatchInput> = {}): EnergyDispatchInput {
  return {
    requestedLoadKw: 100,
    solarAvailableKw: 50,
    batteryConfig,
    batteryState: { stateOfChargeKwh: 270 },
    generatorConfig,
    stepHours: 1,
    ...overrides,
  };
}

describe("energy dispatch conservation", () => {
  it("fully conserves energy: solar + battery + generator + unmet === total load", () => {
    const result = resolveEnergyDispatch(baseInput());
    const sum = result.solarUsedKw + result.batteryDischargeKw + result.generatorKw + result.unmetKw;
    expect(sum).toBeCloseTo(result.totalLoadKw, 6);
  });

  it("uses solar first when solar alone can cover the load", () => {
    const result = resolveEnergyDispatch(baseInput({ requestedLoadKw: 20, solarAvailableKw: 50 }));
    expect(result.solarUsedKw).toBeCloseTo(20, 6);
    expect(result.batteryDischargeKw).toBe(0);
    expect(result.generatorKw).toBe(0);
    expect(result.unmetKw).toBe(0);
  });

  it("charges the battery with solar surplus when load is fully covered by solar", () => {
    const result = resolveEnergyDispatch(baseInput({ requestedLoadKw: 20, solarAvailableKw: 50 }));
    expect(result.batteryChargeKw).toBeGreaterThan(0);
  });

  it("draws from the battery when solar cannot cover the full load", () => {
    const result = resolveEnergyDispatch(baseInput({ requestedLoadKw: 100, solarAvailableKw: 30 }));
    expect(result.batteryDischargeKw).toBeGreaterThan(0);
  });

  it("dispatches the generator only after solar and battery are exhausted", () => {
    const result = resolveEnergyDispatch(
      baseInput({ requestedLoadKw: 400, solarAvailableKw: 0, batteryState: { stateOfChargeKwh: 0 } }),
    );
    expect(result.generatorKw).toBeGreaterThan(0);
  });

  it("reports unmet load honestly instead of fabricating supply when all sources are exhausted", () => {
    const result = resolveEnergyDispatch(
      baseInput({
        requestedLoadKw: 1000,
        solarAvailableKw: 0,
        batteryState: { stateOfChargeKwh: 0 },
        allowGenerator: false,
      }),
    );
    expect(result.unmetKw).toBeGreaterThan(0);
    expect(result.solarUsedKw + result.batteryDischargeKw + result.generatorKw + result.unmetKw).toBeCloseTo(
      result.totalLoadKw,
      6,
    );
  });

  it("simulates a generator outage by disallowing generator dispatch", () => {
    const result = resolveEnergyDispatch(
      baseInput({ requestedLoadKw: 500, solarAvailableKw: 0, batteryState: { stateOfChargeKwh: 0 }, allowGenerator: false }),
    );
    expect(result.generatorKw).toBe(0);
    expect(result.unmetKw).toBeGreaterThan(0);
  });

  it("never produces negative energy flows", () => {
    const result = resolveEnergyDispatch(baseInput({ requestedLoadKw: 5, solarAvailableKw: 200 }));
    expect(result.solarUsedKw).toBeGreaterThanOrEqual(0);
    expect(result.batteryChargeKw).toBeGreaterThanOrEqual(0);
    expect(result.batteryDischargeKw).toBeGreaterThanOrEqual(0);
    expect(result.generatorKw).toBeGreaterThanOrEqual(0);
    expect(result.unmetKw).toBeGreaterThanOrEqual(0);
    expect(result.solarCurtailedKw).toBeGreaterThanOrEqual(0);
  });
});
