# AquaLoop AI

AquaLoop AI is an intelligent operating and energy-management platform for
atmospheric water generators (AWGs). This repository is a working
demonstration: a public marketing/education site plus an "operations
platform" dashboard, both backed by a real physics engine, a real
deterministic optimization scheduler, and a real financial model — not a
static mockup.

**It does not manufacture water from nothing and does not violate
thermodynamic limits.** It improves the scheduling, coordination, energy
supply, and monitoring of compatible AWG systems. See
[ASSUMPTIONS.md](./ASSUMPTIONS.md) for every engineering assumption and
[SIMULATION_VALIDATION.md](./SIMULATION_VALIDATION.md) for what has — and has
not — been validated against real hardware.

## What's simulated vs. real

Everything in this repository runs **without any paid API keys or external
services**. There is no physical hardware connected. Every number on every
page is labeled as **Simulated**, **Forecast**, **Estimated**, **Measured**,
or **User-entered** (see `components/shared/DataSourceBadge.tsx`) — nothing
claims to be a verified real-world result. The physics, the 20-AWG fleet, the
weather, and the optimizer's decisions are all computed live by this
codebase; none of it is pre-recorded or hand-typed into the UI.

## Install & run

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # run the production build
```

Requires Node.js 20+ (built against Node 26) and no environment variables —
the app runs entirely client-side/server-rendered with in-memory state.

Optionally, copy `.env.example` to `.env.local` and set `OPENWEATHER_API_KEY`
(free key at https://openweathermap.org/api) to enable the live Corpus
Christi weather card on `/deployment` and the "Use real weather" button on
`/simulation`. Everything else — including the entire 20-AWG fleet
simulation — works with zero API keys either way.

## Using the simulator

- **Public site** (`/`, `/how-it-works`, `/simulation`, `/hybrid-energy`,
  `/optimization`, `/deployment`, `/desalination`, `/technology`,
  `/impact`, `/about`): explains the technology and lets you experiment with
  a single-AWG "sandbox" via sliders (temperature, humidity, time of day,
  cloud cover, water demand).
- **Operations dashboard** (`/dashboard/*`): a live simulation of 20 AWGs
  across 5 proposed Corpus Christi clusters. Use the play/pause/speed/reset
  controls in the top bar to advance the simulation clock; every dashboard
  page reads from the same shared store (`lib/store/fleetStore.ts`), so the
  fleet overview, AWG detail pages, energy view, and optimization center
  always agree with each other.
- **Scenarios** (`/dashboard/settings`): one-click presets (sunny day,
  cloudy/humid day, hot/dry conditions, emergency demand, generator outage,
  battery unavailable, equipment failure) that change the live simulation's
  inputs — nothing pre-recorded.
- **AI Optimization Center** (`/dashboard/optimization`): pick a strategy
  and see a live-computed 24-hour before/after comparison against the fixed
  "conventional operation" baseline, plus a 20-machine schedule timeline and
  a plain-language reasoning panel.
- **Financial Analytics** (`/dashboard/financials`) and **Desalination
  Comparison** (`/desalination`): fully interactive cost calculators — every
  input is editable, and results (including "this doesn't break even") are
  shown honestly.
- **Reports** (`/dashboard/reports`): exports the current fleet snapshot and
  simulation history as CSV.
- **Live weather** (`/deployment`, `/simulation`): real current + forecast
  conditions for Corpus Christi via OpenWeatherMap, clearly labeled
  "Measured"/"Forecast" and kept separate from the simulation's own
  synthetic weather model (see `lib/weather/openWeatherMap.ts`).

## Running tests

```bash
npm run test        # one-shot (vitest run)
npm run test:watch  # watch mode
```

83 tests cover unit conversions, the AWG water/energy physics model, solar
generation, battery charge/discharge limits and efficiency, the natural gas
generator model, full energy-balance conservation, the fleet simulation
engine (determinism, tank mass balance, fault/outage/comms-loss handling),
the optimization scheduler and baseline-vs-optimized comparison, and the
financial/desalination cost models (including "never fabricate savings" and
"payback is null, not a lie, when the project doesn't break even").

```bash
npm run lint         # ESLint
```

## Modifying assumptions

Every tunable engineering assumption (specific energy, PV performance
factor, battery efficiency, generator efficiency, gas price, financial
defaults, etc.) lives as a named constant or default-input object in
`lib/physics/*`, `lib/financial/calc.ts`, and `lib/financial/desalination.ts`
— see [ASSUMPTIONS.md](./ASSUMPTIONS.md) for the full list with units and
sources. Changing a default there (or via the UI sliders, which don't
persist) is the supported way to explore different scenarios.

## What requires physical hardware

This is a simulator. See [ROADMAP.md](./ROADMAP.md) for what's needed to
connect a real ESP32-S3-based telemetry device, and
[SIMULATION_VALIDATION.md](./SIMULATION_VALIDATION.md) for the gap between
this demo's simplified physics model and a validated manufacturer
performance curve.

## Project structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full breakdown. In short:

```
lib/physics/        Pure functions: water, solar, battery, generator, energy balance
lib/simulation/      Fleet types, seeded RNG, synthetic weather, seed data, step engine
lib/optimization/    Baseline + rule-based heuristic scheduler, strategies, comparison runner
lib/financial/       AquaLoop and desalination cost models
lib/store/           Zustand store driving the live dashboard simulation
lib/sandbox/         Single-AWG interactive demo hook (public pages)
data/                Corpus Christi cluster seed data, AWG equipment profiles
app/(marketing)/     Public site
app/dashboard/        Operations platform
tests/               Vitest unit tests, mirroring lib/
```

## Honest framing

This project avoids claims like "unlimited free water," "100% carbon
neutral," or "guaranteed 50% energy savings." See the Environmental Impact
(`/impact`) and Desalination Comparison (`/desalination`) pages for how this
is enforced in the UI itself, not just in marketing copy.
