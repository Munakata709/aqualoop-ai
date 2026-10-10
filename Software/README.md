# AquaLoop AI — Software

Four subsystems, each self-contained. Read them in this order to understand
the full stack from the product demo down to the physical machine.

| # | Subsystem | What it is | Status |
|---|---|---|---|
| [01](./01-Web-Dashboard-Platform) | **Web Dashboard Platform** | The public product site and operations dashboard — live simulation, AI optimization center, financial calculator, desalination comparison. This is what a buyer or investor clicks through to see AquaLoop AI work. | Fully built and tested — 83 automated tests, clean production build |
| [02](./02-Sensor-Firmware) | **Sensor Firmware** | Firmware for the ESP32-S3 sensor node mounted on the physical AWG unit — reads temperature, humidity, water flow, tank level, and water quality. | Code complete; not yet compiled/flashed to hardware |
| [03](./03-Gateway-Software) | **Gateway Software** | The on-site "brain": a Raspberry Pi service that reads the sensors and the PLC, makes scheduling decisions, and syncs to the cloud dashboard. | Fully built and tested — 24 automated tests, verified running end-to-end |
| [04](./04-PLC-Control-Specification) | **PLC Control Specification** | The safety contract for the Industrial PLC that actually operates the equipment (compressor, pump, UV system, generator transfer switch). | Specification document — implementation requires a certified controls engineer, by design (see below) |

## How the four subsystems fit together

```
   Water tank, compressor,   ┌─────────────────────────┐
   pump, UV, generator  ───► │   04  Industrial PLC     │ ◄── owns all real actuation
   transfer switch           │  (spec in this repo,    │     and every hard safety
                              │   program is external)  │     interlock
                              └────────────┬────────────┘
                                           │ Modbus (read status,
                                           │ write advisory requests)
                              ┌────────────▼────────────┐
   Sensors (temp, humidity,  │  03  Gateway Software    │ ──► cloud sync ──► 01 Web
   flow, tank level, TDS) ──►│  (Raspberry Pi)         │                    Dashboard
      via MQTT               └────────────▲────────────┘                    Platform
                                           │ MQTT
                              ┌────────────┴────────────┐
                              │  02  Sensor Firmware     │
                              │  (ESP32-S3)              │
                              └──────────────────────────┘
```

**01** is also a complete standalone product on its own — the simulation,
AI scheduler, and financial models inside it run entirely in software and
don't require **02**, **03**, or **04** to demo the product's value.
**02–04** are what turn that simulation into a real physical machine.

## Why 04 is a specification, not code

The PLC is the only subsystem with direct authority over gas, mains power,
and dispensed water — it is the thing that must never be told what to do
by unvalidated software. **03** (gateway software) only ever writes
*advisory* values the PLC's own ladder logic is free to ignore; it cannot
open a gas valve, start the generator, or enable water dispensing on its
own. **04** documents exactly what the PLC's program must enforce
(register map + interlock behavior), for a certified controls engineer to
implement and validate against the real equipment — see
[`04-PLC-Control-Specification/INTERLOCK_SPEC.md`](./04-PLC-Control-Specification/INTERLOCK_SPEC.md)
for the full reasoning.

## Quick links for each subsystem

- [01-Web-Dashboard-Platform/README.md](./01-Web-Dashboard-Platform/README.md) — install, run, test
- [02-Sensor-Firmware/README.md](./02-Sensor-Firmware/README.md) — build & flash
- [03-Gateway-Software/README.md](./03-Gateway-Software/README.md) — install, run, test, deploy
- [04-PLC-Control-Specification/REGISTER_MAP.md](./04-PLC-Control-Specification/REGISTER_MAP.md) — the Modbus contract
