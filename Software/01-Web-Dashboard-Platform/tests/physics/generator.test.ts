import { describe, it, expect } from "vitest";
import { dispatchGenerator, estimateEmissionsKgCo2, type GeneratorConfig } from "@/lib/physics/generator";

const config: GeneratorConfig = {
  ratedPowerKw: 100,
  electricalEfficiency: 0.25,
  fuelPricePerMmBtu: 8,
  minLoadFraction: 0.3,
  minRuntimeSteps: 4,
};

describe("generator dispatch", () => {
  it("does not run for zero or negative requests", () => {
    const result = dispatchGenerator(config, 0, 1);
    expect(result.running).toBe(false);
    expect(result.electricalOutputKw).toBe(0);
    expect(result.fuelCostUsd).toBe(0);
  });

  it("stays off and reports the shortfall when requested load is below minimum stable load", () => {
    const result = dispatchGenerator(config, 10, 1); // min load = 30kW
    expect(result.running).toBe(false);
    expect(result.electricalOutputKw).toBe(0);
    expect(result.rejectedKw).toBe(10);
  });

  it("never exceeds rated power", () => {
    const result = dispatchGenerator(config, 500, 1);
    expect(result.electricalOutputKw).toBeLessThanOrEqual(config.ratedPowerKw);
    expect(result.rejectedKw).toBeCloseTo(400, 6);
  });

  it("computes fuel consumption using electrical efficiency: fuelThermal = electricalEnergy / efficiency", () => {
    const result = dispatchGenerator(config, 50, 1);
    expect(result.electricalOutputKw).toBe(50);
    expect(result.fuelThermalKwh).toBeCloseTo(50 / 0.25, 6);
  });

  it("computes fuel cost from MMBtu and price per MMBtu", () => {
    const result = dispatchGenerator(config, 50, 1);
    const expectedMmBtu = result.fuelThermalKwh / 293.07;
    expect(result.fuelMmBtu).toBeCloseTo(expectedMmBtu, 6);
    expect(result.fuelCostUsd).toBeCloseTo(expectedMmBtu * 8, 6);
  });

  it("never produces negative fuel consumption or cost", () => {
    const result = dispatchGenerator(config, 50, 1);
    expect(result.fuelThermalKwh).toBeGreaterThanOrEqual(0);
    expect(result.fuelCostUsd).toBeGreaterThanOrEqual(0);
  });
});

describe("emissions estimate", () => {
  it("scales linearly with fuel consumption and is clearly an estimate (not measured)", () => {
    expect(estimateEmissionsKgCo2(2)).toBeCloseTo(106.12, 1);
    expect(estimateEmissionsKgCo2(0)).toBe(0);
  });
});
