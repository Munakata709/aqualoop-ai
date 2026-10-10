"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFleetStore, type ScenarioPresetId } from "@/lib/store/fleetStore";

const PRESETS: Array<{ id: ScenarioPresetId; label: string; description: string }> = [
  { id: "sunny-coastal", label: "Sunny Coastal Day", description: "Strong solar generation, moderate-to-high humidity, normal water demand." },
  { id: "cloudy-humid", label: "Cloudy High-Humidity Day", description: "Reduced solar production but favorable atmospheric moisture." },
  { id: "hot-dry", label: "Hot & Dry Conditions", description: "Poor AWG production efficiency; flexible production gets postponed." },
  { id: "emergency-demand", label: "Emergency Water Demand", description: "Demand increases suddenly; reserve protection and priority scheduling kick in." },
  { id: "generator-outage", label: "Generator Outage", description: "Natural gas backup unavailable; demonstrates safe reduced operation." },
  { id: "battery-low", label: "Battery Unavailable", description: "Battery reserve constraints demonstrated by disallowing discharge." },
  { id: "equipment-failure", label: "AWG Equipment Failure", description: "One cluster's machines report a fault this step." },
];

export default function SettingsPage() {
  const seed = useFleetStore((s) => s.seed);
  const activePreset = useFleetStore((s) => s.activePreset);
  const reset = useFleetStore((s) => s.reset);
  const applyPreset = useFleetStore((s) => s.applyPreset);
  const [seedInput, setSeedInput] = useState(String(seed));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Simulation Settings</h1>
        <p className="text-sm text-muted-foreground">Seed, scenarios, and reset controls for the live fleet simulation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seed &amp; reset</CardTitle>
          <CardDescription>The same seed always reproduces the same weather and results.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground" htmlFor="seed-input">
              Seed
            </label>
            <Input id="seed-input" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => reset(Number(seedInput) || undefined)}>Reset with this seed</Button>
          <Button variant="outline" onClick={() => reset()}>
            Reset with random seed
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demonstration scenarios</CardTitle>
          <CardDescription>One-click scenario presets. The simulation responds live — nothing here is pre-recorded.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                activePreset === preset.id ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30 hover:bg-secondary/60"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{preset.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
            </button>
          ))}
          <button
            onClick={() => applyPreset("custom")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              activePreset === "custom" ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30 hover:bg-secondary/60"
            }`}
          >
            <p className="text-sm font-medium text-foreground">Custom / none</p>
            <p className="mt-1 text-xs text-muted-foreground">Clear all scenario overrides and run normal conditions.</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
