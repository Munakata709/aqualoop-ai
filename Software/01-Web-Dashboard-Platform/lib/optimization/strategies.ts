import type { StrategyConfig, StrategyId } from "@/lib/optimization/types";

export const STRATEGIES: Record<StrategyId, StrategyConfig> = {
  "fixed-schedule": {
    id: "fixed-schedule",
    label: "Fixed Schedule",
    description: "Runs every available AWG whenever its tank has room, ignoring weather and energy source. This is the baseline against which AI strategies are compared.",
    humidityAware: false,
    respectEnergyBudget: false,
    allowGeneratorForFlexible: true,
  },
  "weather-aware": {
    id: "weather-aware",
    label: "Weather-Aware",
    description: "Defers flexible (non-urgent) production during poor humidity/temperature windows and shifts it to better conditions, without constraining energy source.",
    humidityAware: true,
    respectEnergyBudget: false,
    allowGeneratorForFlexible: true,
  },
  "solar-first": {
    id: "solar-first",
    label: "Solar-First",
    description: "Only runs flexible AWGs within the solar + battery energy budget; avoids starting the generator for non-urgent production.",
    humidityAware: false,
    respectEnergyBudget: true,
    allowGeneratorForFlexible: false,
  },
  "lowest-cost": {
    id: "lowest-cost",
    label: "Lowest Operating Cost",
    description: "Combines weather-aware scheduling with solar-first energy budgeting to minimize fuel and battery-cycling cost, while always protecting the minimum water reserve.",
    humidityAware: true,
    respectEnergyBudget: true,
    allowGeneratorForFlexible: false,
  },
  "min-emissions": {
    id: "min-emissions",
    label: "Minimum Emissions",
    description: "Same dispatch-avoidance mechanism as Lowest Operating Cost — the dominant emissions lever in this model is avoiding unnecessary natural gas generator starts.",
    humidityAware: true,
    respectEnergyBudget: true,
    allowGeneratorForFlexible: false,
  },
  "max-reliability": {
    id: "max-reliability",
    label: "Maximum Water Reliability",
    description: "Runs every eligible AWG regardless of energy source or conditions, maximizing water output at the cost of higher fuel/battery use.",
    humidityAware: false,
    respectEnergyBudget: false,
    allowGeneratorForFlexible: true,
  },
  balanced: {
    id: "balanced",
    label: "Balanced Optimization",
    description: "Shifts flexible production away from poor-efficiency windows, but still allows the generator when needed — a middle ground between cost and reliability.",
    humidityAware: true,
    respectEnergyBudget: true,
    allowGeneratorForFlexible: true,
  },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);
