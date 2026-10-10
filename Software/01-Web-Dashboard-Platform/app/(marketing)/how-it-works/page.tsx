"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { WeatherControlPanel } from "@/components/simulation/WeatherControlPanel";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useAwgSandbox } from "@/lib/sandbox/useAwgSandbox";

const END_USES = [
  { id: "nonpotable", label: "Nonpotable industrial use" },
  { id: "irrigation", label: "Landscape irrigation" },
  { id: "facility", label: "Facility utility use" },
  { id: "emergency", label: "Emergency water reserve" },
  { id: "potable", label: "Potable use (requires validated treatment & regulatory compliance)" },
];

export default function HowItWorksPage() {
  const { controls, setControls, derived } = useAwgSandbox();
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [endUse, setEndUse] = useState("nonpotable");

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="How It Works"
        title="From humid air to a water tank, step by step"
        description="Adjust the conditions on the left and watch every number in the process update live — all values here are estimated from a documented simplified model, not measured hardware."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <WeatherControlPanel controls={controls} onChange={setControls} />
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <Button size="icon-sm" variant="outline" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => setSpeed(1)} aria-label="Reset speed">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <div className="flex gap-1">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          {!derived.feasible && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">{derived.reason}</p>
          )}
        </div>

        <Tabs defaultValue="intake" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            {["intake", "filtration", "condensation", "collection", "treatment", "storage", "delivery"].map((id, i) => (
              <TabsTrigger key={id} value={id} className="text-xs">
                {i + 1}. {id[0].toUpperCase() + id.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="intake" className="mt-6 space-y-4">
            <StepCard
              title="Step 1 — Air Intake"
              playing={playing}
              speed={speed}
              body="Ambient air carries water vapor. How much is physically available depends on temperature and relative humidity — AquaLoop reads both continuously and estimates the dew point and available moisture."
              stats={[
                { label: "Temperature", value: `${controls.temperatureC.toFixed(1)} °C`, source: "user-entered" },
                { label: "Relative humidity", value: `${controls.relativeHumidityPct.toFixed(0)}%`, source: "user-entered" },
                { label: "Estimated dew point", value: `${derived.dewPointC.toFixed(1)} °C`, source: "estimated" },
                { label: "Absolute humidity", value: `${derived.absoluteHumidityGPerM3.toFixed(1)} g/m³`, source: "estimated" },
              ]}
            />
          </TabsContent>

          <TabsContent value="filtration" className="mt-6 space-y-4">
            <StepCard
              title="Step 2 — Air Filtration"
              playing={playing}
              speed={speed}
              body="Incoming air passes through a filter that protects the equipment and reduces particulate contamination before it reaches the cooling coil. Filtration alone does not make water potable."
              stats={[]}
            />
          </TabsContent>

          <TabsContent value="condensation" className="mt-6 space-y-4">
            <StepCard
              title="Step 3 — Cooling & Condensation"
              playing={playing}
              speed={speed}
              body="The evaporator coil must be cooled below the air's dew point for moisture to condense — the same physics as a cold glass sweating on a humid day. If the coil can't get cold enough relative to conditions, no water condenses."
              stats={[
                { label: "Evaporator target", value: "5.0 °C", source: "simulated" },
                { label: "Dew point", value: `${derived.dewPointC.toFixed(1)} °C`, source: "estimated" },
                { label: "Compressor status", value: derived.feasible ? "Running" : "Stopped — infeasible", source: "simulated" },
                { label: "Compressor power", value: `${derived.powerKw.toFixed(2)} kW`, source: "estimated" },
              ]}
            />
          </TabsContent>

          <TabsContent value="collection" className="mt-6 space-y-4">
            <StepCard
              title="Step 4 — Water Collection"
              playing={playing}
              speed={speed}
              body="Condensed water flows into a collection tray and channel. Instantaneous production depends entirely on current atmospheric conditions and equipment capacity."
              stats={[
                { label: "Production rate", value: `${derived.productionRateLPerHour.toFixed(2)} L/h`, source: "estimated" },
                { label: "Production rate", value: `${derived.productionRateGallonsPerHour.toFixed(2)} gal/h`, source: "estimated" },
                { label: "Specific energy", value: `${derived.specificEnergyKwhPerL.toFixed(3)} kWh/L`, source: "estimated" },
              ]}
            />
          </TabsContent>

          <TabsContent value="treatment" className="mt-6 space-y-4">
            <StepCard
              title="Step 5 — Water Treatment"
              playing={playing}
              speed={speed}
              body="A configurable treatment chain — sediment filtration, activated carbon where appropriate, UV or another validated disinfection stage, mineralization where appropriate, and water-quality testing. Requirements depend on intended use and local regulations. Simulated water is never automatically marked safe to drink."
              stats={[]}
            />
          </TabsContent>

          <TabsContent value="storage" className="mt-6 space-y-4">
            <StepCard
              title="Step 6 — Storage"
              playing={playing}
              speed={speed}
              body="Treated water enters a monitored storage tank with overflow protection. Whether the tank trends toward full or empty depends on production rate versus demand."
              stats={[
                { label: "Water demand", value: `${controls.waterDemandLPerDay.toFixed(0)} L/day`, source: "user-entered" },
                {
                  label: "Net trend",
                  value:
                    derived.productionRateLPerHour * 24 >= controls.waterDemandLPerDay
                      ? "Tank trending up"
                      : "Tank trending down",
                  source: "estimated",
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="delivery" className="mt-6 space-y-4">
            <StepCard
              title="Step 7 — Water Delivery"
              playing={playing}
              speed={speed}
              body="Water leaves storage for a selected end use. Potable use requires validated treatment and regulatory compliance — it is never assumed by default."
              stats={[]}
            />
            <div className="max-w-sm">
              <Select value={endUse} onValueChange={(v) => setEndUse(v ?? "nonpotable")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {END_USES.map((use) => (
                    <SelectItem key={use.id} value={use.id}>
                      {use.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {endUse === "potable" && (
                <p className="mt-2 text-xs text-warning">
                  Potable use requires validated treatment and regulatory compliance before deployment — not assumed in this demo.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StepCard({
  title,
  body,
  stats,
  playing,
  speed,
}: {
  title: string;
  body: string;
  stats: Array<{ label: string; value: string; source: "simulated" | "estimated" | "user-entered" | "measured" | "forecast" }>;
  playing: boolean;
  speed: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <FlowIndicator playing={playing} speed={speed} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      {stats.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-secondary/50 p-3">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{stat.value}</dd>
              <DataSourceBadge source={stat.source} className="mt-2" />
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function FlowIndicator({ playing, speed }: { playing: boolean; speed: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-water"
          style={
            playing
              ? { animation: `pulse-flow 1.2s ease-in-out ${i * 0.2}s infinite`, animationDuration: `${1.2 / speed}s` }
              : { opacity: 0.3 }
          }
        />
      ))}
      <style>{`@keyframes pulse-flow { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
