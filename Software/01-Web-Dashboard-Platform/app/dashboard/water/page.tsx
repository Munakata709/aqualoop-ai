"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useFleetStore } from "@/lib/store/fleetStore";
import { litersToGallons } from "@/lib/units";

export default function WaterPage() {
  const clusters = useFleetStore((s) => s.clusters);
  const awgProfiles = useFleetStore((s) => s.awgProfiles);
  const awgStates = useFleetStore((s) => s.awgStates);
  const history = useFleetStore((s) => s.history);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Water Storage &amp; Demand</h1>
        <p className="text-sm text-muted-foreground">Tank levels across the fleet and fleet-wide production trend.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet water production</CardTitle>
          <CardDescription>
            Liters per step <DataSourceBadge source="simulated" className="ml-1" />
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)} L`} />
              <Area type="monotone" dataKey="totalWaterL" stroke="var(--color-water)" fill="var(--color-water)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {clusters.map((cluster) => (
        <Card key={cluster.id}>
          <CardHeader>
            <CardTitle className="text-base">{cluster.name}</CardTitle>
            <CardDescription>Demand target: {litersToGallons(cluster.waterDemandLPerDay).toFixed(0)} gal/day</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cluster.awgIds.map((awgId) => {
              const profile = awgProfiles.find((p) => p.id === awgId);
              const state = awgStates.find((s) => s.id === awgId);
              if (!profile || !state) return null;
              const fillPct = (state.tankVolumeL / state.tankCapacityL) * 100;
              const low = state.tankVolumeL < state.minReserveL;
              return (
                <div key={awgId} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-sm font-medium text-foreground">{awgId}</p>
                  <Progress value={fillPct} className="mt-2" />
                  <p className={`mt-1 text-xs ${low ? "text-warning" : "text-muted-foreground"}`}>
                    {litersToGallons(state.tankVolumeL).toFixed(0)} / {litersToGallons(state.tankCapacityL).toFixed(0)} gal
                    {low && " — below reserve"}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
