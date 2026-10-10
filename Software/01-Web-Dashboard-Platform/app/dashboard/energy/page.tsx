"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EnergyFlowDiagram } from "@/components/simulation/EnergyFlowDiagram";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useFleetStore } from "@/lib/store/fleetStore";
import { socFraction } from "@/lib/physics/battery";
import { installedCapacityKw } from "@/lib/physics/solar";

export default function EnergyPage() {
  const clusters = useFleetStore((s) => s.clusters);
  const clusterStates = useFleetStore((s) => s.clusterStates);
  const telemetry = useFleetStore((s) => s.telemetry);
  const [selectedClusterId, setSelectedClusterId] = useState(clusters[0]?.id);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId) ?? clusters[0];
  const selectedState = clusterStates.find((c) => c.id === selectedCluster.id)!;
  const clusterAwgTelemetry = Object.values(telemetry).filter((t) => selectedCluster.awgIds.includes(t.awgId));

  const solarToAwgKw = clusterAwgTelemetry.reduce((s, t) => s + t.solarContributionKw, 0);
  const batteryToAwgKw = clusterAwgTelemetry.reduce((s, t) => s + t.batteryContributionKw, 0);
  const generatorToAwgKw = clusterAwgTelemetry.reduce((s, t) => s + t.generatorContributionKw, 0);
  const unmetKw = clusterAwgTelemetry.reduce((s, t) => s + t.unmetKw, 0);
  const soc = socFraction(selectedCluster.battery, selectedState.batteryState) * 100;
  const solarCapacityKw = installedCapacityKw(selectedCluster.solar);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Solar &amp; Battery Management</h1>
        <p className="text-sm text-muted-foreground">Select a cluster to inspect its hybrid energy system.</p>
      </div>

      <Tabs value={selectedClusterId} onValueChange={(v) => setSelectedClusterId(v)}>
        <TabsList className="flex-wrap">
          {clusters.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={selectedClusterId} className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <EnergyFlowDiagram
              solarToAwgKw={solarToAwgKw}
              solarToBatteryKw={0}
              batteryToAwgKw={batteryToAwgKw}
              generatorToAwgKw={generatorToAwgKw}
              unmetKw={unmetKw}
              maxKw={Math.max(solarCapacityKw, selectedCluster.generator.ratedPowerKw, 1)}
            />
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Battery state of charge</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={soc} />
                  <p className="mt-2 text-sm text-muted-foreground">{soc.toFixed(0)}% of {selectedCluster.battery.nominalCapacityKwh} kWh nominal</p>
                  <DataSourceBadge source="simulated" className="mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Solar array</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{selectedCluster.solar.panelCount} panels × {selectedCluster.solar.panelRatingW} W</p>
                  <p>{solarCapacityKw.toFixed(1)} kW installed capacity</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Natural gas generator</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{selectedCluster.generator.ratedPowerKw} kW rated</p>
                  <p>{(selectedCluster.generator.electricalEfficiency * 100).toFixed(0)}% electrical efficiency</p>
                  <p>${selectedCluster.generator.fuelPricePerMmBtu}/MMBtu</p>
                  <p className="mt-1">{selectedState.generatorRunning ? "Currently running" : "Idle"}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
