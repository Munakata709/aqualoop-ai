import Link from "next/link";
import { ArrowRight, Cpu, Thermometer, Wifi, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { AQUALOOP_STANDARD_PROFILE } from "@/lib/equipment/awgProfiles";

export default function TechnologyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="Technology"
        title="What's inside an AquaLoop AWG, and what's inside the software"
        description="AquaLoop AI is a software and energy-management layer on top of atmospheric water generation hardware — it does not manufacture water from nothing and does not violate thermodynamic limits."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Thermometer className="h-5 w-5 text-water" />
            <CardTitle className="text-base">Reference equipment profile</CardTitle>
            <CardDescription>The demo&apos;s default AWG model — manufacturer profiles are swappable per unit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Manufacturer" value={AQUALOOP_STANDARD_PROFILE.manufacturer} />
            <Row label="Model" value={AQUALOOP_STANDARD_PROFILE.model} />
            <Row label="Rated production" value={`${AQUALOOP_STANDARD_PROFILE.ratedGallonsPerDay} gal/day`} />
            <Row label="Rated power" value={`${AQUALOOP_STANDARD_PROFILE.ratedPowerKw} kW`} />
            <Row label="Baseline specific energy" value={`${AQUALOOP_STANDARD_PROFILE.baseSpecificEnergyKwhPerL} kWh/L`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Software stack</CardTitle>
            <CardDescription>What actually runs this demo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui components.</p>
            <p>A pure-function physics/simulation engine (lib/physics, lib/simulation) with Vitest unit tests.</p>
            <p>A deterministic, rule-based optimization scheduler (lib/optimization) — not machine learning.</p>
            <p>Recharts for analytics, a lightweight custom SVG map for the fleet view.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Wifi className="h-5 w-5 text-battery" />
            <CardTitle className="text-base">Hardware integration readiness</CardTitle>
            <CardDescription>What it would take to connect real equipment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>A future ESP32-S3 device could carry a temperature/humidity sensor, a flow meter or calibrated load cell, a tank-level sensor, and an isolated energy meter.</p>
            <p>The architecture separates a simulated telemetry provider from a real one, so swapping in real hardware doesn&apos;t require rewriting the UI or optimizer.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">Safety boundaries</CardTitle>
            <CardDescription>What this software will never do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>It does not connect an ESP32 directly to mains electricity or natural gas safety controls.</p>
            <p>Production deployment requires certified power equipment, manufacturer-approved AWG control interfaces, and independent local safety interlocks.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <Button render={<Link href="/how-it-works" />} variant="outline">
          See the process in action <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
