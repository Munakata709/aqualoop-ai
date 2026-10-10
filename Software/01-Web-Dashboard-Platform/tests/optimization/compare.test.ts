import { describe, it, expect } from "vitest";
import { baselineController } from "@/lib/optimization/baseline";
import { decideFleetControl } from "@/lib/optimization/heuristic";
import { STRATEGIES } from "@/lib/optimization/strategies";
import { runScenario, runBaselineVsOptimizedComparison } from "@/lib/optimization/compare";
import type { ControllerContext } from "@/lib/optimization/types";

function controllerFor(strategyId: keyof typeof STRATEGIES) {
  return (context: ControllerContext) => decideFleetControl(context, STRATEGIES[strategyId]);
}

describe("scenario runner determinism", () => {
  it("produces identical aggregate metrics for the same seed and controller", () => {
    const options = { seed: 123, totalHours: 24, stepHours: 1, startHourOfDay: 0 };
    const resultA = runScenario(baselineController, options);
    const resultB = runScenario(baselineController, options);

    expect(resultB.waterProducedGallons).toBeCloseTo(resultA.waterProducedGallons, 6);
    expect(resultB.electricityConsumedKwh).toBeCloseTo(resultA.electricityConsumedKwh, 6);
    expect(resultB.gasFuelCostUsd).toBeCloseTo(resultA.gasFuelCostUsd, 6);
  });

  it("produces different results for different seeds", () => {
    const resultA = runScenario(baselineController, { seed: 1, totalHours: 24, stepHours: 1, startHourOfDay: 0 });
    const resultB = runScenario(baselineController, { seed: 2, totalHours: 24, stepHours: 1, startHourOfDay: 0 });
    // Not asserting a specific direction — just that the seed actually affects the weather noise path.
    expect(resultA).not.toEqual(resultB);
  });
});

describe("scenario runner physical sanity", () => {
  it("never reports negative water, energy, or cost over a full day", () => {
    const result = runScenario(baselineController, { seed: 7, totalHours: 24, stepHours: 1, startHourOfDay: 0 });
    expect(result.waterProducedGallons).toBeGreaterThanOrEqual(0);
    expect(result.electricityConsumedKwh).toBeGreaterThanOrEqual(0);
    expect(result.gasFuelCostUsd).toBeGreaterThanOrEqual(0);
    expect(result.kwhPerGallon).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.kwhPerGallon)).toBe(true);
  });

  it("reports a fleet rated near 1,000 gallons/day when run at full fixed schedule for 24h under reference-like conditions", () => {
    const result = runScenario(baselineController, { seed: 7, totalHours: 24, stepHours: 1, startHourOfDay: 0 });
    // Corpus Christi profile hovers near the AWG reference condition, so this should be in a
    // broad plausible band — not pinned to exactly 1,000, since weather varies hour to hour.
    expect(result.waterProducedGallons).toBeGreaterThan(200);
    expect(result.waterProducedGallons).toBeLessThan(1400);
  });
});

describe("baseline vs optimized comparison", () => {
  it("runs both controllers against the same seed and reports a structured comparison", () => {
    const comparison = runBaselineVsOptimizedComparison(baselineController, controllerFor("solar-first"), {
      seed: 42,
      totalHours: 24,
      stepHours: 1,
      startHourOfDay: 0,
    });
    expect(comparison.baseline.strategyLabel).toBe("Fixed Schedule");
    expect(comparison.optimized.strategyLabel).toBe("Solar-First");
    expect(Number.isFinite(comparison.kwhPerGallonImprovementPct)).toBe(true);
  });

  it("solar-first dispatch uses no more generator energy than the fixed-schedule baseline over a full day", () => {
    const comparison = runBaselineVsOptimizedComparison(baselineController, controllerFor("solar-first"), {
      seed: 99,
      totalHours: 24,
      stepHours: 1,
      startHourOfDay: 0,
    });
    expect(comparison.optimized.generatorEnergyKwh).toBeLessThanOrEqual(comparison.baseline.generatorEnergyKwh + 1e-6);
  });

  it("never fabricates water production under the optimized strategy relative to physical limits", () => {
    const comparison = runBaselineVsOptimizedComparison(baselineController, controllerFor("lowest-cost"), {
      seed: 11,
      totalHours: 24,
      stepHours: 1,
      startHourOfDay: 0,
    });
    expect(comparison.optimized.waterProducedGallons).toBeGreaterThanOrEqual(0);
    expect(comparison.optimized.kwhPerGallon).toBeGreaterThanOrEqual(0);
  });
});
