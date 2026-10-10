# AquaLoop AI — Raspberry Pi Gateway

Real, deployable Node.js/TypeScript service for the Raspberry Pi 5 /
industrial Linux gateway (hardware parts list item #19). This is the
"brain" of the on-site machine: it ingests sensor telemetry (via MQTT from
the ESP32-S3), polls the PLC and energy meters (via Modbus), runs a
single-machine scheduling decision, serves a local HTTP API + touchscreen
UI, and syncs to the cloud dashboard.

**It never actuates equipment directly.** Every write to the PLC is an
*advisory request* on specific registers the PLC's own ladder logic is free
to override — see `../04-PLC-Control-Specification/`. There is no code path in this package
that can open a gas valve, start the generator, or enable water dispensing
by itself.

## What's real vs. what needs hardware to prove

Real and tested in this environment (24 passing Vitest tests, 0 ESLint
errors, clean `tsc` build):

- Modbus register parsing and advisory-write construction
  (`src/modbus/parse.ts`) — pure functions, fully unit tested against the
  exact register map in `../04-PLC-Control-Specification/REGISTER_MAP.md`.
- MQTT sensor-telemetry parsing/validation (`src/mqtt/parse.ts`).
- The single-machine decision engine (`src/decision/scheduler.ts`) —
  reserve-override safety logic, solar/battery-aware scheduling, and
  diagnostic alerting, all unit tested including the "reserve protection
  always outranks cost optimization" rule.
- The full service actually runs: verified end-to-end that it starts, the
  HTTP API and touchscreen page come up immediately even when the PLC and
  MQTT broker are unreachable, and it shuts down cleanly on SIGINT/SIGTERM.

Not yet provable without real hardware:

- Whether the register map matches a real PLC program (it can't — no PLC
  has been programmed against this spec yet, see `../04-PLC-Control-Specification/`).
- Whether the energy meter register layout (`src/modbus/energyMeterClient.ts`)
  matches whatever specific meter model gets purchased — it's a documented
  generic assumption (two 32-bit floats), flagged as needing verification.
- Real-world MQTT/Modbus network behavior on an actual Pi + ESP32 + PLC
  setup (latency, packet loss, serial bus contention).

## Install & run

```bash
cd Software/03-Gateway-Software
npm install
cp .env.example .env   # edit MODBUS_PLC_HOST, MQTT_BROKER_URL, etc.
npm run build
npm start
```

For development (auto-reload):

```bash
npm run dev
```

The touchscreen UI is served at `http://<pi-address>:8080/` (default port,
see `.env`). Point the touchscreen's browser at that address in kiosk mode.

## Testing

```bash
npm test        # 24 Vitest unit tests
npm run lint     # ESLint, 0 errors
npx tsc -p tsconfig.json   # type-check / build
```

## Deploying as a system service

1. Copy this directory to the Pi, e.g. `/opt/aqualoop-gateway`.
2. `npm install && npm run build` on the Pi (native deps like
   `better-sqlite3` must build for the Pi's actual architecture — this was
   only built/tested on the development machine, not an ARM Raspberry Pi).
3. Create a dedicated `aqualoop` system user and `data/` directory it can
   write to.
4. Copy `aqualoop-gateway.service` to `/etc/systemd/system/`, adjust paths,
   then:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now aqualoop-gateway
   sudo journalctl -u aqualoop-gateway -f
   ```
5. Install and configure an MQTT broker on the Pi (e.g. `sudo apt install
   mosquitto` and set a username/password matching `.env`) — this gateway
   is an MQTT *client*, not a broker; the ESP32 needs something to publish
   to.

## Configuration

See `.env.example` for every option (Modbus host/port or serial path,
energy meter unit IDs, MQTT broker URL, poll interval, SQLite path, HTTP
port, optional cloud sync URL/token, tank reserve thresholds). All of it is
validated at startup via `src/config.ts` (Zod) — the process exits with a
clear error rather than running with silently-invalid config.

## Project layout

```
src/
  config.ts              Env/config validation (Zod)
  types.ts                Shared types for this package
  modbus/
    registerMap.ts        Mirrors ../04-PLC-Control-Specification/REGISTER_MAP.md
    parse.ts               Pure register <-> typed-data translation (tested)
    plcClient.ts            Actual Modbus I/O against the PLC
    energyMeterClient.ts    Actual Modbus I/O against the energy meters
  mqtt/
    parse.ts                Pure MQTT-payload parsing (tested)
    sensorListener.ts        Actual MQTT subscription
  decision/
    physics.ts               Self-contained dew-point helper
    scheduler.ts              The decision engine (tested)
  storage/db.ts              SQLite (better-sqlite3) persistence
  api/server.ts               Local HTTP API + serves public/ (touchscreen UI)
  cloud/sync.ts                Store-and-forward sync to the cloud dashboard
  index.ts                     Wires it all together
public/index.html              Touchscreen UI (vanilla HTML/JS, polls the local API)
tests/                          Vitest unit tests for every pure module above
```
