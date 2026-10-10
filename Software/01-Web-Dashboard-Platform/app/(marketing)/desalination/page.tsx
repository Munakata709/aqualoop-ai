"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { calculateFinancials, DEFAULT_FINANCIAL_INPUTS } from "@/lib/financial/calc";
import { calculateDesalinationCost, DEFAULT_DESALINATION_INPUTS } from "@/lib/financial/desalination";

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

export default function DesalinationPage() {
  const [utilizationPct, setUtilizationPct] = useState(75);
  const [optimizationPct, setOptimizationPct] = useState(10);
  const [gasPricePerMmBtu, setGasPricePerMmBtu] = useState(8);
  const [roElectricityPrice, setRoElectricityPrice] = useState(0.12);
  const [roCapitalCostK, setRoCapitalCostK] = useState(350);

  const awg = useMemo(
    () =>
      calculateFinancials({
        ...DEFAULT_FINANCIAL_INPUTS,
        actualUtilization: utilizationPct / 100,
        optimizationImprovementPct: optimizationPct,
        naturalGasPriceUsdPerMmBtu: gasPricePerMmBtu,
      }),
    [utilizationPct, optimizationPct, gasPricePerMmBtu],
  );

  const ro = useMemo(
    () =>
      calculateDesalinationCost({
        ...DEFAULT_DESALINATION_INPUTS,
        electricityPriceUsdPerKwh: roElectricityPrice,
        capitalCostUsd: roCapitalCostK * 1000,
      }),
    [roElectricityPrice, roCapitalCostK],
  );

  const cheaper = awg.levelizedCostOfWaterUsdPerGallon <= ro.levelizedCostOfWaterUsdPerGallon ? "AquaLoop AI" : "Reverse Osmosis";

  const capexData = [
    { name: "AquaLoop AI", capex: Math.round(awg.totalCapitalCostUsd) },
    { name: "Reverse Osmosis", capex: Math.round(ro.totalCapitalCostUsd) },
  ];
  const cumulativeData = [
    { name: "10-yr", AquaLoop: Math.round(awg.annualOpexUsd * 10 + awg.totalCapitalCostUsd), RO: Math.round(ro.tenYearCumulativeCostUsd) },
    { name: "20-yr", AquaLoop: Math.round(awg.annualOpexUsd * 20 + awg.totalCapitalCostUsd), RO: Math.round(ro.twentyYearCumulativeCostUsd) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="AquaLoop vs. Desalination"
        title="An honest comparison at a common 1,000 gallons/day output"
        description="Seawater reverse osmosis is normally far more electricity-efficient per gallon than atmospheric water generation. This calculator does not force AquaLoop to win — it reports whichever system is cheaper under your selected assumptions."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AquaLoop AI assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Utilization" value={utilizationPct} unit="%" min={30} max={100} step={5} onChange={setUtilizationPct} />
              <Row label="AI optimization improvement" value={optimizationPct} unit="%" min={0} max={20} step={1} onChange={setOptimizationPct} />
              <Row label="Natural gas price" value={gasPricePerMmBtu} unit="/MMBtu" min={2} max={20} step={0.5} onChange={setGasPricePerMmBtu} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reverse osmosis assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Electricity price" value={roElectricityPrice} unit="/kWh" min={0.04} max={0.3} step={0.01} onChange={setRoElectricityPrice} />
              <Row label="Capital cost" value={roCapitalCostK} unit="k USD" min={100} max={800} step={10} onChange={setRoCapitalCostK} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">Under these assumptions, levelized cost of water favors</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{cheaper}</p>
            <div className="mt-3 flex justify-center gap-6 text-sm">
              <span>AquaLoop: <strong className="font-mono">${awg.levelizedCostOfWaterUsdPerGallon.toFixed(3)}/gal</strong></span>
              <span>RO: <strong className="font-mono">${ro.levelizedCostOfWaterUsdPerGallon.toFixed(3)}/gal</strong></span>
            </div>
            <DataSourceBadge source="estimated" className="mt-3" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Energy per gallon</p>
              <div className="mt-3 flex justify-between text-sm">
                <span>AquaLoop</span>
                <span className="font-mono">{(awg.annualElectricityKwh / awg.annualWaterProductionGallons).toFixed(2)} kWh/gal</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span>Reverse Osmosis</span>
                <span className="font-mono">{ro.energyPerGallonKwh.toFixed(2)} kWh/gal</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                RO is typically far more energy-efficient per gallon. AquaLoop&apos;s potential advantage is decentralized siting without
                a seawater intake or brine discharge — not raw energy efficiency.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Capital expenditure</p>
              <div className="mt-3 h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capexData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                    <Bar dataKey="capex" fill="var(--color-water)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">10- and 20-year cumulative cost</p>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="AquaLoop" fill="var(--color-water)" radius={4} />
                  <Bar dataKey="RO" fill="var(--color-solar)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
