"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useLiveWeather } from "@/lib/weather/useLiveWeather";

export function LiveWeatherCard() {
  const { current, forecast, loading, error } = useLiveWeather();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Live Corpus Christi Weather</CardTitle>
          <CardDescription>via OpenWeatherMap — not the simulation&apos;s synthetic model</CardDescription>
        </div>
        {current && <DataSourceBadge source="measured" />}
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading live conditions…</p>}

        {error && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {error} {error.includes("not configured") && "Set OPENWEATHER_API_KEY to enable this card — see .env.example."}
          </p>
        )}

        {current && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Temperature" value={`${current.temperatureC.toFixed(1)} °C`} />
              <Stat label="Relative humidity" value={`${current.relativeHumidityPct.toFixed(0)}%`} />
              <Stat label="Cloud cover" value={`${current.cloudCoverPct.toFixed(0)}%`} />
              <Stat label="Wind" value={`${current.windSpeedMPerS.toFixed(1)} m/s`} />
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {current.conditionDescription} in {current.locationName} · updated {new Date(current.timestampIso).toLocaleTimeString()}
            </p>

            {forecast.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Next few forecast points <DataSourceBadge source="forecast" className="ml-1 normal-case" />
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {forecast.slice(0, 6).map((f) => (
                    <div key={f.timestampIso} className="min-w-[90px] rounded-lg border border-border bg-secondary/40 p-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.timestampIso).toLocaleTimeString(undefined, { hour: "numeric" })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{f.temperatureC.toFixed(0)}°C</p>
                      <p className="text-xs text-muted-foreground">{f.relativeHumidityPct.toFixed(0)}% RH</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
