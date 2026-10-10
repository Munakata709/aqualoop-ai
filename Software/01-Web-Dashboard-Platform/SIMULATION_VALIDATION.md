# Simulation Validation

**Status: nothing in this repository has been validated against real
hardware.** This document exists to be honest about that, and to say
exactly what a validation pass would need to check.

## What IS validated

Validated here means "covered by an automated test that would fail if the
logic regressed" — not "matches real-world measurements."

- **Unit conversions** (gallons↔liters, MMBtu↔kWh) — exact, tested.
- **Energy conservation** — `tests/physics/energyBalance.test.ts` proves
  `solarUsed + batteryDischarge + generator + unmet === totalLoad` for every
  dispatch call, including edge cases (generator outage, battery
  unavailable, demand far exceeding supply).
- **Water mass balance** — `tests/physics/water.test.ts` proves the tank
  model never goes negative or over capacity, and reports overflow/deficit
  rather than silently dropping water.
- **Determinism** — `tests/simulation/engine.test.ts` and
  `tests/optimization/compare.test.ts` prove that the same seed produces
  bit-for-bit identical simulation and comparison results, and that
  different seeds produce different weather.
- **Physical plausibility bounds** — production rate is proven to be zero
  when the coil can't be below the dew point, and capped at 125% of rated
  capacity even in ideal conditions.
- **Financial honesty** — `tests/financial/calc.test.ts` proves payback is
  `null` (not a fabricated number) when a configuration never breaks even,
  and that solar capital cost is actually included (not treated as free).

## What is NOT validated

- **The AWG production-rate model itself.** `estimateWaterProductionRate` in
  `lib/physics/water.ts` is a documented simplified model: it scales a
  machine's rated hourly output by the ratio of current absolute humidity
  to a reference condition (27°C/60% RH). This is a reasonable
  first-order approximation, but it is **not** a manufacturer-measured
  performance curve, and no AWG has been run against it to check.
- **The specific-energy derate curve.** The +2%/°C-above-35°C rule is an
  engineering guess, not a fitted curve from compressor test data.
- **The synthetic weather model.** `lib/simulation/weather.ts` produces a
  plausible-looking Corpus Christi diurnal curve, but it is not historical
  or forecast weather data for any specific date.
- **The heuristic optimizer's real-world savings.** The 5%/10%/20%/50%
  kWh-per-liter improvement targets referenced in the build spec are
  **research ambitions**, not results this scheduler has been shown to
  achieve on real equipment. The in-app comparison tool reports whatever
  the simulated scenario actually produces — which varies by seed, strategy,
  and scenario — and should never be read as a universal guarantee.
- **Solar panel and battery electrical specifications.** Panel
  count/wattage, performance factor, and battery efficiency are stated
  planning assumptions (see ASSUMPTIONS.md), not measurements from an
  installed system.

## What a real validation pass would need

1. A real AWG with a logged performance curve (production rate and power
   draw at multiple temperature/humidity points) to replace
   `estimateWaterProductionRate` — the function signature already supports
   swapping in a table lookup instead of the current ratio-based estimate
   (see ROADMAP.md).
2. A real weather API feed (e.g., NWS or Open-Meteo) for the deployment
   region, to replace `syntheticWeatherAt`, and historical data to
   back-test the optimizer's scheduling decisions against.
3. Field-measured specific energy at varying ambient temperatures, to
   replace the linear derate assumption.
4. A/B field data (identical sites running fixed-schedule vs. AI-scheduled
   operation) to validate the optimizer's claimed kWh/gallon improvement —
   this software has never been run on physical equipment.
