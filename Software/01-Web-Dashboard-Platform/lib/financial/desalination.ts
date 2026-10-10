/**
 * Seawater reverse-osmosis (RO) desalination comparison model.
 *
 * RO is normally far more electricity-efficient per gallon than AWG — this
 * module is NOT designed to make AquaLoop "win"; it reports whichever
 * system is cheaper under the user's selected assumptions (see
 * app/desalination). AquaLoop's potential advantage is decentralized siting
 * without a seawater intake or brine discharge at every location, not raw
 * energy efficiency.
 */

import { safeDivide } from "@/lib/units";

export interface DesalinationInputs {
  dailyOutputGallons: number;
  electricityKwhPerCubicMeter: number;
  electricityPriceUsdPerKwh: number;
  capitalCostUsd: number;
  pretreatmentCostUsdPerYear: number;
  intakeInfrastructureCostUsd: number;
  brineDisposalCostUsdPerYear: number;
  membraneMaintenanceCostUsdPerYear: number;
  permittingSiteCostUsd: number;
  distributionCostUsdPerYearPerGallonCapacity: number;
  equipmentLifetimeYears: number;
  discountRatePct: number;
  gridEmissionsFactorKgCo2PerKwh: number;
  landUseAcres: number;
}

export const DEFAULT_DESALINATION_INPUTS: DesalinationInputs = {
  dailyOutputGallons: 1000,
  electricityKwhPerCubicMeter: 4,
  electricityPriceUsdPerKwh: 0.12,
  capitalCostUsd: 350000,
  pretreatmentCostUsdPerYear: 15000,
  intakeInfrastructureCostUsd: 120000,
  brineDisposalCostUsdPerYear: 20000,
  membraneMaintenanceCostUsdPerYear: 18000,
  permittingSiteCostUsd: 80000,
  distributionCostUsdPerYearPerGallonCapacity: 0.02,
  equipmentLifetimeYears: 15,
  discountRatePct: 6,
  gridEmissionsFactorKgCo2PerKwh: 0.4,
  landUseAcres: 0.5,
};

export interface DesalinationResults {
  totalCapitalCostUsd: number;
  annualElectricityKwh: number;
  annualElectricityCostUsd: number;
  annualOpexUsd: number;
  annualWaterProductionGallons: number;
  energyPerGallonKwh: number;
  levelizedCostOfWaterUsdPerGallon: number;
  tenYearCumulativeCostUsd: number;
  twentyYearCumulativeCostUsd: number;
  annualEmissionsKgCo2: number;
  landUseAcres: number;
}

function capitalRecoveryFactor(discountRate: number, years: number): number {
  if (discountRate === 0) return safeDivide(1, years, 0);
  return safeDivide(discountRate * Math.pow(1 + discountRate, years), Math.pow(1 + discountRate, years) - 1, 0);
}

export function calculateDesalinationCost(inputs: DesalinationInputs): DesalinationResults {
  const totalCapitalCostUsd = inputs.capitalCostUsd + inputs.intakeInfrastructureCostUsd + inputs.permittingSiteCostUsd;
  const annualWaterProductionGallons = inputs.dailyOutputGallons * 365;
  const annualWaterProductionM3 = (annualWaterProductionGallons * 3.785411784) / 1000;

  const annualElectricityKwh = annualWaterProductionM3 * inputs.electricityKwhPerCubicMeter;
  const annualElectricityCostUsd = annualElectricityKwh * inputs.electricityPriceUsdPerKwh;

  const annualDistributionCostUsd = inputs.dailyOutputGallons * 365 * inputs.distributionCostUsdPerYearPerGallonCapacity;
  const annualOpexUsd =
    annualElectricityCostUsd +
    inputs.pretreatmentCostUsdPerYear +
    inputs.brineDisposalCostUsdPerYear +
    inputs.membraneMaintenanceCostUsdPerYear +
    annualDistributionCostUsd;

  const crf = capitalRecoveryFactor(inputs.discountRatePct / 100, inputs.equipmentLifetimeYears);
  const annualizedCapitalCostUsd = totalCapitalCostUsd * crf;
  const levelizedCostOfWaterUsdPerGallon = safeDivide(
    annualizedCapitalCostUsd + annualOpexUsd,
    annualWaterProductionGallons,
    0,
  );

  let tenYearCumulativeCostUsd = totalCapitalCostUsd;
  let twentyYearCumulativeCostUsd = totalCapitalCostUsd;
  for (let year = 1; year <= 20; year++) {
    if (year <= 10) tenYearCumulativeCostUsd += annualOpexUsd;
    twentyYearCumulativeCostUsd += annualOpexUsd;
  }

  return {
    totalCapitalCostUsd,
    annualElectricityKwh,
    annualElectricityCostUsd,
    annualOpexUsd,
    annualWaterProductionGallons,
    energyPerGallonKwh: safeDivide(annualElectricityKwh, annualWaterProductionGallons, 0),
    levelizedCostOfWaterUsdPerGallon,
    tenYearCumulativeCostUsd,
    twentyYearCumulativeCostUsd,
    annualEmissionsKgCo2: annualElectricityKwh * inputs.gridEmissionsFactorKgCo2PerKwh,
    landUseAcres: inputs.landUseAcres,
  };
}
