# Architecture

## Layering

```
UI (app/, components/)
   │ reads/writes
   ▼
lib/store/fleetStore.ts   (zustand — dashboard-only live state)
   │ calls
   ▼
lib/optimization/          (decides WHAT should run)
   │ calls
   ▼
lib/simulation/engine.ts   (advances the fleet ONE step — pure function)
   │ calls
   ▼
lib/physics/                (water, solar, battery, generator, energy balance)
```

Each layer only depends on the ones below it. `lib/physics` has zero
dependencies on simulation, optimization, or UI — it's pure, unit-tested
math. This is what makes a real manufacturer performance curve or a real
forecast API a drop-in replacement later (see ROADMAP.md) instead of a
rewrite.

## The physics layer (`lib/physics/`)

Each file is a small set of pure functions with no side effects:

- `water.ts` — dew point (Magnus-Tetens), absolute humidity, the AWG
  production-rate model, specific energy (with a high-ambient derate), and
  the water tank mass-balance function.
- `solar.ts` — installed capacity and an hourly clear-sky irradiance shape
  (half-sine, normalized so its daily integral matches a configured
  peak-sun-hours value) — not a flat 24h average.
- `battery.ts` — state of charge, charge/discharge within power and
  capacity limits, round-trip efficiency.
- `generator.ts` — fuel consumption and cost from electrical output and
  efficiency; minimum stable load; emissions estimate.
- `energyBalance.ts` — the dispatch order (solar → battery → generator →
  unmet load) that **every** caller uses to turn a requested electrical load
  into actual source contributions. This is the one place conservation is
  enforced: `solarUsed + batteryDischarge + generator + unmet === totalLoad`
  holds for every call (see `tests/physics/energyBalance.test.ts`).

## The simulation layer (`lib/simulation/`)

- `types.ts` — the typed fleet model (AWG, cluster, telemetry, alerts,
  scenario). Every telemetry record carries a `dataSource` field.
- `rng.ts` — a seeded mulberry32 PRNG. Nothing in the simulation or
  optimizer uses `Math.random()` — this is what makes "same seed → same
  results" true (see `tests/simulation/engine.test.ts` and
  `tests/optimization/compare.test.ts`).
- `weather.ts` — a documented synthetic diurnal weather curve (sinusoidal
  temperature/humidity, small seeded noise), clearly not measured or
  forecast data.
- `seedData.ts` — builds the 20-AWG / 5-cluster Corpus Christi fleet from
  `data/corpus-christi/clusters.ts` and `lib/equipment/awgProfiles.ts`.
- `engine.ts` — `stepFleet(...)`: the one function that advances the whole
  fleet by one time step. It takes pre-computed weather (so the optimizer
  can see the *same* weather it's scheduling against — weather generation
  is the caller's responsibility, not the engine's) and a `FleetControlDecision`
  (which AWGs the controller wants running), then:
  1. Computes each AWG's requested production/power from the physics layer.
  2. Resolves the cluster's energy dispatch via `energyBalance.ts`.
  3. Apportions the dispatch result back across running AWGs (a documented
     simplification — see "Known simplifications" below).
  4. Updates tank volumes via mass balance, surfacing overflow/deficit.
  5. Produces alerts for faults and unmet demand.

  `stepFleet` is a pure function of its arguments — no `Date.now()`, no
  global state — so it's safe to call during server-side rendering and
  produces identical output given identical inputs.

## The optimization layer (`lib/optimization/`)

This is **not** machine learning and does not call an external AI service.
It's a deterministic, explainable, priority-ordered rule engine:

1. **Safety override** — any AWG below its minimum water reserve is
   scheduled to run regardless of weather or energy cost, before anything
   else runs.
2. **Humidity-aware deferral** (Strategy A/B) — flexible (non-urgent) AWGs
   in a poor-efficiency window get deferred, but only if their tank has
   buffer above reserve.
3. **Fleet-level prioritization** (Strategy F) — remaining flexible AWGs are
   sorted by current efficiency, health score, and restart count.
4. **Energy-budget gating** (Strategy C/D) — if the strategy respects an
   energy budget, flexible AWGs are greedily scheduled against the
   solar+battery budget before allowing (or refusing) a generator start.

Every decision carries a plain-language explanation string
(`FleetControlDecision.explanations`), shown in the dashboard's AI reasoning
panel. `lib/optimization/strategies.ts` defines the switchable named
strategies (Fixed Schedule, Weather-Aware, Solar-First, Lowest Operating
Cost, Minimum Emissions, Maximum Reliability, Balanced) as parameter
combinations of this same engine — not seven separate solvers.

`lib/optimization/compare.ts` runs the **same seed, same starting state**
through two controllers (baseline vs. optimized) and reports the delta —
this is the only way the app is allowed to display a "savings" number.

## The financial layer (`lib/financial/`)

`calc.ts` (AquaLoop) and `desalination.ts` (seawater RO) are independent
discounted-cash-flow models sharing the same unit-conversion helpers. Solar
capital/maintenance cost is included in both CAPEX and OPEX — it is never
treated as free. `calculateFinancials` returns `paybackYears: null` (not a
fabricated number) when the configuration never breaks even.

## State management

- **Public pages**: local `useState`/`useMemo` only (`lib/sandbox/useAwgSandbox.ts`).
  No global store needed — these are single-user, single-AWG sandboxes.
- **Dashboard**: `lib/store/fleetStore.ts`, a zustand store holding the live
  20-AWG simulation, the running clock (`useFleetClock`), the selected
  strategy, and scenario flags. All dashboard pages subscribe to slices of
  this one store so they never disagree with each other.

## Known simplifications (documented, not hidden)

- **Per-machine energy apportionment**: when a cluster's energy dispatch
  can't fully cover requested load, the shortfall is applied as a uniform
  "served fraction" across all running AWGs in that cluster, rather than a
  finer-grained per-machine curtailment policy. See `stepFleet`'s comment in
  `lib/simulation/engine.ts`. This only matters when solar+battery+generator
  together can't cover demand — an explicit stress scenario, not normal
  operation.
- **Fleet map**: a lightweight custom SVG with a linear lat/lon projection,
  not a GIS basemap (no MapLibre/Leaflet dependency). Locations are
  explicitly labeled "approximate" and "proposed."
- **Optimization scheduler**: a transparent heuristic, not a mixed-integer
  solver. The build spec allows this as the documented fallback when no
  solver is wired in (see `lib/optimization/heuristic.ts`'s header comment).
- **Persistence**: scenario save/load is not backed by a database (no
  Prisma/SQLite in this pass) — CSV export (`lib/export/csv.ts`) covers the
  "get my data out" requirement. See ROADMAP.md.
