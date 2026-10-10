// AquaLoop AI sensor node — Freenove ESP32-S3.
//
// Reads SHT35 (x2), PT100 via MAX31865 (x3), DS18B20 water temperature,
// a TDS/conductivity probe, an analog tank level sensor, two pulse-output
// flow meters, and the independent tank high-level switch (read-only
// visibility, NOT an actuation point), then publishes a JSON telemetry
// packet over MQTT every TELEMETRY_INTERVAL_MS.
//
// This firmware does not drive any relay, valve, compressor, pump, or
// power-transfer output — all actuation is the Industrial PLC's
// responsibility (see edge/plc-spec/). Keeping this node read-only is a
// deliberate safety boundary, not an oversight.

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_MAX31865.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "config.h"
#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy src/secrets.h.example to src/secrets.h and fill in your WiFi/MQTT credentials."
#endif

// ---- Sensor objects ----
Adafruit_SHT31 shtIntake = Adafruit_SHT31();
Adafruit_SHT31 shtEnclosure = Adafruit_SHT31();

Adafruit_MAX31865 rtdEvaporator(MAX31865_CS_EVAPORATOR);
Adafruit_MAX31865 rtdCondenser(MAX31865_CS_CONDENSER);
Adafruit_MAX31865 rtdReference(MAX31865_CS_REFERENCE);

OneWire oneWire(ONEWIRE_PIN);
DallasTemperature waterTempSensor(&oneWire);

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ---- Flow meter pulse counting (ISR-driven) ----
volatile uint32_t flowPulses1 = 0;
volatile uint32_t flowPulses2 = 0;

void IRAM_ATTR onFlowPulse1() { flowPulses1++; }
void IRAM_ATTR onFlowPulse2() { flowPulses2++; }

unsigned long lastTelemetryMs = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to WiFi SSID %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi connected, IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("WiFi connection failed; will retry.");
  }
}

void connectMqtt() {
  if (mqttClient.connected()) return;
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  Serial.printf("Connecting to MQTT broker %s:%d...\n", MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  if (mqttClient.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println("MQTT connected.");
  } else {
    Serial.printf("MQTT connect failed, rc=%d\n", mqttClient.state());
  }
}

float readTdsPpm() {
  int raw = analogRead(TDS_SENSOR_PIN);
  float voltageMv = (raw / ADC_RESOLUTION) * ADC_VREF_MV;
  return (voltageMv / 1000.0) * TDS_VOLTAGE_TO_PPM_FACTOR;
}

float readTankLevelPct() {
  int raw = analogRead(TANK_LEVEL_ANALOG_PIN);
  float pct = (raw / ADC_RESOLUTION) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("AquaLoop AI sensor node starting...");

  Wire.begin();
  if (!shtIntake.begin(SHT35_INTAKE_ADDR)) {
    Serial.println("WARNING: SHT35 (intake) not found at configured address.");
  }
  if (!shtEnclosure.begin(SHT35_ENCLOSURE_ADDR)) {
    Serial.println("WARNING: SHT35 (enclosure) not found at configured address.");
  }

  rtdEvaporator.begin(MAX31865_3WIRE);
  rtdCondenser.begin(MAX31865_3WIRE);
  rtdReference.begin(MAX31865_3WIRE);

  waterTempSensor.begin();

  pinMode(FLOW_METER_1_PIN, INPUT_PULLUP);
  pinMode(FLOW_METER_2_PIN, INPUT_PULLUP);
  pinMode(TANK_HIGH_LEVEL_SWITCH_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_METER_1_PIN), onFlowPulse1, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_METER_2_PIN), onFlowPulse2, FALLING);

  analogReadResolution(12);

  connectWiFi();
  connectMqtt();
}

void publishTelemetry() {
  unsigned long nowMs = millis();
  float elapsedSec = (nowMs - lastTelemetryMs) / 1000.0;
  if (elapsedSec <= 0) elapsedSec = TELEMETRY_INTERVAL_MS / 1000.0;

  uint32_t pulses1 = flowPulses1;
  uint32_t pulses2 = flowPulses2;
  flowPulses1 = 0;
  flowPulses2 = 0;

  float flow1Lpm = (pulses1 / FLOW_METER_PULSES_PER_LITER) / (elapsedSec / 60.0);
  float flow2Lpm = (pulses2 / FLOW_METER_PULSES_PER_LITER) / (elapsedSec / 60.0);

  waterTempSensor.requestTemperatures();

  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["uptimeMs"] = nowMs;
  doc["dataSource"] = "measured";

  JsonObject air = doc["air"].to<JsonObject>();
  air["intakeTemperatureC"] = shtIntake.readTemperature();
  air["intakeHumidityPct"] = shtIntake.readHumidity();
  air["enclosureTemperatureC"] = shtEnclosure.readTemperature();
  air["enclosureHumidityPct"] = shtEnclosure.readHumidity();

  JsonObject refrigeration = doc["refrigeration"].to<JsonObject>();
  refrigeration["evaporatorTemperatureC"] = rtdEvaporator.temperature(PT100_RNOMINAL, PT100_RREF);
  refrigeration["condenserTemperatureC"] = rtdCondenser.temperature(PT100_RNOMINAL, PT100_RREF);
  refrigeration["referenceTemperatureC"] = rtdReference.temperature(PT100_RNOMINAL, PT100_RREF);

  JsonObject water = doc["water"].to<JsonObject>();
  water["temperatureC"] = waterTempSensor.getTempCByIndex(0);
  water["tdsPpm"] = readTdsPpm();
  water["tankLevelPct"] = readTankLevelPct();
  water["tankHighLevelSwitch"] = digitalRead(TANK_HIGH_LEVEL_SWITCH_PIN) == LOW; // read-only visibility
  water["flowRate1LitersPerMin"] = flow1Lpm;
  water["flowRate2LitersPerMin"] = flow2Lpm;

  char payload[640];
  size_t len = serializeJson(doc, payload);
  if (mqttClient.publish(TELEMETRY_TOPIC, payload, len)) {
    Serial.println("Telemetry published.");
  } else {
    Serial.println("Telemetry publish FAILED.");
  }

  lastTelemetryMs = nowMs;
}

void loop() {
  connectWiFi();
  connectMqtt();
  mqttClient.loop();

  unsigned long nowMs = millis();
  if (nowMs - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    publishTelemetry();
  }
}
