import { describe, it, expect } from "vitest";
import { parseCurrentWeatherResponse, parseForecastResponse } from "@/lib/weather/openWeatherMap";

// Representative shapes from https://openweathermap.org/current and
// https://openweathermap.org/forecast5 — trimmed to the fields we read.
const SAMPLE_CURRENT_RESPONSE = {
  coord: { lon: -97.3964, lat: 27.7676 },
  weather: [{ id: 801, main: "Clouds", description: "few clouds", icon: "02d" }],
  main: { temp: 29.4, feels_like: 33.1, temp_min: 27.8, temp_max: 31.2, pressure: 1014, humidity: 68 },
  clouds: { all: 20 },
  wind: { speed: 4.6, deg: 150 },
  dt: 1760000000,
  name: "Corpus Christi",
};

const SAMPLE_FORECAST_RESPONSE = {
  list: [
    {
      dt: 1760000000,
      main: { temp: 29.4, humidity: 68 },
      weather: [{ description: "few clouds" }],
      clouds: { all: 20 },
    },
    {
      dt: 1760010800,
      main: { temp: 31.1, humidity: 55 },
      weather: [{ description: "clear sky" }],
      clouds: { all: 5 },
    },
    { dt: 1760021600, main: { temp: "not-a-number", humidity: 60 }, weather: [{ description: "x" }], clouds: { all: 10 } },
  ],
};

describe("parseCurrentWeatherResponse", () => {
  it("parses a well-formed response", () => {
    const result = parseCurrentWeatherResponse(SAMPLE_CURRENT_RESPONSE);
    expect(result).not.toBeNull();
    expect(result?.dataSource).toBe("measured");
    expect(result?.temperatureC).toBe(29.4);
    expect(result?.relativeHumidityPct).toBe(68);
    expect(result?.cloudCoverPct).toBe(20);
    expect(result?.locationName).toBe("Corpus Christi");
    expect(result?.conditionDescription).toBe("few clouds");
  });

  it("derives cloudCoverFactor as 1 - cloudCoverPct/100, matching lib/physics/solar.ts's convention", () => {
    const result = parseCurrentWeatherResponse(SAMPLE_CURRENT_RESPONSE);
    expect(result?.cloudCoverFactor).toBeCloseTo(0.8, 6);
  });

  it("converts the unix dt field to an ISO timestamp", () => {
    const result = parseCurrentWeatherResponse(SAMPLE_CURRENT_RESPONSE);
    expect(result?.timestampIso).toBe(new Date(1760000000 * 1000).toISOString());
  });

  it("returns null (never throws) for malformed input", () => {
    expect(parseCurrentWeatherResponse(null)).toBeNull();
    expect(parseCurrentWeatherResponse({})).toBeNull();
    expect(parseCurrentWeatherResponse({ main: {}, weather: [], clouds: {} })).toBeNull();
    expect(parseCurrentWeatherResponse("not an object")).toBeNull();
  });

  it("defaults locationName when name is missing", () => {
    const { name, ...withoutName } = SAMPLE_CURRENT_RESPONSE;
    void name;
    const result = parseCurrentWeatherResponse(withoutName);
    expect(result?.locationName).toBe("Corpus Christi");
  });
});

describe("parseForecastResponse", () => {
  it("parses every well-formed entry in the list", () => {
    const result = parseForecastResponse(SAMPLE_FORECAST_RESPONSE);
    // 2 well-formed entries + 1 malformed (non-numeric temp) that should be skipped, not crash the whole parse.
    expect(result.length).toBe(2);
    expect(result[0].dataSource).toBe("forecast");
    expect(result[0].temperatureC).toBe(29.4);
    expect(result[1].temperatureC).toBe(31.1);
  });

  it("skips malformed entries instead of throwing", () => {
    const result = parseForecastResponse(SAMPLE_FORECAST_RESPONSE);
    expect(result.every((p) => Number.isFinite(p.temperatureC))).toBe(true);
  });

  it("returns an empty array (never throws) for malformed input", () => {
    expect(parseForecastResponse(null)).toEqual([]);
    expect(parseForecastResponse({})).toEqual([]);
    expect(parseForecastResponse({ list: "not an array" })).toEqual([]);
  });
});
