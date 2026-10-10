import type { SensorTelemetry } from "../types.js";

/**
 * Parses and validates a raw MQTT payload string into SensorTelemetry.
 * Pure and unit-testable — returns null (never throws) on malformed input,
 * since a malformed sensor packet should be logged and dropped, not crash
 * the gateway.
 */
export function parseSensorTelemetry(raw: string): SensorTelemetry | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(obj)) return null;
  if (typeof obj.deviceId !== "string") return null;
  if (typeof obj.uptimeMs !== "number") return null;
  if (!isRecord(obj.air) || !isRecord(obj.refrigeration) || !isRecord(obj.water)) return null;

  const air = obj.air;
  const refrigeration = obj.refrigeration;
  const water = obj.water;

  const numericFields = [
    air.intakeTemperatureC,
    air.intakeHumidityPct,
    air.enclosureTemperatureC,
    air.enclosureHumidityPct,
    refrigeration.evaporatorTemperatureC,
    refrigeration.condenserTemperatureC,
    refrigeration.referenceTemperatureC,
    water.temperatureC,
    water.tdsPpm,
    water.tankLevelPct,
    water.flowRate1LitersPerMin,
    water.flowRate2LitersPerMin,
  ];
  if (numericFields.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  if (typeof water.tankHighLevelSwitch !== "boolean") return null;

  return {
    deviceId: obj.deviceId,
    uptimeMs: obj.uptimeMs,
    dataSource: "measured",
    air: {
      intakeTemperatureC: air.intakeTemperatureC as number,
      intakeHumidityPct: air.intakeHumidityPct as number,
      enclosureTemperatureC: air.enclosureTemperatureC as number,
      enclosureHumidityPct: air.enclosureHumidityPct as number,
    },
    refrigeration: {
      evaporatorTemperatureC: refrigeration.evaporatorTemperatureC as number,
      condenserTemperatureC: refrigeration.condenserTemperatureC as number,
      referenceTemperatureC: refrigeration.referenceTemperatureC as number,
    },
    water: {
      temperatureC: water.temperatureC as number,
      tdsPpm: water.tdsPpm as number,
      tankLevelPct: water.tankLevelPct as number,
      tankHighLevelSwitch: water.tankHighLevelSwitch,
      flowRate1LitersPerMin: water.flowRate1LitersPerMin as number,
      flowRate2LitersPerMin: water.flowRate2LitersPerMin as number,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
