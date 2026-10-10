/**
 * Financial model for the AquaLoop AI fleet.
 *
 * Standard discounted-cash-flow methods (capital recovery factor, NPV,
 * levelized cost). Solar electricity is NOT treated as free: its capital,
 * maintenance, and replacement costs are included in CAPEX/OPEX like any
 * other asset. If the model doesn't break even, `paybackYears` is null and
 * the UI must say so rather than hiding it.
 */

import { gallonsToLiters, safeDivide } from "@/lib/units";

export interface FinancialInputs {
  numAwgs: number;
  ratedGallonsPerDayPerAwg: number;
  /** 0-1 fraction of rated capacity actually achieved on average. */
  actualUtilization: number;
  awgCapitalCostUsdEach: number;
  solarPanelCount: number;
  solarInstallCostUsdPerWatt: number;
  panelRatingW: number;
  batteryCapacityKwhTotal: number;
  batteryInstallCostUsdPerKwh: number;
  generatorCostUsdTotal: number;
  naturalGasPriceUsdPerMmBtu: number;
  generatorElectricalEfficiency: number;
  specificEnergyKwhPerL: number;
  solarFractionOfEnergy: number; // 0-1, target share of electrical energy from solar
  annualMaintenanceCostUsd: number;
  waterTreatmentCostUsdPerGallon: number;
  landSiteCostUsdTotal: number;
  monitoringSoftwareCostUsdPerYear: number;
  equipmentLifetimeYears: number;
  discountRatePct: number; // e.g. 6 for 6%
  optimizationImprovementPct: number; // expected kWh/gallon reduction vs. baseline, 0-100
  waterSalePriceUsdPerGallon: number;
}

export interface FinancialResults {
  totalCapitalCostUsd: number;
  annualWaterProductionGallons: number;
  annualElectricityKwh: number;
  annualSolarKwh: number;
  annualGasKwh: number;
  annualFuelCostUsd: number;
  annualOpexUsd: number;
  fuelCostUsdPerGallon: number;
  totalOperatingCostUsdPerGallon: number;
  levelizedCostOfWaterUsdPerGallon: number;
  annualOptimizationSavingsUsd: number;
  cumulativeSavingsByYear: number[]; // index 0 = year 1
  netPresentValueUsd: number;
  paybackYears: number | null;
  breakEvenWaterPriceUsdPerGallon: number;
  projections: { year: 5 | 10 | 20; cumulativeCashFlowUsd: number; cumulativeWaterGallons: number }[];
}

export const DEFAULT_FINANCIAL_INPUTS: FinancialInputs = {
  numAwgs: 20,
  ratedGallonsPerDayPerAwg: 50,
  actualUtilization: 0.75,
  awgCapitalCostUsdEach: 45000,
  solarPanelCount: 723,
  solarInstallCostUsdPerWatt: 1.2,
  panelRatingW: 550,
  batteryCapacityKwhTotal: 600,
  batteryInstallCostUsdPerKwh: 400,
  generatorCostUsdTotal: 60000,
  naturalGasPriceUsdPerMmBtu: 8,
  generatorElectricalEfficiency: 0.25,
  specificEnergyKwhPerL: 0.6,
  solarFractionOfEnergy: 0.7,
  annualMaintenanceCostUsd: 40000,
  waterTreatmentCostUsdPerGallon: 0.05,
  landSiteCostUsdTotal: 150000,
  monitoringSoftwareCostUsdPerYear: 24000,
  equipmentLifetimeYears: 10,
  discountRatePct: 6,
  optimizationImprovementPct: 10,
  waterSalePriceUsdPerGallon: 0.08,
};

function capitalRecoveryFactor(discountRate: number, years: number): number {
  if (discountRate === 0) return safeDivide(1, years, 0);
  const r = discountRate;
  return safeDivide(r * Math.pow(1 + r, years), Math.pow(1 + r, years) - 1, 0);
}

export function calculateFinancials(inputs: FinancialInputs): FinancialResults {
  const solarCapitalCostUsd = inputs.solarPanelCount * inputs.panelRatingW * inputs.solarInstallCostUsdPerWatt;
  const batteryCapitalCostUsd = inputs.batteryCapacityKwhTotal * inputs.batteryInstallCostUsdPerKwh;
  const awgCapitalCostUsd = inputs.numAwgs * inputs.awgCapitalCostUsdEach;
  const totalCapitalCostUsd =
    awgCapitalCostUsd + solarCapitalCostUsd + batteryCapitalCostUsd + inputs.generatorCostUsdTotal + inputs.landSiteCostUsdTotal;

  const annualWaterProductionGallons =
    inputs.numAwgs * inputs.ratedGallonsPerDayPerAwg * inputs.actualUtilization * 365;
  const annualWaterProductionL = gallonsToLiters(annualWaterProductionGallons);

  const effectiveSpecificEnergy = inputs.specificEnergyKwhPerL * (1 - inputs.optimizationImprovementPct / 100);
  const annualElectricityKwh = annualWaterProductionL * effectiveSpecificEnergy;
  const annualSolarKwh = annualElectricityKwh * inputs.solarFractionOfEnergy;
  const annualGasKwh = annualElectricityKwh * (1 - inputs.solarFractionOfEnergy);

  const annualGasThermalKwh = safeDivide(annualGasKwh, inputs.generatorElectricalEfficiency, 0);
  const annualGasMmBtu = annualGasThermalKwh / 293.07;
  const annualFuelCostUsd = annualGasMmBtu * inputs.naturalGasPriceUsdPerMmBtu;

  const annualWaterTreatmentCostUsd = annualWaterProductionGallons * inputs.waterTreatmentCostUsdPerGallon;
  const annualOpexUsd =
    inputs.annualMaintenanceCostUsd +
    annualFuelCostUsd +
    annualWaterTreatmentCostUsd +
    inputs.monitoringSoftwareCostUsdPerYear;

  const fuelCostUsdPerGallon = safeDivide(annualFuelCostUsd, annualWaterProductionGallons, 0);
  const totalOperatingCostUsdPerGallon = safeDivide(annualOpexUsd, annualWaterProductionGallons, 0);

  const crf = capitalRecoveryFactor(inputs.discountRatePct / 100, inputs.equipmentLifetimeYears);
  const annualizedCapitalCostUsd = totalCapitalCostUsd * crf;
  const levelizedCostOfWaterUsdPerGallon = safeDivide(
    annualizedCapitalCostUsd + annualOpexUsd,
    annualWaterProductionGallons,
    0,
  );

  // Optimization savings: fuel + treatment cost avoided relative to an unoptimized baseline
  // (0% optimization improvement), holding the solar/gas split and utilization fixed.
  const baselineSpecificEnergy = inputs.specificEnergyKwhPerL;
  const baselineGasKwh = annualWaterProductionL * baselineSpecificEnergy * (1 - inputs.solarFractionOfEnergy);
  const baselineGasMmBtu = safeDivide(baselineGasKwh, inputs.generatorElectricalEfficiency, 0) / 293.07;
  const baselineFuelCostUsd = baselineGasMmBtu * inputs.naturalGasPriceUsdPerMmBtu;
  const annualOptimizationSavingsUsd = Math.max(0, baselineFuelCostUsd - annualFuelCostUsd);

  const annualRevenueUsd = annualWaterProductionGallons * inputs.waterSalePriceUsdPerGallon;
  const annualNetCashFlowUsd = annualRevenueUsd - annualOpexUsd;

  const discountRate = inputs.discountRatePct / 100;
  let npv = -totalCapitalCostUsd;
  let cumulativeUndiscounted = -totalCapitalCostUsd;
  const cumulativeSavingsByYear: number[] = [];
  let paybackYears: number | null = null;
  const projections: FinancialResults["projections"] = [];

  const horizon = Math.max(inputs.equipmentLifetimeYears, 20);
  for (let year = 1; year <= horizon; year++) {
    npv += safeDivide(annualNetCashFlowUsd, Math.pow(1 + discountRate, year), 0);
    cumulativeUndiscounted += annualNetCashFlowUsd;
    if (year <= 20) cumulativeSavingsByYear.push(cumulativeUndiscounted);
    if (paybackYears === null && cumulativeUndiscounted >= 0) paybackYears = year;
    if (year === 5 || year === 10 || year === 20) {
      projections.push({
        year: year as 5 | 10 | 20,
        cumulativeCashFlowUsd: cumulativeUndiscounted,
        cumulativeWaterGallons: annualWaterProductionGallons * year,
      });
    }
  }

  const breakEvenWaterPriceUsdPerGallon = safeDivide(
    annualOpexUsd + annualizedCapitalCostUsd,
    annualWaterProductionGallons,
    0,
  );

  return {
    totalCapitalCostUsd,
    annualWaterProductionGallons,
    annualElectricityKwh,
    annualSolarKwh,
    annualGasKwh,
    annualFuelCostUsd,
    annualOpexUsd,
    fuelCostUsdPerGallon,
    totalOperatingCostUsdPerGallon,
    levelizedCostOfWaterUsdPerGallon,
    annualOptimizationSavingsUsd,
    cumulativeSavingsByYear,
    netPresentValueUsd: npv,
    paybackYears,
    breakEvenWaterPriceUsdPerGallon,
    projections,
  };
}
