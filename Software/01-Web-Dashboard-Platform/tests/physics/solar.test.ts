import { describe, it, expect } from "vitest";
import { installedCapacityKw, clearSkyIrradianceShape, solarPowerKw } from "@/lib/physics/solar";

describe("installed capacity", () => {
  it("matches the fleet default: ~723 panels * 550W ≈ 398 kW", () => {
    const kw = installedCapacityKw({ panelCount: 723, panelRatingW: 550 });
    expect(kw).toBeCloseTo(397.65, 1);
  });
});

describe("clear-sky irradiance shape", () => {
  it("is zero before sunrise and after sunset", () => {
    expect(clearSkyIrradianceShape(5)).toBe(0);
    expect(clearSkyIrradianceShape(19)).toBe(0);
  });

  it("peaks at solar noon", () => {
    const noon = clearSkyIrradianceShape(12);
    const morning = clearSkyIrradianceShape(8);
    const evening = clearSkyIrradianceShape(16);
    expect(noon).toBeGreaterThan(morning);
    expect(noon).toBeGreaterThan(evening);
    expect(noon).toBeCloseTo(1, 5);
  });
});

describe("solar power output", () => {
  const config = { panelCount: 723, panelRatingW: 550, performanceFactor: 0.8 };

  it("is zero at night", () => {
    expect(solarPowerKw(config, 2)).toBe(0);
  });

  it("is positive at midday", () => {
    expect(solarPowerKw(config, 12)).toBeGreaterThan(0);
  });

  it("never exceeds installed capacity", () => {
    const capacityKw = installedCapacityKw(config);
    for (let h = 0; h < 24; h += 0.5) {
      expect(solarPowerKw(config, h)).toBeLessThanOrEqual(capacityKw + 1e-9);
    }
  });

  it("is reduced by cloud cover", () => {
    const clear = solarPowerKw({ ...config, cloudCoverFactor: 1 }, 12);
    const cloudy = solarPowerKw({ ...config, cloudCoverFactor: 0.3 }, 12);
    expect(cloudy).toBeLessThan(clear);
  });

  it("is never negative", () => {
    for (let h = 0; h < 24; h += 1) {
      expect(solarPowerKw(config, h)).toBeGreaterThanOrEqual(0);
    }
  });
});
