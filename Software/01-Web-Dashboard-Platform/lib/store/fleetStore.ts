"use client";

/**
 * Global store for the AquaLoop Operations Dashboard.
 *
 * Owns the live 20-AWG simulation: fleet/cluster/AWG state, the running
 * clock, the selected optimization strategy, and scenario flags (generator
 * outage, equipment failure, comms loss, demand surge). All dashboard pages
 * read from this single store so the fleet overview, AWG detail pages, and
 * optimization center always agree with each other.
 */

import { useEffect } from "react";
import { create } from "zustand";
import { createSeededRng, type SeededRng } from "@/lib/simulation/rng";
import { syntheticWeatherAt } from "@/lib/simulation/weather";
import { buildAwgProfiles, buildAwgStates, buildClusterConfigs, buildClusterStates } from "@/lib/simulation/seedData";
import { stepFleet, type FleetControlDecision, type StepScenarioFlags } from "@/lib/simulation/engine";
import { decideFleetControl } from "@/lib/optimization/heuristic";
import { baselineController } from "@/lib/optimization/baseline";
import { STRATEGIES } from "@/lib/optimization/strategies";
import type { StrategyId } from "@/lib/optimization/types";
import type {
  AwgProfile,
  AwgState,
  AwgTelemetry,
  ClusterConfig,
  ClusterState,
  SimAlert,
  WeatherConditions,
} from "@/lib/simulation/types";

export interface FleetHistoryPoint {
  step: number;
  hourOfDay: number;
  totalWaterL: number;
  totalEnergyKwh: number;
  solarKw: number;
  batteryKw: number;
  generatorKw: number;
  unmetKw: number;
  avgTankFillPct: number;
}

const MAX_HISTORY_POINTS = 48;

export type ScenarioPresetId =
  | "sunny-coastal"
  | "cloudy-humid"
  | "hot-dry"
  | "emergency-demand"
  | "generator-outage"
  | "battery-low"
  | "equipment-failure"
  | "custom";

interface FleetStoreState {
  seed: number;
  rng: SeededRng;
  clusters: ClusterConfig[];
  clusterStates: ClusterState[];
  awgProfiles: AwgProfile[];
  awgStates: AwgState[];
  telemetry: Record<string, AwgTelemetry>;
  weatherByCluster: Record<string, WeatherConditions>;
  alerts: SimAlert[];
  lastDecision: FleetControlDecision | null;
  history: FleetHistoryPoint[];

  hourOfDay: number;
  simStepsElapsed: number;
  stepHours: number;
  isRunning: boolean;
  speedMultiplier: number;

  strategyId: StrategyId;
  activePreset: ScenarioPresetId;
  scenarioFlags: StepScenarioFlags;

  tick: () => void;
  play: () => void;
  pause: () => void;
  reset: (seed?: number) => void;
  setSpeed: (multiplier: number) => void;
  setStrategy: (id: StrategyId) => void;
  applyPreset: (preset: ScenarioPresetId) => void;
  acknowledgeAlert: (alertId: string) => void;
  setAwgOperatingMode: (awgId: string, mode: AwgState["operatingMode"]) => void;
}

function buildController(strategyId: StrategyId) {
  if (strategyId === "fixed-schedule") return baselineController;
  return (context: Parameters<typeof decideFleetControl>[0]) => decideFleetControl(context, STRATEGIES[strategyId]);
}

function freshFleet(seed: number) {
  const clusters = buildClusterConfigs();
  const clusterStates = buildClusterStates(clusters);
  const awgProfiles = buildAwgProfiles(clusters);
  const awgStates = buildAwgStates(awgProfiles);
  return { clusters, clusterStates, awgProfiles, awgStates, rng: createSeededRng(seed) };
}

const INITIAL_SEED = 1234;
const initial = freshFleet(INITIAL_SEED);

export const useFleetStore = create<FleetStoreState>((set, get) => ({
  seed: INITIAL_SEED,
  rng: initial.rng,
  clusters: initial.clusters,
  clusterStates: initial.clusterStates,
  awgProfiles: initial.awgProfiles,
  awgStates: initial.awgStates,
  telemetry: {},
  weatherByCluster: {},
  alerts: [],
  lastDecision: null,
  history: [],

  hourOfDay: 8,
  simStepsElapsed: 0,
  stepHours: 1,
  isRunning: false,
  speedMultiplier: 1,

  strategyId: "balanced",
  activePreset: "custom",
  scenarioFlags: {},

  tick: () => {
    const state = get();
    const weatherByCluster: Record<string, WeatherConditions> = {};
    for (const cluster of state.clusters) {
      weatherByCluster[cluster.id] = syntheticWeatherAt(state.hourOfDay, undefined, state.rng);
    }

    const controller = buildController(state.strategyId);
    const decision = controller({
      clusters: state.clusters,
      clusterStates: state.clusterStates,
      awgProfiles: state.awgProfiles,
      awgStates: state.awgStates,
      hourOfDay: state.hourOfDay,
      weatherByCluster,
    });

    const result = stepFleet(
      state.clusters,
      state.clusterStates,
      state.awgProfiles,
      state.awgStates,
      state.hourOfDay,
      state.stepHours,
      decision,
      weatherByCluster,
      state.scenarioFlags,
    );

    const telemetryValues = Object.values(result.telemetry);
    const totalWaterL = telemetryValues.reduce((sum, t) => sum + t.productionRateLPerHour * state.stepHours, 0);
    const totalEnergyKwh = telemetryValues.reduce((sum, t) => sum + t.electricalPowerKw * state.stepHours, 0);
    const solarKw = telemetryValues.reduce((sum, t) => sum + t.solarContributionKw, 0);
    const batteryKw = telemetryValues.reduce((sum, t) => sum + t.batteryContributionKw, 0);
    const generatorKw = telemetryValues.reduce((sum, t) => sum + t.generatorContributionKw, 0);
    const unmetKw = telemetryValues.reduce((sum, t) => sum + t.unmetKw, 0);
    const avgTankFillPct =
      result.awgStates.length > 0
        ? (result.awgStates.reduce((sum, s) => sum + s.tankVolumeL / s.tankCapacityL, 0) / result.awgStates.length) * 100
        : 0;

    const historyPoint: FleetHistoryPoint = {
      step: state.simStepsElapsed + 1,
      hourOfDay: state.hourOfDay,
      totalWaterL,
      totalEnergyKwh,
      solarKw,
      batteryKw,
      generatorKw,
      unmetKw,
      avgTankFillPct,
    };

    set({
      clusterStates: result.clusterStates,
      awgStates: result.awgStates,
      telemetry: result.telemetry,
      weatherByCluster: result.weatherByCluster,
      alerts: [...result.alerts, ...state.alerts].slice(0, 100),
      lastDecision: decision,
      hourOfDay: (state.hourOfDay + state.stepHours) % 24,
      simStepsElapsed: state.simStepsElapsed + 1,
      history: [...state.history, historyPoint].slice(-MAX_HISTORY_POINTS),
    });
  },

  play: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),

  reset: (seed) => {
    const nextSeed = seed ?? Math.floor(Math.random() * 1_000_000);
    const fresh = freshFleet(nextSeed);
    set({
      seed: nextSeed,
      rng: fresh.rng,
      clusters: fresh.clusters,
      clusterStates: fresh.clusterStates,
      awgProfiles: fresh.awgProfiles,
      awgStates: fresh.awgStates,
      telemetry: {},
      weatherByCluster: {},
      alerts: [],
      lastDecision: null,
      history: [],
      hourOfDay: 8,
      simStepsElapsed: 0,
      isRunning: false,
      activePreset: "custom",
      scenarioFlags: {},
    });
  },

  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),
  setStrategy: (id) => set({ strategyId: id }),

  applyPreset: (preset) => {
    const flagsByPreset: Record<ScenarioPresetId, StepScenarioFlags> = {
      "sunny-coastal": { peakSunHours: 6.5 },
      "cloudy-humid": { peakSunHours: 2.5 },
      "hot-dry": { peakSunHours: 5.5 },
      "emergency-demand": { demandMultiplier: 2.5 },
      "generator-outage": { allowGenerator: false },
      "battery-low": { allowBattery: false },
      "equipment-failure": { forceFaultClusterIds: [get().clusters[0]?.id].filter(Boolean) as string[] },
      custom: {},
    };
    set({ activePreset: preset, scenarioFlags: flagsByPreset[preset] });
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledgedAtIso: new Date().toISOString() } : a)),
    }));
  },

  setAwgOperatingMode: (awgId, mode) => {
    set((state) => ({
      awgStates: state.awgStates.map((s) => (s.id === awgId ? { ...s, operatingMode: mode } : s)),
    }));
  },
}));

// Seed one initial tick so every dashboard page has real telemetry on first render,
// instead of showing empty state until the clock starts.
useFleetStore.getState().tick();

/** Drives the simulation tick loop while `isRunning` is true. Mount once near the dashboard root. */
export function useFleetClock() {
  const isRunning = useFleetStore((s) => s.isRunning);
  const speedMultiplier = useFleetStore((s) => s.speedMultiplier);

  useEffect(() => {
    if (!isRunning) return;
    const baseIntervalMs = 1000;
    const intervalMs = Math.max(100, baseIntervalMs / speedMultiplier);
    const id = window.setInterval(() => {
      useFleetStore.getState().tick();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isRunning, speedMultiplier]);
}
