"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Droplets, Zap, Gauge, DollarSign, Sun, Flame, Battery, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useFleetStore } from "@/lib/store/fleetStore";
import { litersToGallons, safeDivide } from "@/lib/units";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tooltip,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tooltip: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <UiTooltip>
            <TooltipTrigger className="text-xs text-muted-foreground underline-offset-2 hover:underline">?</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </UiTooltip>
        </div>
        <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function FleetOverviewPage() {
  const telemetry = useFleetStore((s) => s.telemetry);
  const awgStates = useFleetStore((s) => s.awgStates);
  const awgProfiles = useFleetStore((s) => s.awgProfiles);
  const clusters = useFleetStore((s) => s.clusters);
  const history = useFleetStore((s) => s.history);
  const alerts = useFleetStore((s) => s.alerts);

  const telemetryValues = Object.values(telemetry);

  const kpis = useMemo(() => {
    const totalWaterTodayL = awgStates.reduce((sum, s) => sum + s.totalWaterProducedTodayL, 0);
    const currentRateLPerHour = telemetryValues.reduce((sum, t) => sum + t.productionRateLPerHour, 0);
    const totalPowerKw = telemetryValues.reduce((sum, t) => sum + t.electricalPowerKw, 0);
    const totalEnergyTodayKwh = awgStates.reduce((sum, s) => sum + s.totalEnergyConsumedTodayKwh, 0);
    const avgKwhPerL = safeDivide(totalEnergyTodayKwh, totalWaterTodayL, 0);
    const solarKw = telemetryValues.reduce((sum, t) => sum + t.solarContributionKw, 0);
    const batteryKw = telemetryValues.reduce((sum, t) => sum + t.batteryContributionKw, 0);
    const generatorKw = telemetryValues.reduce((sum, t) => sum + t.generatorContributionKw, 0);
    const solarSharePct = safeDivide(solarKw, solarKw + batteryKw + generatorKw, 0) * 100;
    const machinesOnline = awgStates.filter((s) => s.healthStatus !== "offline").length;
    const machinesRunning = telemetryValues.filter((t) => t.running).length;
    const avgTankFillPct = safeDivide(awgStates.reduce((sum, s) => sum + s.tankVolumeL / s.tankCapacityL, 0), awgStates.length, 0) * 100;
    const totalTankVolumeGal = litersToGallons(awgStates.reduce((sum, s) => sum + s.tankVolumeL, 0));
    const activeAlerts = alerts.filter((a) => !a.resolvedAtIso).length;
    const estCostPerGallon = 0.06; // reference planning assumption, shown for context — see /dashboard/financials for the full model

    return {
      totalWaterTodayGal: litersToGallons(totalWaterTodayL),
      currentRateGalPerHour: litersToGallons(currentRateLPerHour),
      totalPowerKw,
      avgKwhPerL,
      solarSharePct,
      generatorKw,
      batteryKw,
      machinesOnline,
      machinesRunning,
      avgTankFillPct,
      totalTankVolumeGal,
      activeAlerts,
      estCostPerGallon,
    };
  }, [awgStates, telemetryValues, alerts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Fleet Overview</h1>
        <p className="text-sm text-muted-foreground">20 simulated AWGs across 5 Corpus Christi clusters.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={Droplets} label="Produced today" value={`${kpis.totalWaterTodayGal.toFixed(0)} gal`} tooltip="Sum of each AWG's cumulative water produced since simulation start, converted to gallons." />
        <KpiCard icon={Gauge} label="Current rate" value={`${kpis.currentRateGalPerHour.toFixed(1)} gal/h`} tooltip="Sum of every AWG's instantaneous production rate this step." />
        <KpiCard icon={Zap} label="Fleet power" value={`${kpis.totalPowerKw.toFixed(1)} kW`} tooltip="Total electrical power drawn by all running AWGs this step." />
        <KpiCard icon={Gauge} label="Avg kWh/L today" value={kpis.avgKwhPerL.toFixed(3)} tooltip="Cumulative energy consumed divided by cumulative water produced — lower is better." />
        <KpiCard icon={Sun} label="Solar share" value={`${kpis.solarSharePct.toFixed(0)}%`} tooltip="Share of this step's electrical energy supplied by solar vs. battery/generator." />
        <KpiCard icon={Flame} label="Generator load" value={`${kpis.generatorKw.toFixed(1)} kW`} tooltip="Natural gas generator output this step, aggregated across clusters." />
        <KpiCard icon={Battery} label="Machines online" value={`${kpis.machinesOnline}/20`} sub={`${kpis.machinesRunning} running now`} tooltip="AWGs not marked offline, vs. how many are actively producing water this step." />
        <KpiCard icon={Droplets} label="Water stored" value={`${kpis.totalTankVolumeGal.toFixed(0)} gal`} sub={`${kpis.avgTankFillPct.toFixed(0)}% avg fill`} tooltip="Sum of all tank volumes across the fleet right now." />
        <KpiCard icon={DollarSign} label="Reference cost/gal" value={`$${kpis.estCostPerGallon.toFixed(2)}`} sub="see Financials" tooltip="A reference planning figure — open Financial Analytics for the full, editable cost model." />
        <KpiCard icon={AlertTriangle} label="Active alerts" value={String(kpis.activeAlerts)} tooltip="Unresolved alerts raised by the simulation (faults, unmet demand, etc.)." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Water production</CardTitle>
            <CardDescription>Fleet-wide liters produced per step <DataSourceBadge source="simulated" className="ml-1" /></CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Energy mix</CardTitle>
            <CardDescription>Solar / battery / generator kW <DataSourceBadge source="simulated" className="ml-1" /></CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="solarKw" stroke="var(--color-solar)" dot={false} name="Solar" />
                <Line type="monotone" dataKey="batteryKw" stroke="var(--color-battery)" dot={false} name="Battery" />
                <Line type="monotone" dataKey="generatorKw" stroke="var(--color-gas)" dot={false} name="Generator" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Fleet — all 20 AWGs</CardTitle>
            <CardDescription>Click any unit for its full detail page.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {awgProfiles.map((profile) => {
              const state = awgStates.find((s) => s.id === profile.id);
              const t = telemetry[profile.id];
              const cluster = clusters.find((c) => c.id === profile.clusterId);
              const fillPct = state ? (state.tankVolumeL / state.tankCapacityL) * 100 : 0;
              return (
                <Link
                  key={profile.id}
                  href={`/dashboard/awg/${profile.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{profile.id}</span>
                    <Badge variant={t?.running ? "default" : "outline"} className="text-[10px]">
                      {state?.healthStatus === "offline" ? "Offline" : t?.running ? "Running" : "Standby"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{cluster?.name}</span>
                  <span className="text-xs text-muted-foreground">Tank {fillPct.toFixed(0)}% · {t ? `${t.productionRateLPerHour.toFixed(1)} L/h` : "—"}</span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
