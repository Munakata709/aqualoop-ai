/**
 * Runs a full scenario under a given controller and reports aggregate
 * metrics — the basis for the baseline-vs-optimized comparison. Both runs
 * in a comparison must use the same seed and starting state to be a fair
 * "before vs after" test (see runBaselineVsOptimizedComparison below).
 */

import { createSeededRng } from "@/lib/simulation/rng";
import { syntheticWeatherAt } from "@/lib/simulation/weather";
import { buildAwgProfiles, buildAwgStates, buildClusterConfigs, buildClusterStates } from "@/lib/simulation/seedData";
import { stepFleet, type StepScenarioFlags } from "@/lib/simulation/engine";
import { gallonsToLiters, litersToGallons, safeDivide } from "@/lib/units";
import { estimateEmissionsKgCo2 } from "@/lib/physics/generator";
import type { ControllerContext, FleetController } from "@/lib/optimization/types";
import type { AwgState, ClusterConfig, ClusterState, WeatherConditions } from "@/lib/simulation/types";

export interface ScenarioRunOptions {
  seed: number;
  totalHours: number;
  stepHours: number;
  startHourOfDay: number;
  flags?: StepScenarioFlags;
}

export interface ScenarioMetrics {
  strategyLabel: string;
  waterProducedGallons: number;
  electricityConsumedKwh: number;
  kwhPerGallon: number;
  kwhPerLiter: number;
  solarEnergyKwh: number;
  batteryDischargeKwh: number;
  generatorEnergyKwh: number;
  gasFuelMmBtu: number;
  gasFuelCostUsd: number;
  estimatedEmissionsKgCo2: number;
  solarSharePct: number;
  unmetWaterDemandGallons: number;
  reserveViolationSteps: number;
  generatorStarts: number;
  stepsSimulated: number;
}

export function runScenario(controller: FleetController, options: ScenarioRunOptions): ScenarioMetrics {
  const clusters = buildClusterConfigs();
  let clusterStates = buildClusterStates(clusters);
  const awgProfiles = buildAwgProfiles(clusters);
  let awgStates = buildAwgStates(awgProfiles);

  const rng = createSeededRng(options.seed);
  const steps = Math.round(options.totalHours / options.stepHours);

  let waterProducedL = 0;
  let electricityConsumedKwh = 0;
  let solarEnergyKwh = 0;
  let batteryDischargeKwh = 0;
  let generatorEnergyKwh = 0;
  let gasFuelMmBtu = 0;
  let gasFuelCostUsd = 0;
  let unmetWaterDemandL = 0;
  let reserveViolationSteps = 0;
  let generatorStarts = 0;
  let wasGeneratorRunning = false;
  let strategyLabel = "Unknown";

  for (let i = 0; i < steps; i++) {
    const hourOfDay = (options.startHourOfDay + i * options.stepHours) % 24;

    const weatherByCluster: Record<string, WeatherConditions> = {};
    for (const cluster of clusters) {
      weatherByCluster[cluster.id] = syntheticWeatherAt(hourOfDay, undefined, rng);
    }

    const context: ControllerContext = {
      clusters,
      clusterStates,
      awgProfiles,
      awgStates,
      hourOfDay,
      weatherByCluster,
      peakSunHours: options.flags?.peakSunHours,
    };

    const decision = controller(context);
    strategyLabel = decision.strategyName;

    const result = stepFleet(clusters, clusterStates, awgProfiles, awgStates, hourOfDay, options.stepHours, decision, weatherByCluster, options.flags);

    clusterStates = result.clusterStates;
    awgStates = result.awgStates;

    for (const telemetry of Object.values(result.telemetry)) {
      const producedL = telemetry.productionRateLPerHour * options.stepHours;
      waterProducedL += producedL;
      const energyKwh = telemetry.electricalPowerKw * options.stepHours;
      electricityConsumedKwh += energyKwh;
      solarEnergyKwh += telemetry.solarContributionKw * options.stepHours;
      batteryDischargeKwh += telemetry.batteryContributionKw * options.stepHours;
      generatorEnergyKwh += telemetry.generatorContributionKw * options.stepHours;
    }

    for (const state of awgStates) {
      if (state.tankVolumeL < state.minReserveL) reserveViolationSteps += 1;
    }

    for (const cluster of clusters) {
      const clusterState = clusterStates.find((c) => c.id === cluster.id)!;
      if (clusterState.generatorRunning && !wasGeneratorRunning) generatorStarts += 1;
    }
    wasGeneratorRunning = clusterStates.some((c) => c.generatorRunning);

    for (const alert of result.alerts) {
      if (alert.type === "unmet-water-demand") {
        const match = alert.message.match(/shortfall ([\d.]+) L/);
        if (match) unmetWaterDemandL += parseFloat(match[1]);
      }
    }

    // Reconstruct this step's fuel cost/MMBtu from the generator contribution using the
    // same model as lib/physics/generator.ts (kept consistent by construction since both
    // derive from cluster.generator.electricalEfficiency / fuelPricePerMmBtu).
    for (const cluster of clusters) {
      const generatorKwThisStep = Object.values(result.telemetry)
        .filter((t) => cluster.awgIds.includes(t.awgId))
        .reduce((sum, t) => sum + t.generatorContributionKw, 0);
      if (generatorKwThisStep > 0) {
        const electricalEnergyKwh = generatorKwThisStep * options.stepHours;
        const fuelThermalKwh = safeDivide(electricalEnergyKwh, cluster.generator.electricalEfficiency, 0);
        const fuelMmBtu = fuelThermalKwh / 293.07;
        gasFuelMmBtu += fuelMmBtu;
        gasFuelCostUsd += fuelMmBtu * cluster.generator.fuelPricePerMmBtu;
      }
    }
  }

  const totalEnergyForShare = solarEnergyKwh + batteryDischargeKwh + generatorEnergyKwh;

  return {
    strategyLabel,
    waterProducedGallons: litersToGallons(waterProducedL),
    electricityConsumedKwh,
    kwhPerGallon: safeDivide(electricityConsumedKwh, litersToGallons(waterProducedL), 0),
    kwhPerLiter: safeDivide(electricityConsumedKwh, waterProducedL, 0),
    solarEnergyKwh,
    batteryDischargeKwh,
    generatorEnergyKwh,
    gasFuelMmBtu,
    gasFuelCostUsd,
    estimatedEmissionsKgCo2: estimateEmissionsKgCo2(gasFuelMmBtu),
    solarSharePct: safeDivide(solarEnergyKwh, totalEnergyForShare, 0) * 100,
    unmetWaterDemandGallons: litersToGallons(unmetWaterDemandL),
    reserveViolationSteps,
    generatorStarts,
    stepsSimulated: steps,
  };
}

export interface BeforeAfterComparison {
  seed: number;
  baseline: ScenarioMetrics;
  optimized: ScenarioMetrics;
  waterProducedDeltaGallons: number;
  electricityDeltaKwh: number;
  fuelCostDeltaUsd: number;
  kwhPerGallonImprovementPct: number;
}

export function runBaselineVsOptimizedComparison(
  baselineController: FleetController,
  optimizedController: FleetController,
  options: ScenarioRunOptions,
): BeforeAfterComparison {
  const baseline = runScenario(baselineController, options);
  const optimized = runScenario(optimizedController, options);

  const kwhPerGallonImprovementPct =
    baseline.kwhPerGallon > 0 ? ((baseline.kwhPerGallon - optimized.kwhPerGallon) / baseline.kwhPerGallon) * 100 : 0;

  return {
    seed: options.seed,
    baseline,
    optimized,
    waterProducedDeltaGallons: optimized.waterProducedGallons - baseline.waterProducedGallons,
    electricityDeltaKwh: optimized.electricityConsumedKwh - baseline.electricityConsumedKwh,
    fuelCostDeltaUsd: optimized.gasFuelCostUsd - baseline.gasFuelCostUsd,
    kwhPerGallonImprovementPct,
  };
}

export type AwgScheduleStatus = "running" | "standby" | "maintenance" | "fault" | "reserve-priority";

export interface ScheduleTimelineStep {
  step: number;
  hourOfDay: number;
  statusByAwgId: Record<string, AwgScheduleStatus>;
}

/** Runs a scenario and records each AWG's status at every step — the data behind the 24h schedule timeline. */
export function runScheduleTimeline(controller: FleetController, options: ScenarioRunOptions): ScheduleTimelineStep[] {
  const clusters = buildClusterConfigs();
  let clusterStates = buildClusterStates(clusters);
  const awgProfiles = buildAwgProfiles(clusters);
  let awgStates = buildAwgStates(awgProfiles);

  const rng = createSeededRng(options.seed);
  const steps = Math.round(options.totalHours / options.stepHours);
  const timeline: ScheduleTimelineStep[] = [];

  for (let i = 0; i < steps; i++) {
    const hourOfDay = (options.startHourOfDay + i * options.stepHours) % 24;
    const weatherByCluster: Record<string, WeatherConditions> = {};
    for (const cluster of clusters) {
      weatherByCluster[cluster.id] = syntheticWeatherAt(hourOfDay, undefined, rng);
    }

    const context: ControllerContext = { clusters, clusterStates, awgProfiles, awgStates, hourOfDay, weatherByCluster };
    const decision = controller(context);
    const result = stepFleet(clusters, clusterStates, awgProfiles, awgStates, hourOfDay, options.stepHours, decision, weatherByCluster, options.flags);

    const statusByAwgId: Record<string, AwgScheduleStatus> = {};
    for (const state of awgStates) {
      const telemetry = result.telemetry[state.id];
      if (state.operatingMode === "maintenance") statusByAwgId[state.id] = "maintenance";
      else if (telemetry && telemetry.faultCodes.length > 0) statusByAwgId[state.id] = "fault";
      else if (state.tankVolumeL < state.minReserveL) statusByAwgId[state.id] = "reserve-priority";
      else if (telemetry?.running) statusByAwgId[state.id] = "running";
      else statusByAwgId[state.id] = "standby";
    }

    timeline.push({ step: i, hourOfDay, statusByAwgId });
    clusterStates = result.clusterStates;
    awgStates = result.awgStates;
  }

  return timeline;
}

// Re-exported for convenience in UI code that wants to display gallons alongside liters.
export { gallonsToLiters };
export type { AwgState, ClusterConfig, ClusterState };
