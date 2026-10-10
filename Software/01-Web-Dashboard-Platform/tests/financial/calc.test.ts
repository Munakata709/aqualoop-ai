import { describe, it, expect } from "vitest";
import { calculateFinancials, DEFAULT_FINANCIAL_INPUTS } from "@/lib/financial/calc";
import { calculateDesalinationCost, DEFAULT_DESALINATION_INPUTS } from "@/lib/financial/desalination";

describe("AquaLoop financial model", () => {
  it("computes a positive total capital cost from the component costs", () => {
    const result = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    expect(result.totalCapitalCostUsd).toBeGreaterThan(0);
  });

  it("computes annual water production from fleet size, rating, and utilization", () => {
    const result = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    const expected = 20 * 50 * 0.75 * 365;
    expect(result.annualWaterProductionGallons).toBeCloseTo(expected, 3);
  });

  it("never produces a negative levelized cost of water", () => {
    const result = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    expect(result.levelizedCostOfWaterUsdPerGallon).toBeGreaterThanOrEqual(0);
  });

  it("reports optimization savings relative to an explicit 0%-improvement baseline, never negative", () => {
    const result = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    expect(result.annualOptimizationSavingsUsd).toBeGreaterThanOrEqual(0);
  });

  it("reports higher optimization savings for a larger assumed improvement", () => {
    const low = calculateFinancials({ ...DEFAULT_FINANCIAL_INPUTS, optimizationImprovementPct: 5 });
    const high = calculateFinancials({ ...DEFAULT_FINANCIAL_INPUTS, optimizationImprovementPct: 20 });
    expect(high.annualOptimizationSavingsUsd).toBeGreaterThanOrEqual(low.annualOptimizationSavingsUsd);
  });

  it("reports payback as null (not a fabricated number) when the project never breaks even", () => {
    const neverBreaksEven = calculateFinancials({
      ...DEFAULT_FINANCIAL_INPUTS,
      waterSalePriceUsdPerGallon: 0, // no revenue at all
    });
    expect(neverBreaksEven.paybackYears).toBeNull();
  });

  it("reports a numeric payback period when revenue clearly exceeds opex", () => {
    const profitable = calculateFinancials({
      ...DEFAULT_FINANCIAL_INPUTS,
      waterSalePriceUsdPerGallon: 5,
    });
    expect(profitable.paybackYears).not.toBeNull();
    expect(profitable.paybackYears).toBeGreaterThan(0);
  });

  it("includes solar capital cost rather than treating solar as free", () => {
    const withSolar = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    const withoutSolarCost = calculateFinancials({ ...DEFAULT_FINANCIAL_INPUTS, solarInstallCostUsdPerWatt: 0 });
    expect(withSolar.totalCapitalCostUsd).toBeGreaterThan(withoutSolarCost.totalCapitalCostUsd);
  });

  it("produces 5/10/20 year projections", () => {
    const result = calculateFinancials(DEFAULT_FINANCIAL_INPUTS);
    const years = result.projections.map((p) => p.year);
    expect(years).toEqual([5, 10, 20]);
  });
});

describe("desalination comparison model", () => {
  it("computes energy per gallon from the configured kWh/m3 rate", () => {
    const result = calculateDesalinationCost(DEFAULT_DESALINATION_INPUTS);
    // 4 kWh/m3 * 3.785411784 L/gal / 1000 L/m3 = kWh/gal
    const expectedKwhPerGallon = (4 * 3.785411784) / 1000;
    expect(result.energyPerGallonKwh).toBeCloseTo(expectedKwhPerGallon, 6);
  });

  it("never produces a negative levelized cost", () => {
    const result = calculateDesalinationCost(DEFAULT_DESALINATION_INPUTS);
    expect(result.levelizedCostOfWaterUsdPerGallon).toBeGreaterThanOrEqual(0);
  });

  it("20-year cumulative cost is greater than 10-year cumulative cost", () => {
    const result = calculateDesalinationCost(DEFAULT_DESALINATION_INPUTS);
    expect(result.twentyYearCumulativeCostUsd).toBeGreaterThan(result.tenYearCumulativeCostUsd);
  });

  it("is dramatically more energy-efficient per gallon than the AWG baseline (0.6 kWh/L), as the spec requires us to state honestly", () => {
    const desal = calculateDesalinationCost(DEFAULT_DESALINATION_INPUTS);
    const awgKwhPerGallon = 0.6 * 3.785411784; // baseline specific energy, no optimization
    expect(desal.energyPerGallonKwh).toBeLessThan(awgKwhPerGallon);
  });
});
