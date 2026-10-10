"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useFleetStore } from "@/lib/store/fleetStore";
import { litersToGallons } from "@/lib/units";
import type { AwgState } from "@/lib/simulation/types";

export function AwgDetailClient({ awgId }: { awgId: string }) {
  const profile = useFleetStore((s) => s.awgProfiles.find((p) => p.id === awgId));
  const state = useFleetStore((s) => s.awgStates.find((st) => st.id === awgId));
  const telemetry = useFleetStore((s) => s.telemetry[awgId]);
  const cluster = useFleetStore((s) => s.clusters.find((c) => c.id === profile?.clusterId));
  const lastDecision = useFleetStore((s) => s.lastDecision);
  const setAwgOperatingMode = useFleetStore((s) => s.setAwgOperatingMode);

  if (!profile || !state) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to fleet
        </Link>
        <p className="text-sm text-muted-foreground">No AWG found with id &ldquo;{awgId}&rdquo;.</p>
      </div>
    );
  }

  const fillPct = (state.tankVolumeL / state.tankCapacityL) * 100;
  const explanation = lastDecision?.explanations[awgId];

  const requestMode = (mode: AwgState["operatingMode"]) => {
    if (mode === "manual-run" && state.tankVolumeL >= state.tankCapacityL) {
      alert("Command rejected: tank is full. Running would overflow storage.");
      return;
    }
    if (mode === "manual-run" && state.healthStatus === "offline") {
      alert("Command rejected: AWG is offline and cannot be started remotely.");
      return;
    }
    setAwgOperatingMode(awgId, mode);
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to fleet
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.id} · {cluster?.name} · {profile.manufacturer} {profile.model}</p>
        </div>
        <Badge variant={telemetry?.running ? "default" : "outline"}>
          {state.healthStatus === "offline" ? "Offline" : telemetry?.running ? "Running" : "Standby"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Temperature" value={telemetry ? `${telemetry.temperatureC.toFixed(1)} °C` : "—"} source="simulated" />
        <Stat label="Relative humidity" value={telemetry ? `${telemetry.relativeHumidityPct.toFixed(0)}%` : "—"} source="simulated" />
        <Stat label="Dew point" value={telemetry ? `${telemetry.dewPointC.toFixed(1)} °C` : "—"} source="estimated" />
        <Stat label="Production rate" value={telemetry ? `${litersToGallons(telemetry.productionRateLPerHour).toFixed(2)} gal/h` : "—"} source="estimated" />
        <Stat label="Total produced" value={`${litersToGallons(state.totalWaterProducedTodayL).toFixed(0)} gal`} source="simulated" />
        <Stat label="Electrical power" value={telemetry ? `${telemetry.electricalPowerKw.toFixed(2)} kW` : "—"} source="estimated" />
        <Stat label="kWh / L" value={telemetry ? telemetry.energyIntensityKwhPerL.toFixed(3) : "—"} source="estimated" />
        <Stat label="Health score" value={`${state.healthScore.toFixed(0)}/100`} source="simulated" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Energy source this step</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-solar font-semibold">{telemetry?.solarContributionKw.toFixed(2) ?? "0.00"} kW</p>
              <p className="text-xs text-muted-foreground">Solar</p>
            </div>
            <div>
              <p className="text-battery font-semibold">{telemetry?.batteryContributionKw.toFixed(2) ?? "0.00"} kW</p>
              <p className="text-xs text-muted-foreground">Battery</p>
            </div>
            <div>
              <p className="text-gas font-semibold">{telemetry?.generatorContributionKw.toFixed(2) ?? "0.00"} kW</p>
              <p className="text-xs text-muted-foreground">Generator</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tank level</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={fillPct} />
            <p className="mt-2 text-sm text-muted-foreground">
              {litersToGallons(state.tankVolumeL).toFixed(0)} / {litersToGallons(state.tankCapacityL).toFixed(0)} gal ({fillPct.toFixed(0)}%)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI recommendation</CardTitle>
          <CardDescription>Why the scheduler made its current decision for this unit.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{explanation ?? "No decision recorded yet for this step — advance the simulation clock."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controls</CardTitle>
          <CardDescription>Manual commands are simulated and respect the same safety constraints as the AI scheduler.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={state.operatingMode === "automatic" ? "default" : "outline"} size="sm" onClick={() => requestMode("automatic")}>
            Automatic mode
          </Button>
          <Button variant={state.operatingMode === "manual-run" ? "default" : "outline"} size="sm" onClick={() => requestMode("manual-run")}>
            Authorized run request
          </Button>
          <Button variant={state.operatingMode === "manual-pause" ? "default" : "outline"} size="sm" onClick={() => requestMode("manual-pause")}>
            Manual pause
          </Button>
          <Button variant={state.operatingMode === "maintenance" ? "default" : "outline"} size="sm" onClick={() => requestMode("maintenance")}>
            Maintenance mode
          </Button>
        </CardContent>
      </Card>

      {state.activeFaultCodes.length > 0 && (
        <Card className="border-critical/40">
          <CardHeader>
            <CardTitle className="text-base text-critical">Active faults</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{state.activeFaultCodes.join(", ")}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, source }: { label: string; value: string; source: "simulated" | "estimated" | "measured" | "forecast" | "user-entered" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
      <DataSourceBadge source={source} className="mt-2" />
    </div>
  );
}
