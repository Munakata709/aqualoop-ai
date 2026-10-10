import { describe, it, expect } from "vitest";
import { parseSensorTelemetry } from "../src/mqtt/parse.js";

function validPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    deviceId: "awg-001",
    uptimeMs: 12345,
    dataSource: "measured",
    air: { intakeTemperatureC: 29.1, intakeHumidityPct: 64, enclosureTemperatureC: 31, enclosureHumidityPct: 40 },
    refrigeration: { evaporatorTemperatureC: 4.2, condenserTemperatureC: 45, referenceTemperatureC: 30 },
    water: {
      temperatureC: 22,
      tdsPpm: 85,
      tankLevelPct: 60,
      tankHighLevelSwitch: false,
      flowRate1LitersPerMin: 1.2,
      flowRate2LitersPerMin: 0,
    },
    ...overrides,
  });
}

describe("parseSensorTelemetry", () => {
  it("parses a well-formed payload", () => {
    const result = parseSensorTelemetry(validPayload());
    expect(result).not.toBeNull();
    expect(result?.deviceId).toBe("awg-001");
    expect(result?.air.intakeTemperatureC).toBe(29.1);
    expect(result?.water.tankHighLevelSwitch).toBe(false);
  });

  it("returns null for invalid JSON instead of throwing", () => {
    expect(parseSensorTelemetry("{not json")).toBeNull();
  });

  it("returns null when a required numeric field is missing", () => {
    const payload = JSON.parse(validPayload());
    delete payload.water.tdsPpm;
    expect(parseSensorTelemetry(JSON.stringify(payload))).toBeNull();
  });

  it("returns null when a numeric field is NaN or non-finite", () => {
    const payload = JSON.parse(validPayload());
    payload.air.intakeTemperatureC = "not-a-number";
    expect(parseSensorTelemetry(JSON.stringify(payload))).toBeNull();
  });

  it("returns null when top-level structure is missing", () => {
    expect(parseSensorTelemetry(JSON.stringify({ deviceId: "x" }))).toBeNull();
  });
});
