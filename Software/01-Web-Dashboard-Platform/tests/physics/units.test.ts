import { describe, it, expect } from "vitest";
import {
  gallonsToLiters,
  litersToGallons,
  mmBtuToKwhThermal,
  kwhThermalToMmBtu,
  safeDivide,
  clamp,
} from "@/lib/units";

describe("unit conversions", () => {
  it("converts gallons to liters using the standard factor", () => {
    expect(gallonsToLiters(50)).toBeCloseTo(189.27, 1);
  });

  it("round-trips gallons <-> liters", () => {
    const gallons = 1234.5;
    expect(litersToGallons(gallonsToLiters(gallons))).toBeCloseTo(gallons, 6);
  });

  it("converts MMBtu to thermal kWh using 293.07 kWh/MMBtu", () => {
    expect(mmBtuToKwhThermal(1)).toBeCloseTo(293.07, 2);
  });

  it("round-trips MMBtu <-> kWh thermal", () => {
    expect(kwhThermalToMmBtu(mmBtuToKwhThermal(3.2))).toBeCloseTo(3.2, 6);
  });

  it("safeDivide returns fallback instead of NaN/Infinity on zero denominator", () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
    expect(safeDivide(10, 2)).toBe(5);
  });

  it("clamp bounds a value within [min, max]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});
