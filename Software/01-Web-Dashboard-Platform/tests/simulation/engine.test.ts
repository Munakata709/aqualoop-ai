import { describe, it, expect } from "vitest";
import { createSeededRng } from "@/lib/simulation/rng";
import { buildAwgProfiles, buildAwgStates, buildClusterConfigs, buildClusterStates } from "@/lib/simulation/seedData";
import { stepFleet, type FleetControlDecision } from "@/lib/simulation/engine";
import { syntheticWeatherAt } from "@/lib/simulation/weather";
import { TOTAL_AWGS } from "@/data/corpus-christi/clusters";
import type { ClusterConfig, WeatherConditions } from "@/lib/simulation/types";
import type { SeededRng } from "@/lib/simulation/rng";

function allRunningDecision(awgIds: string[]): FleetControlDecision {
  return {
    runningAwgIds: new Set(awgIds),
    explanations: {},
    strategyName: "test-all-running",
  };
}

function freshFleet() {
  const clusters = buildClusterConfigs();
  const clusterStates = buildClusterStates(clusters);
  const awgProfiles = buildAwgProfiles(clusters);
  const awgStates = buildAwgStates(awgProfiles);
  return { clusters, clusterStates, awgProfiles, awgStates };
}

function weatherForClusters(clusters: ClusterConfig[], hourOfDay: number, rng: SeededRng): Record<string, WeatherConditions> {
  const result: Record<string, WeatherConditions> = {};
  for (const cluster of clusters) {
    result[cluster.id] = syntheticWeatherAt(hourOfDay, undefined, rng);
  }
  return result;
}

describe("fleet seed data", () => {
  it("builds exactly 20 AWGs across 5 clusters", () => {
    const { awgProfiles } = freshFleet();
    expect(awgProfiles.length).toBe(TOTAL_AWGS);
    expect(awgProfiles.length).toBe(20);
  });
});

describe("stepFleet determinism", () => {
  it("produces identical results given the same seed, weather, and decision", () => {
    const fleetA = freshFleet();
    const fleetB = freshFleet();
    const decision = allRunningDecision(fleetA.awgProfiles.map((p) => p.id));
    const weatherA = weatherForClusters(fleetA.clusters, 12, createSeededRng(42));
    const weatherB = weatherForClusters(fleetB.clusters, 12, createSeededRng(42));

    const resultA = stepFleet(fleetA.clusters, fleetA.clusterStates, fleetA.awgProfiles, fleetA.awgStates, 12, 1, decision, weatherA);
    const resultB = stepFleet(fleetB.clusters, fleetB.clusterStates, fleetB.awgProfiles, fleetB.awgStates, 12, 1, decision, weatherB);

    for (const awgId of Object.keys(resultA.telemetry)) {
      expect(resultB.telemetry[awgId].productionRateLPerHour).toBeCloseTo(
        resultA.telemetry[awgId].productionRateLPerHour,
        9,
      );
      expect(resultB.telemetry[awgId].electricalPowerKw).toBeCloseTo(resultA.telemetry[awgId].electricalPowerKw, 9);
    }
  });

  it("produces different weather for different seeds (weather noise differs)", () => {
    const { clusters } = freshFleet();
    const weatherA = weatherForClusters(clusters, 12, createSeededRng(1));
    const weatherB = weatherForClusters(clusters, 12, createSeededRng(2));

    const anyCloudCoverDiffers = clusters.some((cluster) => {
      const a = weatherA[cluster.id].cloudCoverFactor;
      const b = weatherB[cluster.id].cloudCoverFactor;
      return Math.abs(a - b) > 1e-9;
    });
    expect(anyCloudCoverDiffers).toBe(true);
  });
});

describe("stepFleet physical invariants", () => {
  it("never produces negative water or negative energy for any AWG", () => {
    const { clusters, clusterStates, awgProfiles, awgStates } = freshFleet();
    const decision = allRunningDecision(awgProfiles.map((p) => p.id));
    const weather = weatherForClusters(clusters, 14, createSeededRng(7));
    const result = stepFleet(clusters, clusterStates, awgProfiles, awgStates, 14, 1, decision, weather);

    for (const telemetry of Object.values(result.telemetry)) {
      expect(telemetry.productionRateLPerHour).toBeGreaterThanOrEqual(0);
      expect(telemetry.electricalPowerKw).toBeGreaterThanOrEqual(0);
      expect(telemetry.tankLevelL).toBeGreaterThanOrEqual(0);
    }
    for (const state of result.awgStates) {
      expect(state.tankVolumeL).toBeGreaterThanOrEqual(0);
      expect(state.tankVolumeL).toBeLessThanOrEqual(state.tankCapacityL + 1e-6);
    }
  });

  it("shuts down AWG production once its tank is full", () => {
    const { clusters, clusterStates, awgProfiles, awgStates } = freshFleet();
    const fullAwgStates = awgStates.map((s) => ({ ...s, tankVolumeL: s.tankCapacityL }));
    const decision = allRunningDecision(awgProfiles.map((p) => p.id));
    const weather = weatherForClusters(clusters, 12, createSeededRng(3));

    const result = stepFleet(clusters, clusterStates, awgProfiles, fullAwgStates, 12, 1, decision, weather);

    for (const telemetry of Object.values(result.telemetry)) {
      expect(telemetry.running).toBe(false);
      expect(telemetry.productionRateLPerHour).toBe(0);
    }
  });

  it("stops producing (reports no running AWGs) when communication is lost for a cluster", () => {
    const { clusters, clusterStates, awgProfiles, awgStates } = freshFleet();
    const decision = allRunningDecision(awgProfiles.map((p) => p.id));
    const targetCluster = clusters[0];
    const weather = weatherForClusters(clusters, 12, createSeededRng(5));

    const result = stepFleet(clusters, clusterStates, awgProfiles, awgStates, 12, 1, decision, weather, {
      communicationLostClusterIds: [targetCluster.id],
    });

    for (const awgId of targetCluster.awgIds) {
      expect(result.telemetry[awgId].running).toBe(false);
    }
  });

  it("reports equipment faults as alerts and marks the AWG as not running", () => {
    const { clusters, clusterStates, awgProfiles, awgStates } = freshFleet();
    const decision = allRunningDecision(awgProfiles.map((p) => p.id));
    const targetCluster = clusters[0];
    const weather = weatherForClusters(clusters, 12, createSeededRng(9));

    const result = stepFleet(clusters, clusterStates, awgProfiles, awgStates, 12, 1, decision, weather, {
      forceFaultClusterIds: [targetCluster.id],
    });

    for (const awgId of targetCluster.awgIds) {
      expect(result.telemetry[awgId].running).toBe(false);
      expect(result.telemetry[awgId].faultCodes.length).toBeGreaterThan(0);
    }
    expect(result.alerts.some((a) => a.type === "equipment-fault")).toBe(true);
  });
});
