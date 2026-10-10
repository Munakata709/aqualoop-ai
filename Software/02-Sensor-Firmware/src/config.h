// AquaLoop AI sensor node — pin assignments and non-secret constants.
// WiFi/MQTT credentials live in secrets.h (gitignored) — see secrets.h.example.
#pragma once

// ---- Device identity ----
#define DEVICE_ID "awg-001"
#define TELEMETRY_TOPIC "aqualoop/" DEVICE_ID "/telemetry"
#define TELEMETRY_INTERVAL_MS 5000UL

// ---- I2C: SHT35 temperature/humidity sensors (x2) ----
// SHT35 shares the SHT3x command set with the Adafruit SHT31 library.
#define SHT35_INTAKE_ADDR 0x44     // near air intake — feeds dew-point estimate
#define SHT35_ENCLOSURE_ADDR 0x45 // inside enclosure — equipment protection monitoring

// ---- SPI: MAX31865 RTD amplifiers for PT100 sensors (x3) ----
// Shared SPI bus (default VSPI pins), separate chip-select lines.
#define MAX31865_CS_EVAPORATOR 10
#define MAX31865_CS_CONDENSER 11
#define MAX31865_CS_REFERENCE 12
#define PT100_RNOMINAL 100.0
#define PT100_RREF 430.0 // MAX31865 breakout reference resistor — confirm against board used

// ---- OneWire: DS18B20 water temperature probe (post-treatment) ----
#define ONEWIRE_PIN 4

// ---- Analog inputs ----
#define TDS_SENSOR_PIN 1       // water conductivity/TDS probe
#define TANK_LEVEL_ANALOG_PIN 2 // analog tank level sensor (0-3.3V mapped to 0-100%)
#define ADC_VREF_MV 3300.0
#define ADC_RESOLUTION 4095.0

// ---- Digital inputs ----
#define FLOW_METER_1_PIN 5 // pulse-output flow meter, line 1
#define FLOW_METER_2_PIN 6 // pulse-output flow meter, line 2
#define TANK_HIGH_LEVEL_SWITCH_PIN 7 // READ-ONLY mirror of the independent hardwired safety switch

// Pulses-per-liter calibration constant for the flow meters — MUST be set
// from the actual flow meter's datasheet before trusting flow readings.
// This placeholder (450 ppl) is a common Hall-effect flow sensor value, NOT
// verified against the specific "Industrial water flow meter" part chosen.
#define FLOW_METER_PULSES_PER_LITER 450.0

// TDS sensor conversion — placeholder linear calibration; replace with the
// specific probe's calibration curve (commonly non-linear with temperature
// compensation) before relying on TDS readings for water-quality decisions.
#define TDS_VOLTAGE_TO_PPM_FACTOR 500.0
