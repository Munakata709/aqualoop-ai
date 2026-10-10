/**
 * OpenWeatherMap integration — the real forecast API ROADMAP.md said would
 * eventually replace reliance on the synthetic weather model
 * (lib/simulation/weather.ts). That synthetic model is untouched and still
 * drives the core fleet simulation (it must keep working with zero external
 * API keys, per the project's design principle); this module is additive,
 * surfacing real current/forecast conditions for Corpus Christi wherever a
 * live-weather feature wants genuinely measured data instead.
 *
 * Server-only: fetchCurrentWeather/fetchForecast must only run in API route
 * handlers (app/api/weather/route.ts), never in client components, so the
 * API key is never exposed to the browser.
 *
 * API docs: https://openweathermap.org/api
 */

import { clamp } from "@/lib/units";

export const CORPUS_CHRISTI_COORDS = { lat: 27.7676, lon: -97.3964 } as const;

export interface LiveWeatherCurrent {
  dataSource: "measured";
  timestampIso: string;
  locationName: string;
  temperatureC: number;
  relativeHumidityPct: number;
  cloudCoverPct: number;
  /** 1 - cloudCoverPct/100, matching the cloudCoverFactor convention in lib/physics/solar.ts. */
  cloudCoverFactor: number;
  conditionDescription: string;
  iconCode: string;
  windSpeedMPerS: number;
}

export interface LiveWeatherForecastPoint {
  dataSource: "forecast";
  timestampIso: string;
  temperatureC: number;
  relativeHumidityPct: number;
  cloudCoverPct: number;
  cloudCoverFactor: number;
  conditionDescription: string;
}

const OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/2.5";

/** Pure — parses OpenWeatherMap's Current Weather Data response. Returns null on unrecognized shape rather than throwing. */
export function parseCurrentWeatherResponse(json: unknown): LiveWeatherCurrent | null {
  if (!isRecord(json)) return null;
  const main = json.main;
  const weatherArr = json.weather;
  const clouds = json.clouds;
  const wind = json.wind;
  if (!isRecord(main) || !Array.isArray(weatherArr) || weatherArr.length === 0 || !isRecord(clouds)) return null;

  const weather0 = weatherArr[0];
  if (!isRecord(weather0)) return null;

  const temperatureC = asNumber(main.temp);
  const relativeHumidityPct = asNumber(main.humidity);
  const cloudCoverPct = asNumber(clouds.all);
  const dt = asNumber(json.dt);
  if (temperatureC === null || relativeHumidityPct === null || cloudCoverPct === null || dt === null) return null;

  return {
    dataSource: "measured",
    timestampIso: new Date(dt * 1000).toISOString(),
    locationName: typeof json.name === "string" ? json.name : "Corpus Christi",
    temperatureC,
    relativeHumidityPct,
    cloudCoverPct,
    cloudCoverFactor: clamp(1 - cloudCoverPct / 100, 0, 1),
    conditionDescription: typeof weather0.description === "string" ? weather0.description : "unknown",
    iconCode: typeof weather0.icon === "string" ? weather0.icon : "01d",
    windSpeedMPerS: isRecord(wind) ? (asNumber(wind.speed) ?? 0) : 0,
  };
}

/** Pure — parses OpenWeatherMap's 5 Day / 3 Hour Forecast response. Returns [] on unrecognized shape rather than throwing. */
export function parseForecastResponse(json: unknown): LiveWeatherForecastPoint[] {
  if (!isRecord(json) || !Array.isArray(json.list)) return [];

  const points: LiveWeatherForecastPoint[] = [];
  for (const entry of json.list) {
    if (!isRecord(entry)) continue;
    const main = entry.main;
    const weatherArr = entry.weather;
    const clouds = entry.clouds;
    if (!isRecord(main) || !Array.isArray(weatherArr) || weatherArr.length === 0 || !isRecord(clouds)) continue;
    const weather0 = weatherArr[0];
    if (!isRecord(weather0)) continue;

    const temperatureC = asNumber(main.temp);
    const relativeHumidityPct = asNumber(main.humidity);
    const cloudCoverPct = asNumber(clouds.all);
    const dt = asNumber(entry.dt);
    if (temperatureC === null || relativeHumidityPct === null || cloudCoverPct === null || dt === null) continue;

    points.push({
      dataSource: "forecast",
      timestampIso: new Date(dt * 1000).toISOString(),
      temperatureC,
      relativeHumidityPct,
      cloudCoverPct,
      cloudCoverFactor: clamp(1 - cloudCoverPct / 100, 0, 1),
      conditionDescription: typeof weather0.description === "string" ? weather0.description : "unknown",
    });
  }
  return points;
}

export async function fetchCurrentWeather(apiKey: string, coords = CORPUS_CHRISTI_COORDS): Promise<LiveWeatherCurrent> {
  const url = `${OPENWEATHERMAP_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`OpenWeatherMap current-weather request failed: ${response.status} ${await response.text()}`);
  }
  const parsed = parseCurrentWeatherResponse(await response.json());
  if (!parsed) throw new Error("OpenWeatherMap current-weather response did not match the expected shape.");
  return parsed;
}

export async function fetchForecast(apiKey: string, coords = CORPUS_CHRISTI_COORDS): Promise<LiveWeatherForecastPoint[]> {
  const url = `${OPENWEATHERMAP_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`OpenWeatherMap forecast request failed: ${response.status} ${await response.text()}`);
  }
  return parseForecastResponse(await response.json());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
