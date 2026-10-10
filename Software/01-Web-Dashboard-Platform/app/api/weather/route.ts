import { NextResponse } from "next/server";
import { fetchCurrentWeather, fetchForecast } from "@/lib/weather/openWeatherMap";

/**
 * Proxies OpenWeatherMap so the API key never reaches the browser.
 * Returns 503 (not a crash) when OPENWEATHER_API_KEY isn't configured —
 * the rest of the app must keep working with zero external API keys.
 */
export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENWEATHER_API_KEY is not configured on the server. Live weather is unavailable; the simulation's synthetic weather model is unaffected." },
      { status: 503 },
    );
  }

  try {
    const [current, forecast] = await Promise.all([fetchCurrentWeather(apiKey), fetchForecast(apiKey)]);
    return NextResponse.json({ current, forecast });
  } catch (err) {
    console.error("Live weather fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch live weather from OpenWeatherMap." }, { status: 502 });
  }
}
