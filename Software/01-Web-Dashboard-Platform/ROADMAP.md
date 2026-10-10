# Roadmap

## Real hardware integration (ESP32-S3 telemetry)

The architecture already separates concerns to make this additive, not a
rewrite:

- `lib/simulation/types.ts`'s `AwgTelemetry.dataSource` field already
  distinguishes `simulated` / `forecast` / `measured` / `estimated` /
  `user-entered` — a real telemetry provider just needs to produce records
  with `dataSource: "measured"` in the same shape.
- A real device would carry: a temperature/humidity sensor, a water flow
  meter or calibrated load cell, a tank-level sensor, and an isolated energy
  meter — reporting over a secured, authenticated channel.
- **Hard safety boundary, not a future nice-to-have**: do not connect an
  ESP32 (or any microcontroller) directly to mains electricity or natural
  gas safety controls. Production deployment requires certified power
  equipment, manufacturer-approved AWG control interfaces, and independent
  local safety interlocks. This software's "manual run request" and
  "manual pause" controls (`app/dashboard/awg/[id]/AwgDetailClient.tsx`)
  are simulated commands against simulated state — they do not, and in
  this codebase cannot, actuate real equipment.
- Plan: introduce a `TelemetryProvider` interface with two implementations
  (`SimulatedTelemetryProvider` — what exists today, wrapping
  `lib/simulation/engine.ts` — and `DeviceTelemetryProvider`, which would
  poll or subscribe to real ESP32-S3 devices). The dashboard store
  (`lib/store/fleetStore.ts`) would take a provider instead of calling
  `stepFleet` directly.

## Real manufacturer performance curves

`estimateWaterProductionRate` in `lib/physics/water.ts` and
`lib/equipment/awgProfiles.ts`'s `AwgEquipmentProfile` are already the
seam: a profile could carry a lookup table (temperature × humidity →
production rate, power draw) instead of the current reference-ratio
estimate, with `estimateWaterProductionRate` dispatching to whichever the
profile provides. No caller outside `lib/physics/water.ts` would need to
change.

## Real weather / forecast API

`lib/simulation/weather.ts`'s `syntheticWeatherAt` and
`generateSyntheticForecast` are the seam. Both return the same
`WeatherConditions` shape a real API (NWS, Open-Meteo, etc.) would need to
produce; swapping the implementation behind that same signature is the
whole job. The `dataSource: "forecast"` label already exists in the type
system for this.

## Mathematical (MILP) optimization solver

The current scheduler (`lib/optimization/heuristic.ts`) is the documented
"transparent heuristic fallback" the build spec calls for. A follow-up
could add a mixed-integer linear optimizer (e.g., via a WASM-compiled
solver or a small Python service behind a documented HTTP API) as an
alternative `FleetController`, with the UI's strategy selector showing
which method produced a given schedule (as the spec requires:
"display which method was used").

## Persistence

No database in this pass — scenario state lives in the zustand store and
CSV export (`lib/export/csv.ts`) covers "get my data out." A follow-up could
add SQLite + Prisma (as the build spec suggests) to persist named scenarios,
AWG configuration edits, and historical runs across sessions — currently
everything resets on page reload.

## Mapping

`/deployment` uses a lightweight custom SVG with a linear lat/lon
projection, not a real basemap. A follow-up could swap in MapLibre GL with
OpenStreetMap tiles for real street-level context, keeping the same
cluster/AWG click-through behavior.

## Testing

Unit tests (Vitest) cover the physics/simulation/optimization/financial
logic thoroughly (83 tests). Not yet added: React Testing Library component
tests and Playwright end-to-end tests (both listed in the original build
spec as part of the intended stack). A follow-up should add:

- Component tests for the interactive controls (sliders update derived
  state correctly, AWG detail page controls reject invalid commands).
- An E2E smoke test that walks Home → Simulation → Dashboard → Optimization
  Center and checks the page never renders a client error boundary.

## Authentication / roles

There is no authentication in this MVP, by design — the dashboard is
explicitly labeled "Demonstration environment" throughout
(`DashboardSidebar.tsx`, `DashboardTopBar.tsx`). A follow-up adding real
operator accounts should keep that label until real auth, audit logging,
and role-based access are actually wired in — never silently drop the
disclaimer.
