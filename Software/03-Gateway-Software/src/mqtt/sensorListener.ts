import mqtt, { type MqttClient } from "mqtt";
import type { GatewayConfig } from "../config.js";
import type { SensorTelemetry } from "../types.js";
import { parseSensorTelemetry } from "./parse.js";

export type SensorTelemetryHandler = (telemetry: SensorTelemetry) => void;

export function connectSensorListener(config: GatewayConfig, onTelemetry: SensorTelemetryHandler): MqttClient {
  const client = mqtt.connect(config.MQTT_BROKER_URL, {
    username: config.MQTT_USERNAME,
    password: config.MQTT_PASSWORD,
    reconnectPeriod: 2000,
  });

  const topic = `aqualoop/${config.DEVICE_ID}/telemetry`;

  client.on("connect", () => {
    client.subscribe(topic, (err) => {
      if (err) console.error(`Failed to subscribe to ${topic}:`, err);
      else console.log(`Subscribed to ${topic}`);
    });
  });

  client.on("message", (receivedTopic, payload) => {
    if (receivedTopic !== topic) return;
    const parsed = parseSensorTelemetry(payload.toString());
    if (parsed) onTelemetry(parsed);
    else console.warn("Received malformed sensor telemetry payload, ignoring.");
  });

  client.on("error", (err) => console.error("MQTT error:", err));

  return client;
}
