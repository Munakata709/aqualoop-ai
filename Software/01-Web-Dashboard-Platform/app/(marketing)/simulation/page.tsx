"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { WeatherControlPanel } from "@/components/simulation/WeatherControlPanel";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAwgSandbox } from "@/lib/sandbox/useAwgSandbox";
import { estimateWaterProductionRate } from "@/lib/physics/water";
import { AQUALOOP_STANDARD_PROFILE, ratedProductionLPerDay } from "@/lib/equipment/awgProfiles";

export default function SimulationPage() {
  const { controls, setControls, derived } = useAwgSandbox();

  const humidityCurve = useMemo(() => {
    const ratedLPerDay = ratedProductionLPerDay(AQUALOOP_STANDARD_PROFILE);
    const points = [];
    for (let rh = 5; rh <= 100; rh += 5) {
      const result = estimateWaterProductionRate({ temperatureC: controls.temperatureC, relativeHumidityPct: rh }, ratedLPerDay);
      points.push({ rh, lPerHour: Number(result.productionRateLPerHour.toFixed(3)) });
    }
    return points;
  }, [controls.temperatureC]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="Live Simulation"
        title="One AWG, every variable in your hands"
        description="This sandbox uses the same documented physics model as the operations dashboard. Nothing here is measured hardware — it's a transparent, editable estimate."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <WeatherControlPanel controls={controls} onChange={setControls} />

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Gauge label="Water production" value={`${derived.productionRateGallonsPerHour.toFixed(2)} gal/h`} source="estimated" />
            <Gauge label="Electrical power" value={`${derived.powerKw.toFixed(2)} kW`} source="estimated" />
            <Gauge label="Specific energy" value={`${derived.specificEnergyKwhPerL.toFixed(3)} kWh/L`} source="estimated" />
            <Gauge
              label="Solar vs. demand"
              value={derived.solarCoversLoad ? "Solar covers it" : "Needs battery/gas"}
              source="estimated"
            />
          </div>

          {!derived.feasible && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">{derived.reason}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Production vs. humidity at {controls.temperatureC.toFixed(0)}°C</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={humidityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rh" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" label={{ value: "Relative humidity (%)", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" label={{ value: "L/hour", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip formatter={(v) => `${Number(v)} L/h`} labelFormatter={(l) => `${l}% RH`} />
                    <Line type="monotone" dataKey="lPerHour" stroke="var(--color-water)" strokeWidth={2} dot={false} />
                    <ReferenceDot x={controls.relativeHumidityPct} y={derived.productionRateLPerHour} r={5} fill="var(--primary)" stroke="var(--card)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The highlighted dot is your current slider position. This is a documented simplified model — see
                /technology and ASSUMPTIONS.md for what a real manufacturer curve would change.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Gauge({ label, value, source }: { label: string; value: string; source: "simulated" | "estimated" | "measured" | "forecast" | "user-entered" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <DataSourceBadge source={source} className="mt-2" />
    </div>
  );
}
