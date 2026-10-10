# AquaLoop AI — PLC Physical I/O List (v1)

Maps the finalized hardware parts list to PLC I/O channels. Point counts
and signal types (dry contact, 4-20mA, 0-10V, etc.) must be confirmed
against the actual datasheets once specific models are selected — this is
a planning-level list, not a wiring diagram.

## Digital inputs (to PLC)

| Signal | Source component | Typical signal type |
|---|---|---|
| Tank high-level switch | Water tank level sensor + independent high-level switch (#23) | Dry contact (normally closed recommended) |
| E-stop | Panel-mounted E-stop (not itemized separately — add to enclosure BOM) | Dry contact, hardwired safety circuit |
| UV fault | UV-C disinfection system (#7) + UV intensity/dose monitoring (#27) | Dry contact or Modbus, per UV controller model |
| Generator fault | Natural gas generator (#15) | Dry contact, per generator controller |
| Gas shutoff valve position | Approved gas connection/regulator/shutoff (#34) | Dry contact (limit switch) |

## Digital outputs (from PLC)

| Signal | Destination component |
|---|---|
| Compressor enable | AWG module refrigeration compressor (#3) |
| Fan enable | Air intake fans (#2) |
| Pump enable | Sanitary water pump (#11) |
| UV lamp enable | UV-C disinfection system (#7) |
| Dispensing tap solenoid/enable | Stainless-steel dispensing tap (#10) |
| Transfer switch control | Automatic transfer / hybrid power control equipment (#16) |
| Gas valve control (if PLC-mediated, subject to code) | Gas shutoff valve (#34) — confirm whether local code requires this to be PLC-independent |

## Analog / Modbus inputs (to PLC, or read by PLC from sub-devices)

| Signal | Source component |
|---|---|
| Battery SOC, voltage | LiFePO₄ battery BMS (#14) |
| Solar array power | Hybrid solar inverter (#13) |
| Generator output power | Natural gas generator controller (#15) |
| AWG compressor power | AWG module or dedicated CT, cross-check against energy meters (#24) |
| Tank level (redundant to ESP32's reading) | Water tank level sensor (#23) |
| UV dose/intensity | UV intensity/dose monitoring (#27) |

## Devices read directly by the Node.js gateway (not through the PLC)

Per the agreed architecture, these are polled by the gateway over their own
Modbus interfaces, not routed through the PLC:

| Signal | Source component | Interface |
|---|---|---|
| Electrical energy (production/consumption) | Industrial Modbus electrical energy meter ×2 (#24) | Modbus RTU/TCP |
| Ambient/air-intake temperature & humidity | SHT35 ×2 (#20), via ESP32-S3 | I²C → ESP32 → MQTT |
| Evaporator/condenser/reference temperatures | PT100 ×3 (#21), via ESP32-S3 + RTD amplifier | SPI (MAX31865) → ESP32 → MQTT |
| Water flow rate | Industrial water flow meter ×2 (#22), via ESP32-S3 | Pulse/Modbus → ESP32 → MQTT |
| Water TDS/conductivity | Water conductivity/TDS sensor (#25), via ESP32-S3 | Analog → ESP32 → MQTT |
| Water temperature (post-treatment) | Water temperature sensor (#26), via ESP32-S3 | Digital (OneWire) → ESP32 → MQTT |

## Notes

- Items #12 (solar panels), #17 (PLC itself), #28 (LTE/Wi-Fi module), #29
  (touchscreen), #30–#35 (enclosure, wiring, protection, gas/water
  balance-of-plant) are structural/electrical/mechanical and don't have a
  software I/O point of their own beyond what's listed above.
- #19 (Raspberry Pi 5 gateway) and #18 (ESP32-S3) are the two compute nodes
  this software stack targets — see `Software/03-Gateway-Software/` and
  `Software/02-Sensor-Firmware/`.
