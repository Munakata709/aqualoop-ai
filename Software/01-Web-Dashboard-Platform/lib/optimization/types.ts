import type { AwgProfile, AwgState, ClusterConfig, ClusterState, WeatherConditions } from "@/lib/simulation/types";
import type { FleetControlDecision } from "@/lib/simulation/engine";

export interface ControllerContext {
  clusters: ClusterConfig[];
  clusterStates: ClusterState[];
  awgProfiles: AwgProfile[];
  awgStates: AwgState[];
  hourOfDay: number;
  weatherByCluster: Record<string, WeatherConditions>;
  peakSunHours?: number;
}

export type StrategyId =
  | "fixed-schedule"
  | "weather-aware"
  | "solar-first"
  | "lowest-cost"
  | "min-emissions"
  | "max-reliability"
  | "balanced";

export interface StrategyConfig {
  id: StrategyId;
  label: string;
  description: string;
  /** Strategy B/E: defer flexible (non-urgent) production in poor humidity/temperature windows. */
  humidityAware: boolean;
  /** Strategy C/D: only run flexible AWGs within the solar+battery energy budget, avoiding unplanned generator starts. */
  respectEnergyBudget: boolean;
  /** When the energy budget is exceeded, allow starting the generator anyway for flexible (non-reserve-critical) load. */
  allowGeneratorForFlexible: boolean;
}

export type FleetController = (context: ControllerContext) => FleetControlDecision;
