"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { calculateFinancials, DEFAULT_FINANCIAL_INPUTS, type FinancialInputs } from "@/lib/financial/calc";

function Row({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value}{unit}</span>
      </div>
      <Slider className="mt-2" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)} />
    </div>
  );
}

export default function FinancialsPage() {
  const [inputs, setInputs] = useState<FinancialInputs>(DEFAULT_FINANCIAL_INPUTS);

  function set<K extends keyof FinancialInputs>(key: K, value: FinancialInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const result = useMemo(() => calculateFinancials(inputs), [inputs]);

  const capexBreakdown = [
    { name: "AWGs", value: Math.round(inputs.numAwgs * inputs.awgCapitalCostUsdEach) },
    { name: "Solar", value: Math.round(inputs.solarPanelCount * inputs.panelRatingW * inputs.solarInstallCostUsdPerWatt) },
    { name: "Battery", value: Math.round(inputs.batteryCapacityKwhTotal * inputs.batteryInstallCostUsdPerKwh) },
    { name: "Generator", value: inputs.generatorCostUsdTotal },
    { name: "Land/site", value: inputs.landSiteCostUsdTotal },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial Analytics</h1>
        <p className="text-sm text-muted-foreground">Full interactive cost model — every assumption below is editable.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fleet &amp; utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Number of AWGs" value={inputs.numAwgs} unit="" min={1} max={200} step={1} onChange={(v) => set("numAwgs", v)} />
              <Row label="Rated gal/day per AWG" value={inputs.ratedGallonsPerDayPerAwg} unit="" min={10} max={200} step={5} onChange={(v) => set("ratedGallonsPerDayPerAwg", v)} />
              <Row label="Actual utilization" value={Math.round(inputs.actualUtilization * 100)} unit="%" min={10} max={100} step={5} onChange={(v) => set("actualUtilization", v / 100)} />
              <Row label="AI optimization improvement" value={inputs.optimizationImprovementPct} unit="%" min={0} max={50} step={1} onChange={(v) => set("optimizationImprovementPct", v)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Capital costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="AWG cost (each)" value={inputs.awgCapitalCostUsdEach} unit=" USD" min={10000} max={100000} step={1000} onChange={(v) => set("awgCapitalCostUsdEach", v)} />
              <Row label="Solar panel count" value={inputs.solarPanelCount} unit="" min={0} max={2000} step={10} onChange={(v) => set("solarPanelCount", v)} />
              <Row label="Battery total" value={inputs.batteryCapacityKwhTotal} unit=" kWh" min={0} max={2000} step={10} onChange={(v) => set("batteryCapacityKwhTotal", v)} />
              <Row label="Generator cost" value={inputs.generatorCostUsdTotal} unit=" USD" min={0} max={300000} step={5000} onChange={(v) => set("generatorCostUsdTotal", v)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Operating costs &amp; financing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Natural gas price" value={inputs.naturalGasPriceUsdPerMmBtu} unit="/MMBtu" min={2} max={20} step={0.5} onChange={(v) => set("naturalGasPriceUsdPerMmBtu", v)} />
              <Row label="Annual maintenance" value={inputs.annualMaintenanceCostUsd} unit=" USD" min={0} max={200000} step={5000} onChange={(v) => set("annualMaintenanceCostUsd", v)} />
              <Row label="Equipment lifetime" value={inputs.equipmentLifetimeYears} unit=" yrs" min={5} max={25} step={1} onChange={(v) => set("equipmentLifetimeYears", v)} />
              <Row label="Discount rate" value={inputs.discountRatePct} unit="%" min={0} max={15} step={0.5} onChange={(v) => set("discountRatePct", v)} />
              <Row label="Water sale price" value={inputs.waterSalePriceUsdPerGallon} unit="/gal" min={0} max={0.5} step={0.01} onChange={(v) => set("waterSalePriceUsdPerGallon", v)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultCard label="Total CAPEX" value={`$${(result.totalCapitalCostUsd / 1000).toFixed(0)}k`} />
            <ResultCard label="Annual OPEX" value={`$${(result.annualOpexUsd / 1000).toFixed(0)}k`} />
            <ResultCard label="Levelized cost" value={`$${result.levelizedCostOfWaterUsdPerGallon.toFixed(3)}/gal`} />
            <ResultCard label="Break-even price" value={`$${result.breakEvenWaterPriceUsdPerGallon.toFixed(3)}/gal`} />
            <ResultCard label="Annual water" value={`${(result.annualWaterProductionGallons / 1000).toFixed(0)}k gal`} />
            <ResultCard label="Fuel cost/gal" value={`$${result.fuelCostUsdPerGallon.toFixed(3)}`} />
            <ResultCard label="Optimization savings/yr" value={`$${result.annualOptimizationSavingsUsd.toFixed(0)}`} />
            <ResultCard label="Payback period" value={result.paybackYears ? `${result.paybackYears} yrs` : "Never breaks even"} warn={!result.paybackYears} />
          </div>

          <div className={`rounded-xl border p-4 text-sm ${result.netPresentValueUsd >= 0 ? "border-success/30 bg-success/10" : "border-critical/30 bg-critical/10"}`}>
            <p className="font-semibold">
              Net present value: ${result.netPresentValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {result.netPresentValueUsd >= 0
                ? "Positive NPV under these assumptions — shown honestly, not guaranteed."
                : "This configuration does not break even under these assumptions. Adjust utilization, water price, or costs to explore the tradeoffs."}
            </p>
            <DataSourceBadge source="estimated" className="mt-2" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capital cost breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capexBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                    <Bar dataKey="value" fill="var(--color-water)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cumulative cash flow (20 yr)</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.cumulativeSavingsByYear.map((v, i) => ({ year: i + 1, value: Math.round(v) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                    <Line type="monotone" dataKey="value" stroke="var(--primary)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">5 / 10 / 20-year projections</CardTitle>
              <CardDescription>Cumulative cash flow and cumulative water produced.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                {result.projections.map((p) => (
                  <div key={p.year} className="rounded-lg border border-border p-3">
                    <p className="font-semibold text-foreground">Year {p.year}</p>
                    <p className="mt-1 text-muted-foreground">
                      ${p.cumulativeCashFlowUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{(p.cumulativeWaterGallons / 1000).toFixed(0)}k gal</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold ${warn ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
