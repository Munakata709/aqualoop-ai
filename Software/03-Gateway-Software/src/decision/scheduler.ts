/**
 * Single-machine decision engine — the real-hardware counterpart of the
 * web app's lib/optimization/heuristic.ts, adapted for one AWG and real
 * sensor/PLC inputs instead of a simulated fleet.
 *
 * This produces an ADVISORY request only (see Software/04-PLC-Control-Specification/). It never
 * assumes its decision will be honored — the PLC's own interlocks are
 * always the final authority, especially for reserve protection, which
 * this function treats as advisory-but-urgent, not as something it can
 * force.
 */

import type { MachineSnapshot, DecisionResult, PlcAdvisoryRequest, GatewayAlert } from "../types.js";
import { estimateDewPointC } from "./physics.js";

export interface DecisionConfig {
  tankMinReservePct: number;
  tankBufferMultiplier: number;
  /** Minimum coil temperature the AWG is assumed to run at — used only for the feasibility cross-check alert, not for control. */
  assumedCoilTempC: number;
}

export function decide(
  snapshot: MachineSnapshot,
  config: DecisionConfig,
  heartbeatCounter: number,
): DecisionResult {
  const tankLevelPct = snapshot.plc?.tankLevelPct ?? snapshot.sensors?.water.tankLevelPct ?? 100;
  const belowReserve = tankLevelPct < config.tankMinReservePct;
  const hasBuffer = tankLevelPct > config.tankMinReservePct * config.tankBufferMultiplier;

  const solarKw = snapshot.plc?.solarArrayPowerKw ?? 0;
  const compressorDrawKw = snapshot.plc?.awgCompressorPowerKw ?? 0;
  const batterySoc = snapshot.plc?.batterySocPct ?? 0;
  const solarOrBatteryHealthy = solarKw >= compressorDrawKw || batterySoc > config.tankMinReservePct + 5;

  let requestAwgRun: boolean;
  let disallowGeneratorRequest: boolean;
  let explanation: string;

  if (belowReserve) {
    requestAwgRun = true;
    disallowGeneratorRequest = false;
    explanation =
      "Tank level is below the minimum reserve threshold — requesting the AWG run regardless of energy source. The PLC's own interlocks still govern whether this is actually honored.";
  } else if (solarOrBatteryHealthy) {
    requestAwgRun = true;
    disallowGeneratorRequest = true;
    explanation = "Solar or battery headroom covers the AWG's draw — requesting it run without the generator.";
  } else if (hasBuffer) {
    requestAwgRun = false;
    disallowGeneratorRequest = true;
    explanation =
      "Tank has buffer above reserve and solar/battery can't currently cover the load — deferring production to avoid an unnecessary generator start.";
  } else {
    requestAwgRun = true;
    disallowGeneratorRequest = false;
    explanation = "Tank buffer is thin and energy is constrained — allowing the generator rather than risking the reserve.";
  }

  const request: PlcAdvisoryRequest = {
    requestAwgRun,
    requestPumpRun: tankLevelPct < 95,
    disallowGeneratorRequest,
    requestPowerSourcePreference: 0,
    heartbeatCounter,
  };

  return { request, explanation, reserveOverrideActive: belowReserve };
}

/** Diagnostic (non-control) checks that only produce alerts — never feed back into `decide`. */
export function checkForAlerts(snapshot: MachineSnapshot, config: DecisionConfig): GatewayAlert[] {
  const alerts: GatewayAlert[] = [];
  const nowIso = new Date().toISOString();

  if (snapshot.sensors) {
    const dewPointC = estimateDewPointC(snapshot.sensors.air.intakeTemperatureC, snapshot.sensors.air.intakeHumidityPct);
    if (dewPointC <= config.assumedCoilTempC) {
      alerts.push({
        id: `dewpoint-infeasible-${nowIso}`,
        severity: "info",
        type: "condensation-infeasible",
        message: `Current conditions (${snapshot.sensors.air.intakeTemperatureC.toFixed(1)}°C / ${snapshot.sensors.air.intakeHumidityPct.toFixed(0)}% RH, dew point ${dewPointC.toFixed(1)}°C) don't support condensation at the assumed coil temperature.`,
        createdAtIso: nowIso,
      });
    }
  }

  if (snapshot.plc && snapshot.sensors) {
    const disagreementPct = Math.abs(snapshot.plc.tankLevelPct - snapshot.sensors.water.tankLevelPct);
    if (disagreementPct > 10) {
      alerts.push({
        id: `tank-sensor-disagreement-${nowIso}`,
        severity: "warning",
        type: "sensor-disagreement",
        message: `PLC tank level (${snapshot.plc.tankLevelPct.toFixed(1)}%) and ESP32 tank level (${snapshot.sensors.water.tankLevelPct.toFixed(1)}%) disagree by ${disagreementPct.toFixed(1)} points — matches fault code 5 in INTERLOCK_SPEC.md.`,
        createdAtIso: nowIso,
      });
    }
  }

  if (snapshot.plc?.uvFault) {
    alerts.push({
      id: `uv-fault-${nowIso}`,
      severity: "critical",
      type: "uv-fault",
      message: "PLC reports a UV system fault. Dispensing should be disabled by the PLC's own interlock — this alert is informational, the gateway does not control dispensing.",
      createdAtIso: nowIso,
    });
  }

  if (snapshot.plc?.eStopActive) {
    alerts.push({
      id: `estop-${nowIso}`,
      severity: "critical",
      type: "e-stop",
      message: "E-stop is active.",
      createdAtIso: nowIso,
    });
  }

  if (snapshot.sensorsStale) {
    alerts.push({
      id: `sensors-stale-${nowIso}`,
      severity: "warning",
      type: "sensors-stale",
      message: "No sensor telemetry received recently from the ESP32 node.",
      createdAtIso: nowIso,
    });
  }

  if (snapshot.plcStale) {
    alerts.push({
      id: `plc-stale-${nowIso}`,
      severity: "critical",
      type: "plc-stale",
      message: "PLC has not responded recently. The PLC's own heartbeat timeout should be taking over safe-fallback behavior now.",
      createdAtIso: nowIso,
    });
  }

  return alerts;
}
