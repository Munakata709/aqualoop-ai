import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DEVICE_ID: z.string().default("awg-001"),

  // Modbus transport: either TCP (host:port) or RTU (serial path). TCP is assumed
  // unless MODBUS_SERIAL_PATH is set.
  MODBUS_PLC_HOST: z.string().default("192.168.1.10"),
  MODBUS_PLC_PORT: z.coerce.number().default(502),
  MODBUS_PLC_UNIT_ID: z.coerce.number().default(1),
  MODBUS_SERIAL_PATH: z.string().optional(),
  MODBUS_SERIAL_BAUD: z.coerce.number().default(9600),

  MODBUS_ENERGY_METER_1_UNIT_ID: z.coerce.number().default(2),
  MODBUS_ENERGY_METER_2_UNIT_ID: z.coerce.number().default(3),

  MQTT_BROKER_URL: z.string().default("mqtt://localhost:1883"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),

  POLL_INTERVAL_MS: z.coerce.number().default(5000),
  HEARTBEAT_STALE_AFTER_MS: z.coerce.number().default(30000),

  SQLITE_PATH: z.string().default("./data/aqualoop-gateway.db"),

  HTTP_PORT: z.coerce.number().default(8080),

  CLOUD_INGEST_URL: z.string().optional(),
  CLOUD_INGEST_TOKEN: z.string().optional(),
  CLOUD_SYNC_INTERVAL_MS: z.coerce.number().default(30000),

  // Tank reserve threshold used by the decision engine's safety override —
  // must match (or be more conservative than) the PLC's own reserve logic.
  TANK_MIN_RESERVE_PCT: z.coerce.number().default(15),
  TANK_BUFFER_MULTIPLIER: z.coerce.number().default(1.5),
});

export type GatewayConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid gateway configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}
