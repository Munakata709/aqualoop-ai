import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="About / Project Mission"
        title="Why AquaLoop AI exists"
        description="AquaLoop AI brings predictive energy management to atmospheric water generation, coordinating solar power, battery storage, natural gas backup, and water production through one intelligent platform."
      />

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          Coastal commercial facilities, campuses, emergency-response organizations, and remote sites all depend on
          municipal freshwater that can be costly, constrained, or unavailable exactly when it&apos;s needed most.
          Atmospheric water generation can produce freshwater locally almost anywhere there&apos;s humidity in the
          air — but it is energy-intensive, and running a fleet of machines on a fixed schedule wastes fuel and
          battery cycles.
        </p>
        <p>
          AquaLoop AI is the coordination layer: it decides when AWGs should run, which energy source to draw from,
          and when production can safely be deferred, using weather, equipment performance, water demand, and
          available energy. It does not manufacture water from nothing and does not violate thermodynamic limits —
          it improves scheduling, monitoring, and coordination of compatible AWG systems.
        </p>
        <p>
          This demonstration models a network of 20 AWGs across five proposed Corpus Christi locations. Every number
          on this site is labeled as simulated, forecast, measured, estimated, or user-entered — nothing here claims
          to be a verified result unless it&apos;s computed live from the same physics and optimization engine that
          powers the operations dashboard.
        </p>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="text-base">What this project is, honestly</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>A working simulator with a real physics engine, a real deterministic optimization scheduler, and a real financial model — not a static mockup.</p>
          <p>Architected for future ESP32-S3 telemetry and real manufacturer performance curves, without requiring them to run today.</p>
          <p>Not a claim that AquaLoop beats conventional operation or desalination in every scenario — the comparisons show the math either way.</p>
        </CardContent>
      </Card>
    </div>
  );
}
