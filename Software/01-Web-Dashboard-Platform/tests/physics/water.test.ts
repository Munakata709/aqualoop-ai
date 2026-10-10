import { describe, it, expect } from "vitest";
import {
  estimateDewPointC,
  estimateAbsoluteHumidityGPerM3,
  estimateWaterProductionRate,
  estimateSpecificEnergyKwhPerL,
  energyIntensityKwhPerL,
  nextTankVolumeL,
} from "@/lib/physics/water";

describe("dew point estimation", () => {
  it("returns a dew point below ambient temperature for partial humidity", () => {
    const dp = estimateDewPointC(30, 60);
    expect(dp).toBeLessThan(30);
    expect(dp).toBeGreaterThan(0);
  });

  it("returns dew point approximately equal to ambient temperature at 100% RH", () => {
    const dp = estimateDewPointC(25, 100);
    expect(dp).toBeCloseTo(25, 0);
  });
});

describe("absolute humidity estimation", () => {
  it("increases with relative humidity at a fixed temperature", () => {
    const low = estimateAbsoluteHumidityGPerM3(27, 30);
    const high = estimateAbsoluteHumidityGPerM3(27, 90);
    expect(high).toBeGreaterThan(low);
  });

  it("is never negative", () => {
    expect(estimateAbsoluteHumidityGPerM3(-10, 50)).toBeGreaterThanOrEqual(0);
  });
});

describe("water production rate", () => {
  const ratedLPerDay = 189.27; // 50 gal/day

  it("is infeasible when the coil cannot get below the dew point", () => {
    const result = estimateWaterProductionRate(
      { temperatureC: 20, relativeHumidityPct: 20, coilTempC: 15 },
      ratedLPerDay,
    );
    expect(result.feasible).toBe(false);
    expect(result.productionRateLPerHour).toBe(0);
  });

  it("produces water under reference-like conditions near the rated hourly rate", () => {
    const result = estimateWaterProductionRate({ temperatureC: 27, relativeHumidityPct: 60 }, ratedLPerDay);
    expect(result.feasible).toBe(true);
    expect(result.productionRateLPerHour).toBeCloseTo(ratedLPerDay / 24, 1);
  });

  it("never exceeds the documented equipment ceiling even in very humid conditions", () => {
    const result = estimateWaterProductionRate({ temperatureC: 30, relativeHumidityPct: 99 }, ratedLPerDay);
    expect(result.productionRateLPerHour).toBeLessThanOrEqual((ratedLPerDay / 24) * 1.25 + 1e-9);
  });

  it("never produces a negative rate", () => {
    const result = estimateWaterProductionRate({ temperatureC: 5, relativeHumidityPct: 10 }, ratedLPerDay);
    expect(result.productionRateLPerHour).toBeGreaterThanOrEqual(0);
  });

  it("produces less water in dry conditions than in humid conditions at the same temperature", () => {
    const dry = estimateWaterProductionRate({ temperatureC: 27, relativeHumidityPct: 35 }, ratedLPerDay);
    const humid = estimateWaterProductionRate({ temperatureC: 27, relativeHumidityPct: 80 }, ratedLPerDay);
    expect(humid.productionRateLPerHour).toBeGreaterThan(dry.productionRateLPerHour);
  });
});

describe("specific energy derate", () => {
  it("matches the baseline below the derate threshold", () => {
    expect(estimateSpecificEnergyKwhPerL(25)).toBeCloseTo(0.6, 6);
  });

  it("increases above the derate threshold", () => {
    const base = estimateSpecificEnergyKwhPerL(35);
    const hot = estimateSpecificEnergyKwhPerL(45);
    expect(hot).toBeGreaterThan(base);
  });
});

describe("energy intensity", () => {
  it("computes kWh per liter", () => {
    expect(energyIntensityKwhPerL(60, 100)).toBeCloseTo(0.6, 6);
  });

  it("returns 0 instead of NaN/Infinity when no water was produced", () => {
    expect(energyIntensityKwhPerL(10, 0)).toBe(0);
    expect(Number.isFinite(energyIntensityKwhPerL(10, 0))).toBe(true);
  });
});

describe("water tank mass balance", () => {
  it("adds produced water and subtracts consumed water and losses", () => {
    const result = nextTankVolumeL(100, 50, 20, 5, 500);
    expect(result.volumeL).toBe(125);
    expect(result.overflowL).toBe(0);
    expect(result.deficitL).toBe(0);
  });

  it("never exceeds capacity and reports overflow instead of silently dropping it", () => {
    const result = nextTankVolumeL(480, 50, 0, 0, 500);
    expect(result.volumeL).toBe(500);
    expect(result.overflowL).toBe(30);
  });

  it("never goes negative and reports a deficit instead", () => {
    const result = nextTankVolumeL(10, 0, 50, 0, 500);
    expect(result.volumeL).toBe(0);
    expect(result.deficitL).toBe(40);
  });
});
