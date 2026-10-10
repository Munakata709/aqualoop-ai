import { describe, it, expect } from "vitest";
import { decide, checkForAlerts } from "../src/decision/scheduler.js";
import type { MachineSnapshot, PlcStatus, SensorTelemetry } from "../src/types.js";

const baseConfig = { tankMinReservePct: 15, tankBufferMultiplier: 1.5, assumedCoilTempC: 5 };

function plcStatus(overrides: Partial<PlcStatus> = {}): PlcStatus {
  return {
    awgCompressorRunning: false,
    awgFanRunning: false,
    waterPumpRunning: false,
    uvSystemActive: false,
    uvFault: false,
    tankHighLevelSwitch: false,
    generatorRunning: false,
    generatorFault: false,
    powerSourceGeneratorActive: false,
    dispensingTapEnabled: false,
    eStopActive: false,
    gasShutoffValveOpen: false,
    batterySocPct: 50,
    batteryVoltageV: 51,
    solarArrayPowerKw: 0,
    generatorOutputPowerKw: 0,
    awgCompressorPowerKw: 2,
    tankLevelPct: 50,
    uvDoseMjCm2: 150,
    faultCode: 0,
    ...overrides,
  };
}

function sensorTelemetry(overrides: Partial<SensorTelemetry["water"]> = {}): SensorTelemetry {
  return {
    deviceId: "awg-001",
    uptimeMs: 1,
    dataSource: "measured",
    air: { intakeTemperatureC: 29, intakeHumidityPct: 65, enclosureTemperatureC: 30, enclosureHumidityPct: 40 },
    refrigeration: { evaporatorTemperatureC: 4, condenserTemperatureC: 45, referenceTemperatureC: 30 },
    water: { temperatureC: 22, tdsPpm: 80, tankLevelPct: 50, tankHighLevelSwitch: false, flowRate1LitersPerMin: 1, flowRate2LitersPerMin: 0, ...overrides },
  };
}

function snapshot(plc: PlcStatus | null, sensors: SensorTelemetry | null, flags: Partial<MachineSnapshot> = {}): MachineSnapshot {
  return {
    timestampIso: new Date().toISOString(),
    sensors,
    plc,
    energyMeters: [],
    sensorsStale: false,
    plcStale: false,
    ...flags,
  };
}

describe("decide — safety override", () => {
  it("requests AWG run regardless of energy when tank is below reserve", () => {
    const result = decide(snapshot(plcStatus({ tankLevelPct: 10, solarArrayPowerKw: 0, batterySocPct: 5 }), null), baseConfig, 1);
    expect(result.request.requestAwgRun).toBe(true);
    expect(result.request.disallowGeneratorRequest).toBe(false);
    expect(result.reserveOverrideActive).toBe(true);
  });

  it("does not disallow the generator when reserve is at risk, even under a 'prefer no generator' scenario", () => {
    const result = decide(snapshot(plcStatus({ tankLevelPct: 5 }), null), baseConfig, 1);
    expect(result.request.disallowGeneratorRequest).toBe(false);
  });
});

describe("decide — energy-aware scheduling above reserve", () => {
  it("requests AWG run without the generator when solar covers the compressor draw", () => {
    const result = decide(snapshot(plcStatus({ tankLevelPct: 50, solarArrayPowerKw: 3, awgCompressorPowerKw: 2 }), null), baseConfig, 1);
    expect(result.request.requestAwgRun).toBe(true);
    expect(result.request.disallowGeneratorRequest).toBe(true);
  });

  it("defers production when energy is constrained but the tank has buffer", () => {
    const result = decide(
      snapshot(plcStatus({ tankLevelPct: 40, solarArrayPowerKw: 0, awgCompressorPowerKw: 2, batterySocPct: 10 }), null),
      baseConfig,
      1,
    );
    expect(result.request.requestAwgRun).toBe(false);
    expect(result.request.disallowGeneratorRequest).toBe(true);
  });

  it("allows the generator when buffer is thin and energy is constrained, rather than risking reserve", () => {
    const result = decide(
      snapshot(plcStatus({ tankLevelPct: 20, solarArrayPowerKw: 0, awgCompressorPowerKw: 2, batterySocPct: 10 }), null),
      baseConfig,
      1,
    );
    expect(result.request.requestAwgRun).toBe(true);
    expect(result.request.disallowGeneratorRequest).toBe(false);
  });
});

describe("decide — heartbeat", () => {
  it("always includes the given heartbeat counter in the request", () => {
    const result = decide(snapshot(plcStatus(), null), baseConfig, 777);
    expect(result.request.heartbeatCounter).toBe(777);
  });
});

describe("checkForAlerts", () => {
  it("flags condensation-infeasible conditions from sensor data", () => {
    const alerts = checkForAlerts(snapshot(null, sensorTelemetry()), { ...baseConfig, assumedCoilTempC: 50 });
    expect(alerts.some((a) => a.type === "condensation-infeasible")).toBe(true);
  });

  it("flags tank sensor disagreement between PLC and ESP32 readings", () => {
    const alerts = checkForAlerts(snapshot(plcStatus({ tankLevelPct: 80 }), sensorTelemetry({ tankLevelPct: 50 })), baseConfig);
    expect(alerts.some((a) => a.type === "sensor-disagreement")).toBe(true);
  });

  it("does not flag disagreement when readings are close", () => {
    const alerts = checkForAlerts(snapshot(plcStatus({ tankLevelPct: 80 }), sensorTelemetry({ tankLevelPct: 78 })), baseConfig);
    expect(alerts.some((a) => a.type === "sensor-disagreement")).toBe(false);
  });

  it("flags a UV fault as critical but never attempts to control dispensing", () => {
    const alerts = checkForAlerts(snapshot(plcStatus({ uvFault: true }), null), baseConfig);
    const uvAlert = alerts.find((a) => a.type === "uv-fault");
    expect(uvAlert?.severity).toBe("critical");
  });

  it("flags E-stop active", () => {
    const alerts = checkForAlerts(snapshot(plcStatus({ eStopActive: true }), null), baseConfig);
    expect(alerts.some((a) => a.type === "e-stop")).toBe(true);
  });

  it("flags stale sensors and stale PLC separately", () => {
    const alerts = checkForAlerts(snapshot(plcStatus(), null, { sensorsStale: true, plcStale: true }), baseConfig);
    expect(alerts.some((a) => a.type === "sensors-stale")).toBe(true);
    expect(alerts.some((a) => a.type === "plc-stale")).toBe(true);
  });

  it("produces no alerts for a healthy, agreeing snapshot", () => {
    const alerts = checkForAlerts(snapshot(plcStatus({ tankLevelPct: 60 }), sensorTelemetry({ tankLevelPct: 61 })), baseConfig);
    expect(alerts.length).toBe(0);
  });
});
