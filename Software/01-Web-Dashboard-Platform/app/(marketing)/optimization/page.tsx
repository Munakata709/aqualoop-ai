import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { baselineController } from "@/lib/optimization/baseline";
import { decideFleetControl } from "@/lib/optimization/heuristic";
import { STRATEGIES, STRATEGY_LIST } from "@/lib/optimization/strategies";
import { runBaselineVsOptimizedComparison } from "@/lib/optimization/compare";
import type { ControllerContext } from "@/lib/optimization/types";

const DEMO_SEED = 2026;

export default function OptimizationPage() {
  const optimizedController = (context: ControllerContext) => decideFleetControl(context, STRATEGIES["lowest-cost"]);
  const comparison = runBaselineVsOptimizedComparison(baselineController, optimizedController, {
    seed: DEMO_SEED,
    totalHours: 24,
    stepHours: 1,
    startHourOfDay: 0,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="AI Optimization"
        title="A transparent, rule-based scheduler — not a black box, and not machine learning"
        description="AquaLoop AI's scheduler is a deterministic, explainable heuristic: it reads forecast weather and energy state, applies priority rules (safety reserve first, then efficiency, then energy budget), and produces a schedule with a plain-language reason for every decision. It never claims savings without comparing against an explicit fixed-schedule baseline — like the one below, computed live for this page."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Layer 1", title: "Data ingestion", body: "Weather, equipment state, tank levels, battery SOC, and demand feed every decision." },
          { label: "Layer 2", title: "Forecasting", body: "A synthetic 24h forecast (clearly labeled) stands in for a real weather API in this demo." },
          { label: "Layer 3", title: "Equipment modeling", body: "Per-machine production and energy-intensity estimates, architected for real manufacturer curves later." },
          { label: "Layer 4", title: "Constrained scheduling", body: "A rolling, rule-based heuristic — the documented fallback when no MILP solver is wired in." },
        ].map((layer) => (
          <Card key={layer.title}>
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-wide">{layer.label}</CardDescription>
              <CardTitle className="text-base">{layer.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{layer.body}</CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">24-hour demo: Fixed Schedule vs. Lowest Operating Cost</h3>
          <DataSourceBadge source="simulated" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Same weather seed, same fleet, same 24-hour window — only the scheduling strategy differs.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <ComparisonColumn title="Fixed Schedule (baseline)" metrics={comparison.baseline} />
          <ComparisonColumn title="Lowest Operating Cost (AI)" metrics={comparison.optimized} highlight />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Delta label="Water produced" value={comparison.waterProducedDeltaGallons} unit=" gal" />
          <Delta label="Electricity used" value={comparison.electricityDeltaKwh} unit=" kWh" invert />
          <Delta label="Fuel cost" value={comparison.fuelCostDeltaUsd} unit=" USD" prefix="$" invert />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          kWh/gallon improvement this run: {comparison.kwhPerGallonImprovementPct.toFixed(1)}% — a measured result of this specific
          simulated scenario, not a guaranteed or universal figure. See the full Optimization Center in the dashboard to run your own
          scenarios and strategies.
        </p>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-foreground">Switchable strategies</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGY_LIST.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-sm">{s.label}</CardTitle>
                <CardDescription className="text-xs">{s.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <Button render={<Link href="/dashboard/optimization" />}>
          Open the full Optimization Center <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ComparisonColumn({ title, metrics, highlight }: { title: string; metrics: ReturnType<typeof runBaselineVsOptimizedComparison>["baseline"]; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/40"}`}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Metric label="Water produced" value={`${metrics.waterProducedGallons.toFixed(0)} gal`} />
        <Metric label="Electricity used" value={`${metrics.electricityConsumedKwh.toFixed(1)} kWh`} />
        <Metric label="kWh / gallon" value={metrics.kwhPerGallon.toFixed(3)} />
        <Metric label="Generator fuel cost" value={`$${metrics.gasFuelCostUsd.toFixed(2)}`} />
        <Metric label="Solar share" value={`${metrics.solarSharePct.toFixed(1)}%`} />
        <Metric label="Generator starts" value={String(metrics.generatorStarts)} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
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
      <p className={`mt-1 text-lg font-semibold ${good ? "text-success" : "text-critical"}`}>
        {value >= 0 ? "+" : ""}
        {prefix}
        {value.toFixed(1)}
        {unit}
      </p>
    </div>
  );
}
