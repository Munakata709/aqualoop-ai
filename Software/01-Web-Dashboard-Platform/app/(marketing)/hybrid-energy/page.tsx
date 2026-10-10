"use client";

import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { EnergyFlowDiagram } from "@/components/simulation/EnergyFlowDiagram";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { solarPowerKw, installedCapacityKw } from "@/lib/physics/solar";
import { resolveEnergyDispatch } from "@/lib/physics/energyBalance";
import type { BatteryConfig } from "@/lib/physics/battery";
import type { GeneratorConfig } from "@/lib/physics/generator";

function Row({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <Slider className="mt-2" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)} aria-label={label} />
    </div>
  );
}

export default function HybridEnergyPage() {
  const [panelCount, setPanelCount] = useState(145);
  const [performanceFactor, setPerformanceFactor] = useState(0.8);
  const [cloudCoverPct, setCloudCoverPct] = useState(0);
  const [peakSunHours, setPeakSunHours] = useState(5);
  const [hourOfDay, setHourOfDay] = useState(13);
  const [requestedLoadKw, setRequestedLoadKw] = useState(24);
  const [batterySocPct, setBatterySocPct] = useState(60);
  const [allowGenerator, setAllowGenerator] = useState(true);
  const [allowBattery, setAllowBattery] = useState(true);

  const batteryConfig: BatteryConfig = {
    nominalCapacityKwh: 120,
    usableFraction: 0.9,
    chargePowerLimitKw: 60,
    dischargePowerLimitKw: 60,
    roundTripEfficiency: 0.9,
    minReserveFraction: 0.15,
    maxSocFraction: 0.95,
  };
  const generatorConfig: GeneratorConfig = {
    ratedPowerKw: 40,
    electricalEfficiency: 0.25,
    fuelPricePerMmBtu: 8,
    minLoadFraction: 0.2,
    minRuntimeSteps: 4,
  };

  const solarConfig = { panelCount, panelRatingW: 550, performanceFactor, cloudCoverFactor: 1 - cloudCoverPct / 100 };
  const usableCapacityKwh = batteryConfig.nominalCapacityKwh * batteryConfig.usableFraction;

  const result = useMemo(() => {
    const solarAvailableKw = solarPowerKw(solarConfig, hourOfDay, peakSunHours);
    const dispatch = resolveEnergyDispatch({
      requestedLoadKw,
      solarAvailableKw,
      batteryConfig,
      batteryState: { stateOfChargeKwh: (batterySocPct / 100) * usableCapacityKwh },
      generatorConfig,
      stepHours: 1,
      allowGenerator,
      allowBattery,
    });
    return { solarAvailableKw, dispatch };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelCount, performanceFactor, cloudCoverPct, peakSunHours, hourOfDay, requestedLoadKw, batterySocPct, allowGenerator, allowBattery]);

  const solarCapacityKw = installedCapacityKw(solarConfig);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="Hybrid Energy System"
        title="Solar, battery, and natural gas working together"
        description="Every number below comes from the same dispatch model the fleet simulation uses: solar serves load first, surplus charges the battery, then the battery discharges, and the generator covers whatever remains — never fabricating energy."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Row label="Solar panels" value={panelCount} unit="" min={0} max={300} step={5} onChange={setPanelCount} />
          <Row label="PV performance factor" value={performanceFactor} unit="" min={0.4} max={1} step={0.05} onChange={setPerformanceFactor} />
          <Row label="Cloud cover" value={cloudCoverPct} unit="%" min={0} max={100} step={5} onChange={setCloudCoverPct} />
          <Row label="Peak sun hours" value={peakSunHours} unit=" h" min={2} max={7} step={0.5} onChange={setPeakSunHours} />
          <Row label="Time of day" value={hourOfDay} unit=":00" min={0} max={23.5} step={0.5} onChange={setHourOfDay} />
          <Row label="Requested AWG load" value={requestedLoadKw} unit=" kW" min={0} max={40} step={1} onChange={setRequestedLoadKw} />
          <Row label="Battery state of charge" value={batterySocPct} unit="%" min={0} max={100} step={1} onChange={setBatterySocPct} />

          <div className="flex items-center justify-between">
            <span className="text-sm">Allow generator</span>
            <Switch checked={allowGenerator} onCheckedChange={setAllowGenerator} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Allow battery</span>
            <Switch checked={allowBattery} onCheckedChange={setAllowBattery} />
          </div>
        </div>

        <div className="space-y-6">
          <EnergyFlowDiagram
            solarToAwgKw={result.dispatch.solarUsedKw}
            solarToBatteryKw={result.dispatch.batteryChargeKw}
            batteryToAwgKw={result.dispatch.batteryDischargeKw}
            generatorToAwgKw={result.dispatch.generatorKw}
            unmetKw={result.dispatch.unmetKw}
            maxKw={Math.max(requestedLoadKw, solarCapacityKw, 1)}
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Solar available", value: `${result.solarAvailableKw.toFixed(1)} kW`, cap: `of ${solarCapacityKw.toFixed(0)} kW installed` },
              { label: "Generator fuel cost", value: `$${result.dispatch.generatorResult.fuelCostUsd.toFixed(2)}/h`, cap: result.dispatch.generatorResult.running ? "running" : "off" },
              { label: "Solar curtailed", value: `${result.dispatch.solarCurtailedKw.toFixed(1)} kW`, cap: "battery full or no load" },
              { label: "Total served", value: `${(result.dispatch.totalLoadKw - result.dispatch.unmetKw).toFixed(1)} kW`, cap: `of ${result.dispatch.totalLoadKw.toFixed(1)} kW requested` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.cap}</p>
                <DataSourceBadge source="estimated" className="mt-2" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Battery state of charge</span>
              <span className="font-mono text-muted-foreground">{batterySocPct.toFixed(0)}%</span>
            </div>
            <Progress value={batterySocPct} className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
