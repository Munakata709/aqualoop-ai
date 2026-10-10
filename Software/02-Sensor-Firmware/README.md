# AquaLoop AI — ESP32-S3 Sensor Node Firmware

Real, flashable firmware for the Freenove ESP32-S3 dev board (hardware
parts list item #18). It reads sensors and publishes MQTT telemetry.
**It does not control any equipment** — see the top of `src/main.cpp` and
`Software/04-PLC-Control-Specification/` for why.

## What it reads

| Sensor | Part list item | Interface |
|---|---|---|
| SHT35 ×2 (air intake, enclosure) | #20 | I²C |
| PT100 ×3 (evaporator, condenser, reference) via MAX31865 | #21 | SPI |
| DS18B20 water temperature | #26 | OneWire |
| TDS/conductivity probe | #25 | Analog (ADC) |
| Tank level | #23 | Analog (ADC) |
| Tank high-level switch (read-only mirror) | #23 | Digital input |
| Flow meters ×2 | #22 | Pulse counting (interrupt) |

## Build & flash

Requires [PlatformIO](https://platformio.org/) (CLI or the VS Code
extension). This was **not compiled in the environment that wrote it** —
no ESP32 toolchain was available there. Build and flash it yourself:

```bash
cd Software/02-Sensor-Firmware
cp src/secrets.h.example src/secrets.h   # fill in real WiFi/MQTT credentials
pio run                                   # compile
pio run --target upload                   # flash over USB
pio device monitor                        # view serial logs
```

## Before trusting the data

Two calibration constants in `src/config.h` are **placeholders, not
verified values** for the actual flow meter and TDS probe models in the
finalized parts list:

- `FLOW_METER_PULSES_PER_LITER` — get the real pulses-per-liter constant
  from the specific "Industrial water flow meter" (#22) datasheet once
  that model is chosen.
- `TDS_VOLTAGE_TO_PPM_FACTOR` — get the real calibration curve from the
  specific TDS probe (#25) datasheet; many TDS probes also need
  temperature compensation, which this firmware does not yet implement.

Pin assignments in `config.h` are a documented starting point, not fixed —
adjust them to match the actual board wiring.

## Topic & payload

Publishes JSON to `aqualoop/<DEVICE_ID>/telemetry` (default device id:
`awg-001`) every 5 seconds. See `Software/03-Gateway-Software/src/mqtt/sensorListener.ts`
for the consumer and the expected payload shape.
