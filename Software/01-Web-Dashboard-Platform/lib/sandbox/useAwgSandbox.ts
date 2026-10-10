"use client";

/**
 * Drives the interactive single-AWG demo used on the public "How It Works"
 * and "Hybrid Energy" pages. Pure derived computation from slider state —
 * no simulation loop needed since there's nothing time-dependent beyond the
 * user's own inputs (hour-of-day affects solar only).
 */

import { useMemo, useState } from "react";
import { estimateDewPointC, estimateSpecificEnergyKwhPerL, estimateWaterProductionRate, electricalPowerKw } from "@/lib/physics/water";
import { solarPowerKw, installedCapacityKw } from "@/lib/physics/solar";
import { AQUALOOP_STANDARD_PROFILE, ratedProductionLPerDay } from "@/lib/equipment/awgProfiles";
import { litersToGallons } from "@/lib/units";

export interface AwgSandboxControls {
  temperatureC: number;
  relativeHumidityPct: number;
  hourOfDay: number;
  cloudCoverFactor: number;
  waterDemandLPerDay: number;
}

const DEFAULT_CONTROLS: AwgSandboxControls = {
  temperatureC: 29,
  relativeHumidityPct: 65,
  hourOfDay: 13,
  cloudCoverFactor: 1,
  waterDemandLPerDay: 190,
};

export function useAwgSandbox(initial: Partial<AwgSandboxControls> = {}) {
  const [controls, setControls] = useState<AwgSandboxControls>({ ...DEFAULT_CONTROLS, ...initial });

  const derived = useMemo(() => {
    const ratedLPerDay = ratedProductionLPerDay(AQUALOOP_STANDARD_PROFILE);
    const dewPointC = estimateDewPointC(controls.temperatureC, controls.relativeHumidityPct);
    const production = estimateWaterProductionRate(
      { temperatureC: controls.temperatureC, relativeHumidityPct: controls.relativeHumidityPct },
      ratedLPerDay,
    );
    const specificEnergyKwhPerL = estimateSpecificEnergyKwhPerL(controls.temperatureC);
    const powerKw = electricalPowerKw(production.productionRateLPerHour, specificEnergyKwhPerL);

    const solarConfig = { panelCount: 37, panelRatingW: 550, performanceFactor: 0.8, cloudCoverFactor: controls.cloudCoverFactor };
    const solarKw = solarPowerKw(solarConfig, controls.hourOfDay, 5);
    const solarCapacityKw = installedCapacityKw(solarConfig);

    return {
      ratedLPerDay,
      dewPointC,
      productionRateLPerHour: production.productionRateLPerHour,
      productionRateGallonsPerHour: litersToGallons(production.productionRateLPerHour),
      feasible: production.feasible,
      reason: production.reason,
      absoluteHumidityGPerM3: production.absoluteHumidityGPerM3,
      specificEnergyKwhPerL,
      powerKw,
      solarKw,
      solarCapacityKw,
      solarCoversLoad: solarKw >= powerKw,
    };
  }, [controls]);

  return { controls, setControls, derived };
}
