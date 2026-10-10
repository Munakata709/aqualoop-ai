# Assumptions

Every number here is a **planning assumption**, not a measured or
contractually-guaranteed value, unless marked "physical constant." Defaults
live in code at the file/line referenced so they can be found and changed.

## Physical constants (not assumptions)

| Constant | Value | Source |
|---|---|---|
| Liters per US gallon | 3.785411784 | Exact definition |
| kWh thermal per MMBtu | 293.07 | Standard conversion |
| Liters per m³ | 1,000 | Definition |

`lib/units/index.ts`

## AWG / water physics

| Assumption | Default | File |
|---|---|---|
| Baseline specific energy | 0.6 kWh/L | `lib/equipment/awgProfiles.ts` (`baseSpecificEnergyKwhPerL`) |
| Reference rating condition | 27°C / 60% RH (~15.6 g/m³ absolute humidity) | `lib/physics/water.ts` (`REFERENCE_ABSOLUTE_HUMIDITY_G_PER_M3`) |
| Equipment overperformance ceiling | 125% of rated hourly rate | `lib/physics/water.ts` (`MAX_OVER_RATED_CAPACITY_FACTOR`) |
| Default evaporator coil temperature | 5°C | `lib/physics/water.ts` (`estimateWaterProductionRate` default) |
| High-ambient specific-energy derate | +2%/°C above 35°C | `lib/physics/water.ts` (`estimateSpecificEnergyKwhPerL`) |
| Rated AWG production | 50 gal/day | `lib/equipment/awgProfiles.ts` (`AQUALOOP_STANDARD_PROFILE`) |
| Rated AWG electrical power | 8 kW | same |
| Dew point formula | Magnus-Tetens (Alduchov & Eskridge, 1996) | `lib/physics/water.ts` |
| Absolute humidity formula | Standard Tetens-based approximation | `lib/physics/water.ts` |

**This is a documented simplified model, not a validated manufacturer
performance curve.** See SIMULATION_VALIDATION.md.

## Solar

| Assumption | Default | File |
|---|---|---|
| Panels per AWG | ~36.25 (≈723 panels / 20 AWGs) | `lib/simulation/seedData.ts` (`PANELS_PER_AWG`) |
| Panel rating | 550 W | same |
| PV aggregate performance factor | 0.8 | same |
| Peak sun hours (planning) | 5 h/day | used throughout as a function default |
| Fleet installed capacity | ~398 kW DC (723 × 550 W) | derived |
| Solar curve shape | Half-sine, sunrise 6:00 / sunset 18:00, normalized to peak-sun-hours | `lib/physics/solar.ts` |

## Battery

| Assumption | Default | File |
|---|---|---|
| Capacity per AWG cluster (4 AWGs) | 120 kWh nominal | `lib/simulation/seedData.ts` (`BATTERY_KWH_PER_AWG`) |
| Fleet total | 600 kWh nominal | derived (5 clusters × 120 kWh) |
| Usable fraction | 90% | `seedData.ts` |
| Round-trip efficiency | 90% | same |
| Minimum reserve | 15% of usable capacity | same |
| Maximum state of charge | 95% of usable capacity | same |
| Charge/discharge power limit | 50% of nominal capacity (kW) | same |

## Natural gas generator

| Assumption | Default | File |
|---|---|---|
| Electrical conversion efficiency | 25% | `lib/simulation/seedData.ts` |
| Natural gas price | $8/MMBtu | same |
| Minimum stable load | 20% of rated power | same |
| Rated power per cluster | 40 kW (10 kW/AWG × 4) | same |
| Emissions factor | 53.06 kg CO₂/MMBtu (EPA default) | `lib/physics/generator.ts` (`estimateEmissionsKgCo2`) |

## Deployment

| Assumption | Default | File |
|---|---|---|
| Clusters | 5 (TAMU-CC, North Beach, Downtown, Flour Bluff, Calallen) | `data/corpus-christi/clusters.ts` |
| AWGs per cluster | 4 | same |
| Total fleet | 20 AWGs, 1,000 gal/day rated | same |
| Cluster coordinates | Approximate, public neighborhood-level — **not** confirmed installation addresses | same |

## Financial defaults (`lib/financial/calc.ts`, `DEFAULT_FINANCIAL_INPUTS`)

| Input | Default |
|---|---|
| AWG capital cost | $45,000 each |
| Solar install cost | $1.20/W |
| Battery install cost | $400/kWh |
| Generator cost | $60,000 total |
| Annual maintenance | $40,000 |
| Water treatment cost | $0.05/gal |
| Land/site cost | $150,000 |
| Monitoring software | $24,000/yr |
| Equipment lifetime | 10 years |
| Discount rate | 6% |
| Water sale price | $0.08/gal |
| Target solar fraction of energy | 70% |

All editable live via `/dashboard/financials`.

## Desalination comparison defaults (`lib/financial/desalination.ts`)

| Input | Default |
|---|---|
| RO electricity intensity | 4 kWh/m³ |
| RO electricity price | $0.12/kWh |
| RO capital cost | $350,000 |
| Intake infrastructure | $120,000 |
| Permitting/site | $80,000 |
| Grid emissions factor | 0.4 kg CO₂/kWh |
| RO land use | 0.5 acres |
| Equipment lifetime | 15 years |

All editable live via `/desalination`.

## What this document does NOT cover

Manufacturer-specific AWG performance curves, real weather-API integration
parameters, and real hardware calibration constants — none of these exist
yet in this codebase. See ROADMAP.md.
