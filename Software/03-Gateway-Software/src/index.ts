import { loadConfig } from "./config.js";
import { GatewayDb } from "./storage/db.js";
import { connectSensorListener } from "./mqtt/sensorListener.js";
import { PlcClient } from "./modbus/plcClient.js";
import { EnergyMeterClient } from "./modbus/energyMeterClient.js";
import { decide, checkForAlerts } from "./decision/scheduler.js";
import { createApiServer } from "./api/server.js";
import { startCloudSyncLoop } from "./cloud/sync.js";
import type { MachineSnapshot, SensorTelemetry, DecisionResult } from "./types.js";

const SENSOR_STALE_AFTER_MS = 20_000;

async function main() {
  const config = loadConfig();
  console.log(`AquaLoop AI gateway starting — device ${config.DEVICE_ID}`);

  const db = new GatewayDb(config.SQLITE_PATH);

  let latestSensors: SensorTelemetry | null = null;
  let lastSensorAtMs = 0;
  let latestSnapshot: MachineSnapshot | null = null;
  let latestDecision: DecisionResult | null = null;
  let heartbeat = 0;

  connectSensorListener(config, (telemetry) => {
    latestSensors = telemetry;
    lastSensorAtMs = Date.now();
  });

  // Deliberately NOT awaited: the PLC may be unreachable at boot (not yet wired,
  // network down, etc.), and that must never block the HTTP API or poll loop from
  // starting. The poll loop below retries the connection every cycle on its own.
  const plc = new PlcClient(config);
  plc.connect().catch((err) => {
    console.error("Could not connect to PLC at startup — will keep retrying every poll cycle.", (err as Error).message);
  });

  // Energy meters share the PLC's Modbus transport (same TCP gateway or RS-485 bus),
  // distinguished by unit ID — see Software/04-PLC-Control-Specification/IO_LIST.md.
  const energyMeters = [
    new EnergyMeterClient(plc.getRawClient(), {
      meterId: "energy-meter-1",
      unitId: config.MODBUS_ENERGY_METER_1_UNIT_ID,
      activePowerRegisterAddress: 0,
      cumulativeEnergyRegisterAddress: 2,
    }),
    new EnergyMeterClient(plc.getRawClient(), {
      meterId: "energy-meter-2",
      unitId: config.MODBUS_ENERGY_METER_2_UNIT_ID,
      activePowerRegisterAddress: 0,
      cumulativeEnergyRegisterAddress: 2,
    }),
  ];

  const decisionConfig = {
    tankMinReservePct: config.TANK_MIN_RESERVE_PCT,
    tankBufferMultiplier: config.TANK_BUFFER_MULTIPLIER,
    assumedCoilTempC: 5,
  };

  async function pollCycle() {
    heartbeat += 1;
    const nowMs = Date.now();
    const sensorsStale = nowMs - lastSensorAtMs > SENSOR_STALE_AFTER_MS;

    let plcStatus = null;
    let plcStale = false;
    try {
      if (!plc.isConnected()) await plc.connect();
      plcStatus = await plc.readStatus();
    } catch (err) {
      plcStale = true;
      console.error("PLC read failed:", (err as Error).message);
    }

    const energyReadings = [];
    for (const meter of energyMeters) {
      try {
        energyReadings.push(await meter.read());
      } catch (err) {
        console.error("Energy meter read failed:", (err as Error).message);
      }
    }

    const snapshot: MachineSnapshot = {
      timestampIso: new Date().toISOString(),
      sensors: sensorsStale ? null : latestSensors,
      plc: plcStatus,
      energyMeters: energyReadings,
      sensorsStale,
      plcStale,
    };
    latestSnapshot = snapshot;
    db.insertSnapshot(snapshot);

    const decision = decide(snapshot, decisionConfig, heartbeat);
    latestDecision = decision;
    console.log(`[decision] ${decision.explanation}`);

    if (plc.isConnected()) {
      try {
        await plc.writeAdvisory(decision.request);
      } catch (err) {
        console.error("PLC advisory write failed:", (err as Error).message);
      }
    }

    for (const alert of checkForAlerts(snapshot, decisionConfig)) {
      db.upsertAlert(alert);
    }
  }

  const pollTimer = setInterval(() => {
    pollCycle().catch((err) => console.error("Poll cycle failed:", err));
  }, config.POLL_INTERVAL_MS);

  const stopCloudSync = startCloudSyncLoop(db, config);

  const app = createApiServer(db, {
    latestSnapshot: () => latestSnapshot,
    latestDecision: () => latestDecision,
  });
  const server = app.listen(config.HTTP_PORT, () => {
    console.log(`Local HTTP API + touchscreen UI listening on :${config.HTTP_PORT}`);
  });

  async function shutdown() {
    console.log("Shutting down gateway...");
    clearInterval(pollTimer);
    stopCloudSync();
    server.close();
    await plc.close();
    db.close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error starting gateway:", err);
  process.exit(1);
});
