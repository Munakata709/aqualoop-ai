"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useFleetStore } from "@/lib/store/fleetStore";
import { baselineController } from "@/lib/optimization/baseline";
import { decideFleetControl } from "@/lib/optimization/heuristic";
import { STRATEGIES, STRATEGY_LIST } from "@/lib/optimization/strategies";
import { runBaselineVsOptimizedComparison, runScheduleTimeline } from "@/lib/optimization/compare";
import type { ControllerContext } from "@/lib/optimization/types";
import type { StrategyId } from "@/lib/optimization/types";

const STATUS_COLOR: Record<string, string> = {
  running: "bg-success",
  standby: "bg-muted",
  maintenance: "bg-battery",
  fault: "bg-critical",
  "reserve-priority": "bg-solar",
};

export default function OptimizationCenterPage() {
  const seed = useFleetStore((s) => s.seed);
  const strategyId = useFleetStore((s) => s.strategyId);
  const setStrategy = useFleetStore((s) => s.setStrategy);
  const awgProfiles = useFleetStore((s) => s.awgProfiles);
  const lastDecision = useFleetStore((s) => s.lastDecision);

  const optimizedController = useMemo(
    () => (context: ControllerContext) =>
      strategyId === "fixed-schedule" ? baselineController(context) : decideFleetControl(context, STRATEGIES[strategyId]),
    [strategyId],
  );

  const options = { seed, totalHours: 24, stepHours: 1, startHourOfDay: 0 };

  const comparison = useMemo(
    () => runBaselineVsOptimizedComparison(baselineController, optimizedController, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, strategyId],
  );

  const timeline = useMemo(
    () => runScheduleTimeline(optimizedController, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, strategyId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Optimization Center</h1>
          <p className="text-sm text-muted-foreground">Seed {seed} · 24-hour scenario, hour 0 start.</p>
        </div>
        <Select value={strategyId} onValueChange={(v) => setStrategy((v ?? "balanced") as StrategyId)}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGY_LIST.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">24-hour schedule</CardTitle>
          <CardDescription>
            Every AWG, every hour, under the <strong>{STRATEGIES[strategyId].label}</strong> strategy.{" "}
            <DataSourceBadge source="simulated" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="flex">
                <div className="w-24 shrink-0" />
                {timeline.map((step) => (
                  <div key={step.step} className="w-7 shrink-0 text-center text-[10px] text-muted-foreground">
                    {step.hourOfDay}
                  </div>
                ))}
              </div>
              {awgProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center">
                  <div className="w-24 shrink-0 truncate pr-2 text-[11px] text-muted-foreground">{profile.id}</div>
                  {timeline.map((step) => (
                    <div
                      key={step.step}
                      title={`${profile.id} @ hour ${step.hourOfDay}: ${step.statusByAwgId[profile.id]}`}
                      className={`m-[1px] h-4 w-6 shrink-0 rounded-sm ${STATUS_COLOR[step.statusByAwgId[profile.id]]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {Object.entries(STATUS_COLOR).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {status}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baseline vs. optimized — same seed, same 24 hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <MetricsColumn title="Fixed Schedule (baseline)" metrics={comparison.baseline} />
            <MetricsColumn title={STRATEGIES[strategyId].label} metrics={comparison.optimized} highlight />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Delta label="Water" value={comparison.waterProducedDeltaGallons} unit=" gal" />
            <Delta label="Electricity" value={comparison.electricityDeltaKwh} unit=" kWh" invert />
            <Delta label="Fuel cost" value={comparison.fuelCostDeltaUsd} prefix="$" unit="" invert />
            <Delta label="kWh/gal improvement" value={comparison.kwhPerGallonImprovementPct} unit="%" />
          </div>
          {comparison.optimized.unmetWaterDemandGallons > 0.01 && (
            <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              This strategy left {comparison.optimized.unmetWaterDemandGallons.toFixed(1)} gal of demand unmet across the
              24-hour window — shown honestly rather than hidden.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI reasoning — current step</CardTitle>
          <CardDescription>Plain-language explanation for every AWG&apos;s current decision.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {lastDecision ? (
            Object.entries(lastDecision.explanations).map(([awgId, reason]) => (
              <p key={awgId} className="text-muted-foreground">
                <span className="font-medium text-foreground">{awgId}:</span> {reason}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">Advance the simulation clock on the Fleet Overview page to see live reasoning.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricsColumn({ title, metrics, highlight }: { title: string; metrics: ReturnType<typeof runBaselineVsOptimizedComparison>["baseline"]; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/40"}`}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Water produced" value={`${metrics.waterProducedGallons.toFixed(0)} gal`} />
        <Row label="Electricity" value={`${metrics.electricityConsumedKwh.toFixed(1)} kWh`} />
        <Row label="kWh / gallon" value={metrics.kwhPerGallon.toFixed(3)} />
        <Row label="Fuel cost" value={`$${metrics.gasFuelCostUsd.toFixed(2)}`} />
        <Row label="Solar share" value={`${metrics.solarSharePct.toFixed(1)}%`} />
        <Row label="Battery discharge" value={`${metrics.batteryDischargeKwh.toFixed(1)} kWh`} />
        <Row label="Unmet demand" value={`${metrics.unmetWaterDemandGallons.toFixed(1)} gal`} />
        <Row label="Reserve-violation steps" value={String(metrics.reserveViolationSteps)} />
        <Row label="Generator starts" value={String(metrics.generatorStarts)} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}

function Delta({ label, value, unit, prefix = "", invert = false }: { label: string; value: number; unit: string; prefix?: string; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold ${good ? "text-success" : "text-critical"}`}>
        {value >= 0 ? "+" : ""}
        {prefix}
        {value.toFixed(1)}
        {unit}
      </p>
    </div>
  );
}
