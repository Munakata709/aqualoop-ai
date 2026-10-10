# AquaLoop AI — PLC Interlock Specification (v1)

**This is a logic specification for a certified controls engineer to
implement in the PLC's native programming environment (ladder logic,
structured text, or function block diagram). It is not executable code,
has not been reviewed by a controls engineer, and must not be treated as a
ready-to-deploy safety program.** It describes the *intent* of every
interlock so the implementation can be checked against it.

## Hard interlocks (must be implemented independent of any software/gateway signal)

These must function even if the Raspberry Pi, the gateway software, and the
network are all powered off or disconnected. Prefer hardwired relay logic or
PLC logic that does **not** depend on communications being alive.

1. **Tank high-level cutoff.** The independent high-level float switch
   (`Tank_High_Level_Switch`) must directly interrupt the fill path
   (pump and/or AWG collection routing) at the hardware/PLC level. This must
   not depend on the Modbus link, the gateway, or any software decision.
2. **E-stop.** Engaging the E-stop must immediately de-energize the
   compressor, pump, UV system, and (via the transfer switch) cut
   non-essential loads, following whatever sequencing the generator and
   inverter manufacturers specify for a safe shutdown. This must be a
   hardwired safety circuit, not a Modbus-mediated one.
3. **Gas shutoff.** The generator's gas supply must have its own
   mechanical/electromechanical shutoff independent of PLC logic,
   per the generator manufacturer's installation requirements and
   applicable gas code. The PLC may read the valve state (`Gas_Shutoff_Valve_Open`)
   but must not be the sole path to closing it in an emergency.
4. **UV-gated dispensing.** `Dispensing_Tap_Enabled` must only be true when
   the UV system reports a validated dose (`UV_Dose` above the
   manufacturer- and regulation-specified minimum) **and** no UV fault is
   latched **and** the water-quality sensors (TDS/conductivity, temperature)
   are within configured bounds. Any one of these failing must immediately
   disable dispensing, latched until manually cleared after inspection —
   never auto-cleared by a timeout or by the gateway.

## Advisory interlocks (gateway requests, PLC may override)

5. **AWG run request.** `Request_AWG_Run` (coil 00001) should only be
   honored if, in addition to the hard interlocks above:
   - The tank is not at its configured full threshold.
   - No AWG fault is active.
   - Minimum off-time since the last compressor stop has elapsed (protects
     the compressor from short-cycling — a typical value is 3–5 minutes,
     to be set per the AWG module's datasheet).
6. **Pump run request.** `Request_Pump_Run` (coil 00002) similarly gated by
   tank level and UV/treatment readiness.
7. **Generator-avoidance preference.** `Disallow_Generator_Request`
   (coil 00003) should be honored **except** when the tank level has
   dropped below the configured emergency reserve threshold — at that
   point the PLC's own logic should permit the generator regardless of the
   gateway's preference, consistent with "safety/reserve protection always
   outranks cost optimization."
8. **Power-source preference.** `Request_Power_Source_Preference`
   (holding register 40002) only influences which source the transfer
   switch *prefers* when multiple sources are viable; actual switching
   sequencing, minimum generator runtime once started, and make-before-break
   / break-before-make safety timing are entirely the PLC's and transfer
   switch's responsibility, per their manufacturer documentation.

## Communications failure behavior

9. **Heartbeat timeout.** If `Heartbeat_Counter` (holding register 40001)
   has not incremented for more than a configured timeout (recommended:
   30 seconds, 6× the gateway's 5-second poll interval), the PLC must:
   - Stop honoring `Request_AWG_Run` and `Request_Pump_Run` as "yes" —
     treat a stale/unreachable gateway as if both were false.
   - Fall back to whatever the site's documented "safe idle" state is
     (commonly: AWG off, pump off, power source on its most recently
     stable configuration).
   - Raise a `Fault_Code` indicating "gateway communications lost" so it's
     visible in telemetry history once the link is restored.
10. This must **not** cause the generator to start or dispensing to enable
    — loss of communication should always move the system toward *less*
    activity, never more.

## Fault code table (input register 30008) — to be finalized with the controls engineer

| Code | Meaning |
|---|---|
| 0 | No fault |
| 1 | AWG compressor fault |
| 2 | UV system fault |
| 3 | Generator fault |
| 4 | Gas supply fault |
| 5 | Tank level sensor fault / disagreement with high-level switch |
| 6 | Gateway communications lost (heartbeat timeout) |
| 7 | E-stop active |
| 8+ | Reserved — extend per final hardware selection |

## What this document deliberately does not do

It does not specify ladder rung numbers, timer preset values, PLC
brand/model function blocks, or wiring diagrams — those depend on the final
PLC, inverter, generator, and transfer-switch models, which per the parts
list are still "provisional" / "subject to electrical design." This
document is the behavioral contract those implementation details must
satisfy.
