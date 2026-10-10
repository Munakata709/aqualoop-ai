/**
 * Solar PV generation model.
 *
 * Uses an hourly daylight curve (not a flat 24h average) so the simulator
 * shows realistic morning ramp-up / midday peak / evening ramp-down, per
 * ASSUMPTIONS.md. All capacity/performance values are planning assumptions.
 */

import { clamp } from "@/lib/units";

export interface SolarArrayConfig {
  panelCount: number;
  panelRatingW: number;
  /** 0-1, aggregate derate for inverter, wiring, soiling, temperature, etc. */
  performanceFactor: number;
  /** 0-1, fraction of clear-sky irradiance reaching the array (1 = clear sky). */
  cloudCoverFactor?: number;
}

export function installedCapacityKw(config: Pick<SolarArrayConfig, "panelCount" | "panelRatingW">): number {
  return (config.panelCount * config.panelRatingW) / 1000;
}

/**
 * Normalized (0-1) clear-sky solar irradiance shape for a given hour of day
 * (0-23.99), centered on solar noon at hour 12, with sunrise/sunset at
 * hour 6/18 (a reasonable mid-latitude daylight window for Corpus Christi,
 * TX). This is a documented synthetic shape, not measured irradiance data.
 */
export function clearSkyIrradianceShape(hourOfDay: number): number {
  const sunrise = 6;
  const sunset = 18;
  if (hourOfDay <= sunrise || hourOfDay >= sunset) return 0;
  const dayLength = sunset - sunrise;
  const fraction = (hourOfDay - sunrise) / dayLength; // 0..1 across the day
  // Half-sine curve: 0 at sunrise/sunset, 1 at solar noon.
  return Math.sin(Math.PI * fraction);
}

/**
 * Instantaneous solar power output (kW) at a given hour of day, scaled so
 * that the integral over daylight hours matches `peakSunHours` worth of
 * full-capacity generation per day (a standard PV planning convention).
 */
export function solarPowerKw(
  config: SolarArrayConfig,
  hourOfDay: number,
  peakSunHours = 5,
): number {
  const capacityKw = installedCapacityKw(config);
  const cloudFactor = clamp(config.cloudCoverFactor ?? 1, 0, 1);
  const performanceFactor = clamp(config.performanceFactor, 0, 1);

  // Normalize the half-sine shape so its daily integral (in hours) equals peakSunHours.
  // Integral of sin(pi*x) dx from 0 to 1 is 2/pi, over a 12h window -> 12 * 2/pi hours.
  const daylightHours = 12;
  const shapeIntegralHours = daylightHours * (2 / Math.PI);
  const normalization = clamp(peakSunHours / shapeIntegralHours, 0, 2);

  const shape = clearSkyIrradianceShape(hourOfDay);
  return capacityKw * shape * normalization * performanceFactor * cloudFactor;
}

/** Energy (kWh) generated over one simulation step of `stepHours` duration. */
export function solarEnergyKwh(config: SolarArrayConfig, hourOfDay: number, stepHours: number, peakSunHours = 5): number {
  return solarPowerKw(config, hourOfDay, peakSunHours) * stepHours;
}
