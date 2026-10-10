/**
 * Core typed entities for the AquaLoop AI simulation.
 *
 * Every numeric field that represents a measurement carries an explicit
 * `DataSource` somewhere in the owning record (see `DataSource` below) so
 * the UI can always label a value as simulated / forecast / estimated /
 * measured / user-entered, per the build spec's hardware-integration
 * readiness requirement. In this MVP, nearly everything is "simulated" —
 * there is no physical hardware connected yet.
 */

import type { BatteryConfig, BatteryState } from "@/lib/physics/battery";
import type { SolarArrayConfig } from "@/lib/physics/solar";

export type DataSource = "simulated" | "forecast" | "measured" | "estimated" | "user-entered";

export type AwgOperatingMode = "automatic" | "manual-run" | "manual-pause" | "maintenance";
export type AwgHealthStatus = "nominal" | "degraded" | "fault" | "offline";

export interface AwgProfile {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  clusterId: string;
  ratedProductionLPerDay: number;
  ratedPowerKw: number;
  installedAt: string;
}

export interface AwgState {
  id: string;
  operatingMode: AwgOperatingMode;
  healthStatus: AwgHealthStatus;
  tankVolumeL: number;
  tankCapacityL: number;
  minReserveL: number;
  totalWaterProducedTodayL: number;
  totalEnergyConsumedTodayKwh: number;
  lastSeenAt: string;
  activeFaultCodes: string[];
  /** Health score 0-100, used by the predictive-maintenance heuristics. */
  healthScore: number;
  consecutiveRestarts: number;
}

export interface AwgTelemetry {
  timestamp: string;
  awgId: string;
  dataSource: DataSource;
  temperatureC: number;
  relativeHumidityPct: number;
  dewPointC: number;
  productionRateLPerHour: number;
  electricalPowerKw: number;
  energyIntensityKwhPerL: number;
  tankLevelL: number;
  solarContributionKw: number;
  batteryContributionKw: number;
  generatorContributionKw: number;
  unmetKw: number;
  running: boolean;
  faultCodes: string[];
}

export interface ClusterConfig {
  id: string;
  name: string;
  approximateLatitude: number;
  approximateLongitude: number;
  awgIds: string[];
  solar: SolarArrayConfig;
  battery: BatteryConfig;
  generator: {
    ratedPowerKw: number;
    electricalEfficiency: number;
    fuelPricePerMmBtu: number;
    minLoadFraction: number;
    minRuntimeSteps: number;
  };
  waterDemandLPerDay: number;
}

export interface ClusterState {
  id: string;
  batteryState: BatteryState;
  generatorRunning: boolean;
  generatorConsecutiveRunSteps: number;
  cloudCoverFactor: number;
  /** Weather forcing applied on top of the base synthetic weather curve for scenario testing. */
  weatherOverride?: Partial<WeatherConditions>;
  communicationLost: boolean;
}

export interface WeatherConditions {
  temperatureC: number;
  relativeHumidityPct: number;
  cloudCoverFactor: number;
}

export interface FleetSnapshot {
  timestampIso: string;
  simMinutesElapsed: number;
  clusters: ClusterConfig[];
  clusterStates: ClusterState[];
  awgProfiles: AwgProfile[];
  awgStates: AwgState[];
  awgTelemetry: Record<string, AwgTelemetry>;
  alerts: SimAlert[];
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface SimAlert {
  id: string;
  equipmentId: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  createdAtIso: string;
  acknowledgedAtIso?: string;
  resolvedAtIso?: string;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  simulationSeed: number;
  stepMinutes: number;
  startHourOfDay: number;
}
