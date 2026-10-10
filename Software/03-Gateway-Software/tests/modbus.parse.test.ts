import { describe, it, expect } from "vitest";
import { parsePlcStatus, buildAdvisoryWrites } from "../src/modbus/parse.js";
import { unscale, scaleForWrite } from "../src/modbus/registerMap.js";

describe("unscale / scaleForWrite", () => {
  it("round-trips a scaled value", () => {
    expect(unscale(825, 10)).toBeCloseTo(82.5, 6);
    expect(scaleForWrite(82.5, 10)).toBe(825);
  });

  it("clamps writes to a 16-bit unsigned range", () => {
    expect(scaleForWrite(-5, 1)).toBe(0);
    expect(scaleForWrite(100000, 1)).toBe(65535);
  });
});

describe("parsePlcStatus", () => {
  const discreteInputs = [true, false, true, false, false, true, false, false, false, true, false, false];
  const inputRegisters = [825, 512, 250, 0, 480, 723, 1200, 0];

  it("maps discrete inputs by name per the register map", () => {
    const status = parsePlcStatus(discreteInputs, inputRegisters);
    expect(status.awgCompressorRunning).toBe(true);
    expect(status.awgFanRunning).toBe(false);
    expect(status.waterPumpRunning).toBe(true);
    expect(status.tankHighLevelSwitch).toBe(true);
    expect(status.dispensingTapEnabled).toBe(true);
    expect(status.eStopActive).toBe(false);
  });

  it("unscales input registers to physical units", () => {
    const status = parsePlcStatus(discreteInputs, inputRegisters);
    expect(status.batterySocPct).toBeCloseTo(82.5, 6);
    expect(status.batteryVoltageV).toBeCloseTo(51.2, 6);
    expect(status.solarArrayPowerKw).toBeCloseTo(2.5, 6);
    expect(status.generatorOutputPowerKw).toBe(0);
    expect(status.awgCompressorPowerKw).toBeCloseTo(4.8, 6);
    expect(status.tankLevelPct).toBeCloseTo(72.3, 6);
    expect(status.uvDoseMjCm2).toBeCloseTo(120, 6);
    expect(status.faultCode).toBe(0);
  });

  it("defaults missing registers to 0/false rather than throwing", () => {
    const status = parsePlcStatus([], []);
    expect(status.awgCompressorRunning).toBe(false);
    expect(status.batterySocPct).toBe(0);
  });
});

describe("buildAdvisoryWrites", () => {
  it("produces the documented coil and holding-register addresses", () => {
    const plan = buildAdvisoryWrites({
      requestAwgRun: true,
      requestPumpRun: false,
      disallowGeneratorRequest: true,
      requestPowerSourcePreference: 0,
      heartbeatCounter: 42,
    });

    expect(plan.coils).toEqual([
      { address: 0, value: true },
      { address: 1, value: false },
      { address: 2, value: true },
    ]);
    expect(plan.holdingRegisters).toEqual([
      { address: 0, value: 42 },
      { address: 1, value: 0 },
    ]);
  });
});
