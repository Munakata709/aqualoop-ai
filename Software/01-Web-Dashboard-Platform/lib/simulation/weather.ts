/**
 * Synthetic weather model for the demo.
 *
 * This is a documented synthetic diurnal curve (sinusoidal temperature,
 * inversely-correlated humidity, small seeded noise) tuned to be plausible
 * for coastal subtropical Corpus Christi, TX conditions — it is NOT
 * measured or forecast weather data. Architected so a real forecast API
 * (NWS, Open-Meteo, etc.) can replace `syntheticWeatherAt` without
 * touching callers (see ROADMAP.md).
 */

import { clamp } from "@/lib/units";
import type { SeededRng } from "@/lib/simulation/rng";
import type { WeatherConditions } from "@/lib/simulation/types";

export interface WeatherProfile {
  /** Mean daily temperature, °C. */
  baseTemperatureC: number;
  /** Half the peak-to-trough daily temperature swing, °C. */
  temperatureAmplitudeC: number;
  /** Mean relative humidity, %. */
  baseHumidityPct: number;
  /** Half the peak-to-trough daily humidity swing, %. */
  humidityAmplitudePct: number;
  /** Baseline cloud cover factor, 0 (fully overcast) to 1 (clear sky). */
  baseCloudCoverFactor: number;
}

/** Corpus Christi, TX — warm, humid, coastal subtropical. A planning assumption, not a climate record. */
export const CORPUS_CHRISTI_WEATHER_PROFILE: WeatherProfile = {
  baseTemperatureC: 27,
  temperatureAmplitudeC: 6,
  baseHumidityPct: 70,
  humidityAmplitudePct: 15,
  baseCloudCoverFactor: 0.85,
};

/**
 * Temperature peaks mid-afternoon (~15:00) and troughs before dawn (~5:00);
 * humidity moves roughly opposite temperature (drier in the afternoon heat).
 */
export function syntheticWeatherAt(
  hourOfDay: number,
  profile: WeatherProfile = CORPUS_CHRISTI_WEATHER_PROFILE,
  rng?: SeededRng,
): WeatherConditions {
  const tempPhase = ((hourOfDay - 15) / 24) * 2 * Math.PI;
  const temperatureC = profile.baseTemperatureC - profile.temperatureAmplitudeC * Math.cos(tempPhase);

  const humidityPhase = ((hourOfDay - 5) / 24) * 2 * Math.PI;
  const relativeHumidityPct = clamp(
    profile.baseHumidityPct + profile.humidityAmplitudePct * Math.cos(humidityPhase),
    5,
    100,
  );

  const noise = rng ? rng.range(-0.05, 0.05) : 0;
  const cloudCoverFactor = clamp(profile.baseCloudCoverFactor + noise, 0, 1);

  return { temperatureC, relativeHumidityPct, cloudCoverFactor };
}

/** Generates an hourly (or custom-interval) weather forecast for the next `hours` hours. Clearly a "forecast" dataSource, never "measured". */
export function generateSyntheticForecast(
  startHourOfDay: number,
  hours: number,
  intervalHours: number,
  profile: WeatherProfile = CORPUS_CHRISTI_WEATHER_PROFILE,
  rng?: SeededRng,
): Array<{ hourOfDay: number; conditions: WeatherConditions }> {
  const points: Array<{ hourOfDay: number; conditions: WeatherConditions }> = [];
  for (let h = 0; h < hours; h += intervalHours) {
    const hourOfDay = (startHourOfDay + h) % 24;
    points.push({ hourOfDay, conditions: syntheticWeatherAt(hourOfDay, profile, rng) });
  }
  return points;
}
