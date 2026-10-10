import { describe, it, expect } from "vitest";
import { usableCapacityKwh, socFraction, chargeBattery, dischargeBattery, type BatteryConfig } from "@/lib/physics/battery";

const config: BatteryConfig = {
  nominalCapacityKwh: 30,
  usableFraction: 0.9,
  chargePowerLimitKw: 15,
  dischargePowerLimitKw: 15,
  roundTripEfficiency: 0.9,
  minReserveFraction: 0.1,
  maxSocFraction: 0.95,
};

describe("battery capacity and state of charge", () => {
  it("computes usable capacity from nominal capacity and usable fraction", () => {
    expect(usableCapacityKwh(config)).toBeCloseTo(27, 6);
  });

  it("computes state of charge as a fraction of usable capacity", () => {
    const frac = socFraction(config, { stateOfChargeKwh: 13.5 });
    expect(frac).toBeCloseTo(0.5, 6);
  });
});

describe("battery discharge", () => {
  it("never discharges below the minimum reserve", () => {
    const usable = usableCapacityKwh(config);
    const reserveKwh = usable * config.minReserveFraction;
    const result = dischargeBattery(config, { stateOfChargeKwh: reserveKwh + 1 }, 100, 1);
    expect(result.nextStateOfChargeKwh).toBeGreaterThanOrEqual(reserveKwh - 1e-9);
  });

  it("respects the discharge power limit over the step duration", () => {
    const result = dischargeBattery(config, { stateOfChargeKwh: 27 }, 1000, 1);
    expect(result.energyDeliveredKwh).toBeLessThanOrEqual(config.dischargePowerLimitKw + 1e-9);
  });

  it("applies round-trip efficiency so delivered energy is less than drawn energy", () => {
    const result = dischargeBattery(config, { stateOfChargeKwh: 27 }, 5, 1);
    expect(result.energyDeliveredKwh).toBeLessThan(result.energyDrawnKwh);
    expect(result.energyDeliveredKwh).toBeCloseTo(result.energyDrawnKwh * config.roundTripEfficiency, 6);
  });

  it("reports curtailment when demand exceeds what the battery can supply", () => {
    const result = dischargeBattery(config, { stateOfChargeKwh: 3 }, 50, 1);
    expect(result.curtailedKwh).toBeGreaterThan(0);
  });

  it("never produces negative state of charge", () => {
    const result = dischargeBattery(config, { stateOfChargeKwh: 0.5 }, 1000, 1);
    expect(result.nextStateOfChargeKwh).toBeGreaterThanOrEqual(0);
  });
});

describe("battery charge", () => {
  it("never charges above the maximum state of charge", () => {
    const usable = usableCapacityKwh(config);
    const maxSocKwh = usable * config.maxSocFraction;
    const result = chargeBattery(config, { stateOfChargeKwh: maxSocKwh - 1 }, 1000, 1);
    expect(result.nextStateOfChargeKwh).toBeLessThanOrEqual(maxSocKwh + 1e-9);
  });

  it("respects the charge power limit over the step duration", () => {
    const result = chargeBattery(config, { stateOfChargeKwh: 0 }, 1000, 1);
    expect(result.energyAcceptedKwh).toBeLessThanOrEqual(config.chargePowerLimitKw + 1e-9);
  });

  it("never exceeds rated/usable capacity", () => {
    const result = chargeBattery(config, { stateOfChargeKwh: 0 }, 1000, 10);
    expect(result.nextStateOfChargeKwh).toBeLessThanOrEqual(usableCapacityKwh(config) + 1e-9);
  });

  it("reports curtailment when supply exceeds headroom", () => {
    const usable = usableCapacityKwh(config);
    const result = chargeBattery(config, { stateOfChargeKwh: usable * 0.94 }, 50, 1);
    expect(result.curtailedKwh).toBeGreaterThan(0);
  });
});
