/**
 * Builds the initial 20-AWG / 5-cluster Corpus Christi fleet state.
 *
 * Fleet-level planning assumptions (ASSUMPTIONS.md): ~723 panels / ~398 kW DC
 * solar, 600 kWh total battery, 70/30 solar/gas energy target. Per-cluster
 * values below divide those fleet totals across 5 clusters of 4 AWGs each.
 */

import { AWGS_PER_CLUSTER, CORPUS_CHRISTI_CLUSTERS } from "@/data/corpus-christi/clusters";
import { AQUALOOP_STANDARD_PROFILE, ratedProductionLPerDay } from "@/lib/equipment/awgProfiles";
import { gallonsToLiters } from "@/lib/units";
import type { AwgProfile, AwgState, ClusterConfig, ClusterState } from "@/lib/simulation/types";

const PANELS_PER_AWG = 36.25; // ~723 panels / 20 AWGs — a planning assumption, see ASSUMPTIONS.md
const PANEL_RATING_W = 550;
const BATTERY_KWH_PER_AWG = 30;
const GENERATOR_KW_PER_AWG = 10; // headroom above the ~8kW AWG rated power
const TANK_DAYS_CAPACITY = 3;
const TANK_DAYS_RESERVE = 1;
// Fixed (not "now") so that seed data is a pure, prerenderable function — avoids Next.js's
// "unstable value" prerender error for a field that's just a seed-demo placeholder anyway.
const DEMO_SEED_TIMESTAMP_ISO = "2026-01-01T00:00:00.000Z";

export function buildClusterConfigs(): ClusterConfig[] {
  return CORPUS_CHRISTI_CLUSTERS.map((seed) => {
    const awgIds = Array.from({ length: AWGS_PER_CLUSTER }, (_, i) => `${seed.id}-awg-${i + 1}`);
    const panelCount = Math.round(PANELS_PER_AWG * AWGS_PER_CLUSTER);
    const clusterRatedLPerDay = ratedProductionLPerDay(AQUALOOP_STANDARD_PROFILE) * AWGS_PER_CLUSTER;

    return {
      id: seed.id,
      name: seed.name,
      approximateLatitude: seed.approximateLatitude,
      approximateLongitude: seed.approximateLongitude,
      awgIds,
      solar: {
        panelCount,
        panelRatingW: PANEL_RATING_W,
        performanceFactor: 0.8,
        cloudCoverFactor: 1,
      },
      battery: {
        nominalCapacityKwh: BATTERY_KWH_PER_AWG * AWGS_PER_CLUSTER,
        usableFraction: 0.9,
        chargePowerLimitKw: BATTERY_KWH_PER_AWG * AWGS_PER_CLUSTER * 0.5,
        dischargePowerLimitKw: BATTERY_KWH_PER_AWG * AWGS_PER_CLUSTER * 0.5,
        roundTripEfficiency: 0.9,
        minReserveFraction: 0.15,
        maxSocFraction: 0.95,
      },
      generator: {
        ratedPowerKw: GENERATOR_KW_PER_AWG * AWGS_PER_CLUSTER,
        electricalEfficiency: 0.25,
        fuelPricePerMmBtu: 8,
        minLoadFraction: 0.2,
        minRuntimeSteps: 4,
      },
      waterDemandLPerDay: clusterRatedLPerDay,
    };
  });
}

export function buildClusterStates(clusters: ClusterConfig[]): ClusterState[] {
  return clusters.map((cluster) => ({
    id: cluster.id,
    batteryState: { stateOfChargeKwh: cluster.battery.nominalCapacityKwh * cluster.battery.usableFraction * 0.6 },
    generatorRunning: false,
    generatorConsecutiveRunSteps: 0,
    cloudCoverFactor: 1,
    communicationLost: false,
  }));
}

export function buildAwgProfiles(clusters: ClusterConfig[]): AwgProfile[] {
  const profiles: AwgProfile[] = [];
  for (const cluster of clusters) {
    cluster.awgIds.forEach((id, index) => {
      profiles.push({
        id,
        name: `${cluster.name} AWG-${index + 1}`,
        manufacturer: AQUALOOP_STANDARD_PROFILE.manufacturer,
        model: AQUALOOP_STANDARD_PROFILE.model,
        clusterId: cluster.id,
        ratedProductionLPerDay: ratedProductionLPerDay(AQUALOOP_STANDARD_PROFILE),
        ratedPowerKw: AQUALOOP_STANDARD_PROFILE.ratedPowerKw,
        installedAt: DEMO_SEED_TIMESTAMP_ISO,
      });
    });
  }
  return profiles;
}

export function buildAwgStates(profiles: AwgProfile[]): AwgState[] {
  const ratedLPerDay = gallonsToLiters(AQUALOOP_STANDARD_PROFILE.ratedGallonsPerDay);
  const tankCapacityL = ratedLPerDay * TANK_DAYS_CAPACITY;
  const minReserveL = ratedLPerDay * TANK_DAYS_RESERVE;

  return profiles.map((profile) => ({
    id: profile.id,
    operatingMode: "automatic",
    healthStatus: "nominal",
    tankVolumeL: tankCapacityL * 0.4,
    tankCapacityL,
    minReserveL,
    totalWaterProducedTodayL: 0,
    totalEnergyConsumedTodayKwh: 0,
    lastSeenAt: DEMO_SEED_TIMESTAMP_ISO,
    activeFaultCodes: [],
    healthScore: 100,
    consecutiveRestarts: 0,
  }));
}
