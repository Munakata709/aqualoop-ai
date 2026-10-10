/**
 * AWG manufacturer/model performance profiles.
 *
 * The simplified physics model (lib/physics/water.ts) uses `ratedProductionLPerDay`
 * and `ratedPowerKw` from whichever profile an AWG is assigned. This indirection
 * is what lets a real manufacturer performance curve replace the synthetic
 * model later without changing any caller — see ASSUMPTIONS.md and ROADMAP.md.
 */

import { gallonsToLiters } from "@/lib/units";

export interface AwgEquipmentProfile {
  manufacturer: string;
  model: string;
  ratedGallonsPerDay: number;
  ratedPowerKw: number;
  baseSpecificEnergyKwhPerL: number;
}

export const AQUALOOP_STANDARD_PROFILE: AwgEquipmentProfile = {
  manufacturer: "AquaLoop AI",
  model: "AL-50 Standard",
  ratedGallonsPerDay: 50,
  ratedPowerKw: 8,
  baseSpecificEnergyKwhPerL: 0.6,
};

export function ratedProductionLPerDay(profile: AwgEquipmentProfile): number {
  return gallonsToLiters(profile.ratedGallonsPerDay);
}
