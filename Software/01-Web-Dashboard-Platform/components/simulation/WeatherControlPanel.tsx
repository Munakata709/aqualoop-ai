"use client";

import { Slider } from "@/components/ui/slider";
import type { AwgSandboxControls } from "@/lib/sandbox/useAwgSandbox";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, unit = "", onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <Slider
        className="mt-2"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        aria-label={label}
      />
    </div>
  );
}

export function WeatherControlPanel({
  controls,
  onChange,
}: {
  controls: AwgSandboxControls;
  onChange: (controls: AwgSandboxControls) => void;
}) {
  function set<K extends keyof AwgSandboxControls>(key: K, value: AwgSandboxControls[K]) {
    onChange({ ...controls, [key]: value });
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <SliderRow label="Temperature" value={controls.temperatureC} min={5} max={45} unit="°C" onChange={(v) => set("temperatureC", v)} />
      <SliderRow label="Relative humidity" value={controls.relativeHumidityPct} min={5} max={100} unit="%" onChange={(v) => set("relativeHumidityPct", v)} />
      <SliderRow label="Time of day" value={controls.hourOfDay} min={0} max={23.5} step={0.5} unit=":00" onChange={(v) => set("hourOfDay", v)} />
      <SliderRow
        label="Cloud cover"
        value={(1 - controls.cloudCoverFactor) * 100}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => set("cloudCoverFactor", 1 - v / 100)}
      />
      <SliderRow label="Water demand" value={controls.waterDemandLPerDay} min={0} max={400} step={5} unit=" L/day" onChange={(v) => set("waterDemandLPerDay", v)} />
    </div>
  );
}
