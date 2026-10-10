/**
 * AquaLoop AI scheduler — transparent, deterministic, rule-based heuristic.
 *
 * This is NOT a machine-learning model and does not call any external AI
 * service. It is the documented "heuristic fallback" referenced in the
 * build spec (section 8, Layer 4): a priority-ordered rule engine that
 * mirrors the strategies in section 9 (humidity-aware scheduling,
 * solar-first dispatch, battery reserve protection, generator-start
 * avoidance, fleet-level prioritization). Every decision carries a
 * human-readable explanation (Layer 5).
 *
 * Safety always wins: an AWG whose tank has dropped to its minimum reserve
 * is scheduled to run regardless of energy budget or weather, before any
 * cost/efficiency logic runs.
 */

import { safeDivide } from "@/lib/units";
import { estimateSpecificEnergyKwhPerL, estimateWaterProductionRate, electricalPowerKw } from "@/lib/physics/water";
import { solarPowerKw } from "@/lib/physics/solar";
import { socFraction } from "@/lib/physics/battery";
import type { FleetControlDecision } from "@/lib/simulation/engine";
import type { ControllerContext, StrategyConfig } from "@/lib/optimization/types";

const BATTERY_DISCHARGE_MARGIN = 0.05; // allow discharge budget only when SOC is this far above min reserve
const RESERVE_BUFFER_MULTIPLIER = 1.5; // tank must be this far above min reserve before deferring is allowed
const HUMIDITY_EFFICIENCY_THRESHOLD = 0.5; // below 50% of rated hourly rate counts as a "poor" window

interface AwgCandidate {
  awgId: string;
  ratedPowerKw: number;
  requestedPowerKw: number;
  efficiencyRatio: number;
  feasible: boolean;
  eligible: boolean;
  reserveViolation: boolean;
  healthScore: number;
  consecutiveRestarts: number;
}

export function decideFleetControl(context: ControllerContext, strategy: StrategyConfig): FleetControlDecision {
  const runningAwgIds = new Set<string>();
  const explanations: Record<string, string> = {};
  const peakSunHours = context.peakSunHours ?? 5;

  const profileById = new Map(context.awgProfiles.map((p) => [p.id, p]));
  const stateById = new Map(context.awgStates.map((s) => [s.id, s]));

  for (const cluster of context.clusters) {
    const clusterState = context.clusterStates.find((c) => c.id === cluster.id)!;
    const weather = context.weatherByCluster[cluster.id];
    const specificEnergy = estimateSpecificEnergyKwhPerL(weather.temperatureC);

    const candidates: AwgCandidate[] = cluster.awgIds.map((awgId) => {
      const profile = profileById.get(awgId)!;
      const state = stateById.get(awgId)!;
      const production = estimateWaterProductionRate(
        { temperatureC: weather.temperatureC, relativeHumidityPct: weather.relativeHumidityPct },
        profile.ratedProductionLPerDay,
      );
      const ratedLPerHour = profile.ratedProductionLPerDay / 24;
      const efficiencyRatio = production.feasible ? safeDivide(production.productionRateLPerHour, ratedLPerHour, 0) : 0;
      const requestedPowerKw = production.feasible
        ? electricalPowerKw(production.productionRateLPerHour, specificEnergy)
        : 0;

      const eligible =
        state.operatingMode === "automatic" &&
        state.healthStatus !== "offline" &&
        state.tankVolumeL < state.tankCapacityL - 1e-6;
      const reserveViolation = state.tankVolumeL < state.minReserveL;

      return {
        awgId,
        ratedPowerKw: profile.ratedPowerKw,
        requestedPowerKw,
        efficiencyRatio,
        feasible: production.feasible,
        eligible,
        reserveViolation,
        healthScore: state.healthScore,
        consecutiveRestarts: state.consecutiveRestarts,
      };
    });

    // --- Safety override: reserve-critical AWGs always run if eligible, before anything else. ---
    const forced = candidates.filter((c) => c.eligible && c.reserveViolation);
    for (const c of forced) {
      runningAwgIds.add(c.awgId);
      explanations[c.awgId] = "Production increased to maintain the site's minimum emergency water reserve.";
    }
    const forcedPowerKw = forced.reduce((sum, c) => sum + c.requestedPowerKw, 0);

    // --- Flexible candidates: everything else eligible. ---
    let flexible = candidates.filter((c) => c.eligible && !c.reserveViolation);

    // Strategy A/B: humidity-aware deferral when the AWG has buffer above reserve.
    if (strategy.humidityAware) {
      const nextFlexible: AwgCandidate[] = [];
      for (const c of flexible) {
        const state = stateById.get(c.awgId)!;
        const hasBuffer = state.tankVolumeL > state.minReserveL * RESERVE_BUFFER_MULTIPLIER;
        const isPoorWindow = !c.feasible || c.efficiencyRatio < HUMIDITY_EFFICIENCY_THRESHOLD;
        if (isPoorWindow && hasBuffer) {
          explanations[c.awgId] = c.feasible
            ? `${c.awgId} paused because predicted atmospheric conditions yield low water-per-kWh right now; production is shifted to a better window while reserve allows.`
            : `${c.awgId} paused because current conditions do not support condensation (dew point not below the coil temperature).`;
          continue;
        }
        nextFlexible.push(c);
      }
      flexible = nextFlexible;
    }

    // Strategy F: fleet-level prioritization — healthier, more reliable machines get energy budget first.
    flexible = [...flexible].sort((a, b) => {
      const scoreA = a.efficiencyRatio * 100 + a.healthScore * 0.5 - a.consecutiveRestarts * 10;
      const scoreB = b.efficiencyRatio * 100 + b.healthScore * 0.5 - b.consecutiveRestarts * 10;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.awgId.localeCompare(b.awgId); // deterministic tie-break
    });

    // Strategy C/D: solar-first / generator-start avoidance via an explicit energy budget.
    if (strategy.respectEnergyBudget) {
      const solarNowKw = solarPowerKw(
        { ...cluster.solar, cloudCoverFactor: weather.cloudCoverFactor },
        context.hourOfDay,
        peakSunHours,
      );
      const soc = socFraction(cluster.battery, clusterState.batteryState);
      const batteryAvailableKw =
        soc > cluster.battery.minReserveFraction + BATTERY_DISCHARGE_MARGIN ? cluster.battery.dischargePowerLimitKw : 0;

      let remainingBudgetKw = Math.max(0, solarNowKw + batteryAvailableKw - forcedPowerKw);

      for (const c of flexible) {
        if (c.requestedPowerKw <= remainingBudgetKw) {
          runningAwgIds.add(c.awgId);
          explanations[c.awgId] = `${c.awgId} scheduled — solar/battery budget covers its ${c.requestedPowerKw.toFixed(1)} kW request without starting the generator.`;
          remainingBudgetKw -= c.requestedPowerKw;
        } else if (strategy.allowGeneratorForFlexible) {
          runningAwgIds.add(c.awgId);
          explanations[c.awgId] = `${c.awgId} scheduled using generator backup — solar/battery budget for this cluster is already committed.`;
        } else {
          explanations[c.awgId] = `${c.awgId} deferred — running it now would require an unplanned generator start, and the reserve buffer allows waiting for more solar or battery headroom.`;
        }
      }
    } else {
      for (const c of flexible) {
        runningAwgIds.add(c.awgId);
        explanations[c.awgId] = explanations[c.awgId] ?? `${c.awgId} scheduled under the "${strategy.label}" strategy.`;
      }
    }
  }

  return { runningAwgIds, explanations, strategyName: strategy.label };
}
