# AquaLoop AI — PLC Modbus Register Map (v1)

**This is a specification, not code.** It defines the contract between the
Node.js gateway (`Software/03-Gateway-Software/`) and the Industrial PLC's own ladder
logic / structured text program, which must be implemented and validated by
a certified controls engineer against the actual AWG module, generator,
inverter, and UV system datasheets. The gateway never actuates equipment
directly — it only reads PLC status and writes *advisory request* values
that the PLC's own interlocks are free to override or ignore.

Generic Modbus addressing is used (not tied to a specific PLC brand) so this
map can be configured on any Modbus-TCP or Modbus-RTU capable PLC. All
addresses are 1-based "PLC-style" addresses (subtract 1 for 0-based
Modbus wire addresses, per the usual convention).

## Discrete Inputs (PLC → Gateway, read-only status bits)

| Address | Name | Meaning |
|---|---|---|
| 10001 | `AWG_Compressor_Running` | Refrigeration compressor is energized |
| 10002 | `AWG_Fan_Running` | Intake/evaporator fans running |
| 10003 | `Water_Pump_Running` | Sanitary pump running |
| 10004 | `UV_System_Active` | UV-C disinfection lamp energized |
| 10005 | `UV_Fault` | UV system fault (dose/intensity below threshold, lamp failure, etc.) |
| 10006 | `Tank_High_Level_Switch` | **Hardwired independent high-level float switch** — not a software reading; this bit mirrors the switch's own state for visibility only. The switch's cutoff action must be wired directly to the pump/fill control, not routed through software. |
| 10007 | `Generator_Running` | Natural gas generator running |
| 10008 | `Generator_Fault` | Generator fault (overspeed, fuel, etc.) |
| 10009 | `Power_Source_Generator_Active` | Transfer switch is currently sourcing from the generator (0 = solar/battery, 1 = generator) |
| 10010 | `Dispensing_Tap_Enabled` | PLC has enabled the dispensing tap — **must be gated by validated UV dose and water-quality interlocks**, never by the gateway |
| 10011 | `E_Stop_Active` | Emergency stop is engaged |
| 10012 | `Gas_Shutoff_Valve_Open` | Gas supply shutoff valve state |

## Input Registers (PLC → Gateway, read-only analog telemetry, 16-bit unsigned)

| Address | Name | Scale | Units |
|---|---|---|---|
| 30001 | `Battery_State_Of_Charge` | ÷10 | % (0–100.0) |
| 30002 | `Battery_Voltage` | ÷10 | V |
| 30003 | `Solar_Array_Power` | ÷100 | kW |
| 30004 | `Generator_Output_Power` | ÷100 | kW |
| 30005 | `AWG_Compressor_Power` | ÷100 | kW |
| 30006 | `Water_Tank_Level` | ÷10 | % (0–100.0), PLC's own level transducer |
| 30007 | `UV_Dose` | ÷10 | mJ/cm² |
| 30008 | `Fault_Code` | — | 0 = no fault; see `INTERLOCK_SPEC.md` for the enumerated fault table |

## Coils (Gateway → PLC, read/write, 1-bit "advisory requests")

| Address | Name | Meaning |
|---|---|---|
| 00001 | `Request_AWG_Run` | Gateway's scheduling decision: it would like the AWG to run. **The PLC decides whether to honor this** — it must still enforce tank-full lockout, fault lockout, E-stop, and minimum runtime/cycle limits independently. |
| 00002 | `Request_Pump_Run` | Gateway requests the pump run (e.g., to move water into the tank). Must remain gated by tank level and UV readiness in the PLC, not the gateway. |
| 00003 | `Disallow_Generator_Request` | Gateway asserts this during a "generator outage" scenario or cost-optimization decision to *prefer* not starting the generator. The PLC may override this if the tank is below the emergency reserve level (see `INTERLOCK_SPEC.md`). |
| 00004 | `Alarm_Acknowledge` | Gateway writes 1 momentarily to acknowledge a PLC-raised alarm; PLC clears the corresponding fault latch per its own logic. |

## Holding Registers (Gateway → PLC, read/write, 16-bit)

| Address | Name | Meaning |
|---|---|---|
| 40001 | `Heartbeat_Counter` | Gateway increments this every poll cycle (every 5s by default). **The PLC must implement a dead-man's-switch timeout**: if this value stops incrementing for more than a configured period (recommend 30s), the PLC must treat the gateway as offline and fall back to its own safe default behavior (e.g., stop honoring `Request_AWG_Run`, hold last safe power-source state) — never continue acting on a stale advisory value indefinitely. |
| 40002 | `Request_Power_Source_Preference` | Enum: `0` = Auto/Solar-first (default), `1` = Prefer battery, `2` = Allow generator for testing. This is a *preference* only — the PLC's own transfer-switch sequencing, minimum generator runtime, and safety interlocks always take precedence. |

## Design rules this map follows

1. **Nothing the gateway writes can, by itself, start the generator, open the
   gas valve, or enable dispensing.** Every write is a request/preference
   the PLC logic is free to refuse.
2. **The high-level tank switch and E-stop are hardwired safety signals**,
   not software-mediated ones — the register bits above exist for
   visibility/logging only.
3. **A communications failure must fail safe**, via the heartbeat timeout —
   the system must not get stuck "running" because the gateway crashed
   mid-request.
4. Scaled integers (not floats) are used for Modbus analog values, per
   common industrial practice — the gateway is responsible for the ÷10/÷100
   conversion on read.
