/**
 * Core simulation engine: advances the fleet by one time step.
 *
 * Pure and deterministic given the same snapshot, decision, weather, and
 * rng state — no UI dependencies. This is what both the live dashboard and
 * the baseline-vs-optimized comparison runner call. Energy accounting goes
 * through lib/physics/energyBalance.ts, which enforces conservation; this
 * file is only responsible for wiring per-AWG production into per-cluster
 * electrical load and apportioning the dispatch result back out.
 */

import { clamp, safeDivide } from "@/lib/units";
import { estimateDewPointC, estimateSpecificEnergyKwhPerL, estimateWaterProductionRate, electricalPowerKw, energyIntensityKwhPerL, nextTankVolumeL } from "@/lib/physics/water";
import { solarPowerKw } from "@/lib/physics/solar";
import { resolveEnergyDispatch } from "@/lib/physics/energyBalance";
import type {
  AwgProfile,
  AwgState,
  AwgTelemetry,
  ClusterConfig,
  ClusterState,
  SimAlert,
  WeatherConditions,
} from "@/lib/simulation/types";

export interface FleetControlDecision {
  /** AWG ids the controller wants running this step (subject to physical/safety constraints). */
  runningAwgIds: Set<string>;
  /** Human-readable explanation per AWG id, shown in the AI reasoning panel. */
  explanations: Record<string, string>;
  strategyName: string;
}

export interface StepScenarioFlags {
  allowGenerator?: boolean;
  allowBattery?: boolean;
  /** Cluster ids whose AWGs should be forced to report a fault this step (equipment-failure scenario). */
  forceFaultClusterIds?: string[];
  /** Cluster ids with simulated comms loss (telemetry goes stale, no control honored). */
  communicationLostClusterIds?: string[];
  /** Multiplier applied to waterDemandLPerDay for sudden-demand scenarios. 1 = normal. */
  demandMultiplier?: number;
  peakSunHours?: number;
}

export interface StepResult {
  clusterStates: ClusterState[];
  awgStates: AwgState[];
  telemetry: Record<string, AwgTelemetry>;
  alerts: SimAlert[];
  weatherByCluster: Record<string, WeatherConditions>;
}

const AUX_LOAD_KW_PER_CLUSTER = 0.5; // controls, sensors, networking — a small fixed parasitic load

export function stepFleet(
  clusters: ClusterConfig[],
  clusterStates: ClusterState[],
  awgProfiles: AwgProfile[],
  awgStates: AwgState[],
  hourOfDay: number,
  stepHours: number,
  decision: FleetControlDecision,
  inputWeatherByCluster: Record<string, WeatherConditions>,
  flags: StepScenarioFlags = {},
): StepResult {
  const nextClusterStates: ClusterState[] = [];
  const nextAwgStates: AwgState[] = [];
  const telemetry: Record<string, AwgTelemetry> = {};
  const alerts: SimAlert[] = [];
  const resolvedWeatherByCluster: Record<string, WeatherConditions> = {};
  // Derived from simulated hour-of-day, not wall-clock time, so stepFleet stays a pure
  // function of its inputs (reproducible given the same seed, and safe to call during
  // server-side prerendering). The fixed epoch is arbitrary — only relative time matters.
  const nowIso = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + hourOfDay * 3_600_000).toISOString();

  const awgStateById = new Map(awgStates.map((s) => [s.id, s]));
  const awgProfileById = new Map(awgProfiles.map((p) => [p.id, p]));

  for (const cluster of clusters) {
    const clusterState = clusterStates.find((c) => c.id === cluster.id)!;
    const communicationLost = flags.communicationLostClusterIds?.includes(cluster.id) ?? false;
    const forceFault = flags.forceFaultClusterIds?.includes(cluster.id) ?? false;

    const weather = { ...inputWeatherByCluster[cluster.id], ...clusterState.weatherOverride };
    resolvedWeatherByCluster[cluster.id] = weather;

    // --- Per-AWG production & requested load (before energy dispatch) ---
    const perAwgResults: Array<{
      awgId: string;
      profile: AwgProfile;
      state: AwgState;
      running: boolean;
      requestedPowerKw: number;
      productionRateLPerHour: number;
      dewPointC: number;
      specificEnergyKwhPerL: number;
      faultCodes: string[];
    }> = [];

    for (const awgId of cluster.awgIds) {
      const profile = awgProfileById.get(awgId)!;
      const state = awgStateById.get(awgId)!;
      const dewPointC = estimateDewPointC(weather.temperatureC, weather.relativeHumidityPct);
      const faultCodes: string[] = forceFault ? ["FLT-SENSOR-001"] : [];

      const wantsToRun =
        decision.runningAwgIds.has(awgId) &&
        state.operatingMode !== "manual-pause" &&
        state.operatingMode !== "maintenance" &&
        state.healthStatus !== "offline";

      const tankHasRoom = state.tankVolumeL < state.tankCapacityL - 1e-6;
      const running = wantsToRun && tankHasRoom && faultCodes.length === 0 && !communicationLost;

      let productionRateLPerHour = 0;
      let requestedPowerKw = 0;
      const specificEnergyKwhPerL = estimateSpecificEnergyKwhPerL(weather.temperatureC);

      if (running) {
        const result = estimateWaterProductionRate(
          { temperatureC: weather.temperatureC, relativeHumidityPct: weather.relativeHumidityPct },
          profile.ratedProductionLPerDay,
        );
        productionRateLPerHour = result.productionRateLPerHour;
        requestedPowerKw = electricalPowerKw(productionRateLPerHour, specificEnergyKwhPerL);
      }

      perAwgResults.push({ awgId, profile, state, running, requestedPowerKw, productionRateLPerHour, dewPointC, specificEnergyKwhPerL, faultCodes });
    }

    const totalRequestedKw = perAwgResults.reduce((sum, r) => sum + r.requestedPowerKw, 0);
    const peakSunHours = flags.peakSunHours ?? 5;
    const solarAvailableKw = communicationLost
      ? 0
      : solarPowerKw({ ...cluster.solar, cloudCoverFactor: weather.cloudCoverFactor }, hourOfDay, peakSunHours);

    const dispatch = resolveEnergyDispatch({
      requestedLoadKw: totalRequestedKw,
      auxLoadKw: AUX_LOAD_KW_PER_CLUSTER,
      solarAvailableKw,
      batteryConfig: cluster.battery,
      batteryState: clusterState.batteryState,
      generatorConfig: cluster.generator,
      stepHours,
      allowGenerator: (flags.allowGenerator ?? true) && !communicationLost,
      allowBattery: flags.allowBattery ?? true,
    });

    // Fraction of requested load actually served — applied uniformly across running AWGs.
    // (A finer-grained per-machine curtailment policy is a documented future refinement; see ROADMAP.md.)
    const servedFraction = clamp(
      safeDivide(
        dispatch.totalLoadKw - dispatch.unmetKw - AUX_LOAD_KW_PER_CLUSTER,
        totalRequestedKw,
        zeroRequestFallback(totalRequestedKw),
      ),
      0,
      1,
    );

    const demandMultiplier = flags.demandMultiplier ?? 1;
    const clusterDemandLPerStep = (cluster.waterDemandLPerDay * demandMultiplier * stepHours) / 24;
    const perAwgDemandLPerStep = safeDivide(clusterDemandLPerStep, cluster.awgIds.length, 0);

    for (const r of perAwgResults) {
      const actualProductionRateLPerHour = r.productionRateLPerHour * servedFraction;
      const actualPowerKw = r.requestedPowerKw * servedFraction;
      const producedL = actualProductionRateLPerHour * stepHours;
      const energyKwh = actualPowerKw * stepHours;

      const tankResult = nextTankVolumeL(r.state.tankVolumeL, producedL, perAwgDemandLPerStep, 0, r.state.tankCapacityL);

      const runningAwgCount = Math.max(1, perAwgResults.filter((x) => x.running).length);
      const solarShareKw = safeDivide(dispatch.solarUsedKw, runningAwgCount, 0) * (r.running ? 1 : 0);
      const batteryShareKw = safeDivide(dispatch.batteryDischargeKw, runningAwgCount, 0) * (r.running ? 1 : 0);
      const generatorShareKw = safeDivide(dispatch.generatorKw, runningAwgCount, 0) * (r.running ? 1 : 0);
      const unmetShareKw = safeDivide(dispatch.unmetKw, runningAwgCount, 0) * (r.running ? 1 : 0);

      let healthScore = r.state.healthScore;
      if (r.faultCodes.length > 0) healthScore = clamp(healthScore - 15, 0, 100);
      else healthScore = clamp(healthScore + 0.2, 0, 100);

      const newAlerts = buildAlertsForAwg(r, tankResult, nowIso);
      alerts.push(...newAlerts);

      nextAwgStates.push({
        ...r.state,
        tankVolumeL: tankResult.volumeL,
        totalWaterProducedTodayL: r.state.totalWaterProducedTodayL + producedL,
        totalEnergyConsumedTodayKwh: r.state.totalEnergyConsumedTodayKwh + energyKwh,
        lastSeenAt: communicationLost ? r.state.lastSeenAt : nowIso,
        activeFaultCodes: r.faultCodes,
        healthScore,
      });

      telemetry[r.awgId] = {
        timestamp: nowIso,
        awgId: r.awgId,
        dataSource: "simulated",
        temperatureC: weather.temperatureC,
        relativeHumidityPct: weather.relativeHumidityPct,
        dewPointC: r.dewPointC,
        productionRateLPerHour: actualProductionRateLPerHour,
        electricalPowerKw: actualPowerKw,
        energyIntensityKwhPerL: energyIntensityKwhPerL(energyKwh, producedL),
        tankLevelL: tankResult.volumeL,
        solarContributionKw: solarShareKw,
        batteryContributionKw: batteryShareKw,
        generatorContributionKw: generatorShareKw,
        unmetKw: unmetShareKw,
        running: r.running,
        faultCodes: r.faultCodes,
      };
    }

    nextClusterStates.push({
      ...clusterState,
      batteryState: dispatch.nextBatteryState,
      generatorRunning: dispatch.generatorKw > 0,
      generatorConsecutiveRunSteps: dispatch.generatorKw > 0 ? clusterState.generatorConsecutiveRunSteps + 1 : 0,
      communicationLost,
    });
  }

  return {
    clusterStates: nextClusterStates,
    awgStates: nextAwgStates,
    telemetry,
    alerts,
    weatherByCluster: resolvedWeatherByCluster,
  };
}

function zeroRequestFallback(totalRequestedKw: number): number {
  // If nothing was requested, "served fraction" is meaningless — treat as fully served (0/0 -> 1).
  return totalRequestedKw === 0 ? 1 : 0;
}

function buildAlertsForAwg(
  r: { awgId: string; faultCodes: string[] },
  tankResult: { overflowL: number; deficitL: number },
  nowIso: string,
): SimAlert[] {
  const alerts: SimAlert[] = [];
  if (r.faultCodes.length > 0) {
    alerts.push({
      id: `${r.awgId}-fault-${nowIso}`,
      equipmentId: r.awgId,
      severity: "critical",
      type: "equipment-fault",
      message: `${r.awgId} reported fault code(s): ${r.faultCodes.join(", ")}.`,
      createdAtIso: nowIso,
    });
  }
  if (tankResult.deficitL > 0.01) {
    alerts.push({
      id: `${r.awgId}-deficit-${nowIso}`,
      equipmentId: r.awgId,
      severity: "warning",
      type: "unmet-water-demand",
      message: `${r.awgId} could not fully meet local water demand this step (shortfall ${tankResult.deficitL.toFixed(1)} L).`,
      createdAtIso: nowIso,
    });
  }
  return alerts;
}
