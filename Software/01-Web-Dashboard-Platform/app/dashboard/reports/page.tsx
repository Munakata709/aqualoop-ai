"use client";

import { FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFleetStore } from "@/lib/store/fleetStore";
import { toCsv, downloadCsv } from "@/lib/export/csv";
import { litersToGallons } from "@/lib/units";

export default function ReportsPage() {
  const awgProfiles = useFleetStore((s) => s.awgProfiles);
  const awgStates = useFleetStore((s) => s.awgStates);
  const telemetry = useFleetStore((s) => s.telemetry);
  const history = useFleetStore((s) => s.history);
  const seed = useFleetStore((s) => s.seed);

  function exportFleetSnapshot() {
    const rows = awgProfiles.map((profile) => {
      const state = awgStates.find((s) => s.id === profile.id);
      const t = telemetry[profile.id];
      return {
        awgId: profile.id,
        cluster: profile.clusterId,
        operatingMode: state?.operatingMode ?? "",
        healthStatus: state?.healthStatus ?? "",
        healthScore: state?.healthScore ?? "",
        tankVolumeGal: state ? litersToGallons(state.tankVolumeL).toFixed(1) : "",
        tankCapacityGal: state ? litersToGallons(state.tankCapacityL).toFixed(1) : "",
        totalProducedTodayGal: state ? litersToGallons(state.totalWaterProducedTodayL).toFixed(1) : "",
        totalEnergyTodayKwh: state ? state.totalEnergyConsumedTodayKwh.toFixed(2) : "",
        productionRateGalPerHour: t ? litersToGallons(t.productionRateLPerHour).toFixed(2) : "",
        electricalPowerKw: t ? t.electricalPowerKw.toFixed(2) : "",
        running: t ? String(t.running) : "",
        dataSource: t?.dataSource ?? "simulated",
      };
    });
    downloadCsv(`aqualoop-fleet-snapshot-seed${seed}.csv`, toCsv(rows));
  }

  function exportHistory() {
    const rows = history.map((h) => ({
      step: h.step,
      hourOfDay: h.hourOfDay,
      totalWaterL: h.totalWaterL.toFixed(2),
      totalEnergyKwh: h.totalEnergyKwh.toFixed(2),
      solarKw: h.solarKw.toFixed(2),
      batteryKw: h.batteryKw.toFixed(2),
      generatorKw: h.generatorKw.toFixed(2),
      unmetKw: h.unmetKw.toFixed(2),
      avgTankFillPct: h.avgTankFillPct.toFixed(1),
    }));
    downloadCsv(`aqualoop-history-seed${seed}.csv`, toCsv(rows));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports &amp; Data Export</h1>
        <p className="text-sm text-muted-foreground">Export the current simulation state as CSV for offline analysis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet snapshot</CardTitle>
          <CardDescription>One row per AWG — current tank levels, production, and status (seed {seed}).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportFleetSnapshot}>
            <FileDown className="h-4 w-4" /> Export fleet snapshot (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulation history</CardTitle>
          <CardDescription>{history.length} recorded steps of fleet-wide aggregates this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportHistory} disabled={history.length === 0}>
            <FileDown className="h-4 w-4" /> Export history (CSV)
          </Button>
          {history.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Run the simulation clock to record history first.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
