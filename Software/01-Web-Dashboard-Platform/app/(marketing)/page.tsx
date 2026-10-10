import Link from "next/link";
import { ArrowRight, Droplets, Sun, Battery, Flame, BrainCircuit, MapPin, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { HeroMetrics } from "@/components/marketing/HeroMetrics";
import { ProcessDiagram } from "@/components/marketing/ProcessDiagram";
import { CORPUS_CHRISTI_CLUSTERS } from "@/data/corpus-christi/clusters";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Droplets className="h-3.5 w-3.5 text-primary" /> Climate tech · Decentralized water · Green AI
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Water From Air. <span className="text-primary">Powered Intelligently.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              AquaLoop AI coordinates atmospheric water generators, solar energy, battery storage, and natural gas
              backup to make decentralized freshwater production smarter and more efficient.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button render={<Link href="/simulation" />} size="lg">
                Explore Live Simulation <ArrowRight className="h-4 w-4" />
              </Button>
              <Button render={<Link href="/how-it-works" />} size="lg" variant="outline">
                See How It Works
              </Button>
            </div>
          </div>
          <ProcessDiagram />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <HeroMetrics />
        </div>
      </section>

      {/* The Water Challenge */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <SectionHeading
            kicker="The Water Challenge"
            title="Decentralized freshwater matters more than ever"
            description="Coastal commercial facilities, campuses, emergency-response organizations, and remote sites all depend on municipal freshwater that can be costly, constrained, or unavailable exactly when it's needed most."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Coastal facilities", body: "Buildings with heavy cooling and water demand often sit far from spare municipal capacity." },
              { title: "Remote operations", body: "Off-grid or temporary sites can't always justify new water infrastructure." },
              { title: "Emergency preparedness", body: "Storms and outages can cut off municipal supply exactly when demand spikes." },
              { title: "Resource pressure", body: "Every gallon produced locally is a gallon not drawn from strained coastal water resources." },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Technology */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            kicker="The Technology"
            align="center"
            title="Atmospheric water generation, explained honestly"
            description="An AWG cools air below its dew point so moisture condenses into liquid water — the same physics as a cold glass sweating on a humid day. It works everywhere there's humidity, but it is energy-intensive, which is exactly the problem AquaLoop's energy management solves."
            className="mx-auto"
          />
          <div className="mt-10 flex justify-center">
            <Button render={<Link href="/how-it-works" />} variant="outline">
              Walk through the full process <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why Energy Management Matters + Hybrid Solution */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          kicker="Why Energy Management Matters"
          title="Humidity, temperature, and power availability all move the cost per gallon"
          description="Hotter, drier conditions reduce how much water an AWG can produce per kWh. Running every machine on a fixed schedule — regardless of weather or energy source — wastes fuel and battery cycles. AquaLoop's hybrid energy system and scheduling exist to close that gap."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <Sun className="h-5 w-5 text-solar" />
              <CardTitle className="text-base">Solar-first</CardTitle>
              <CardDescription>Every AWG prefers solar electricity whenever it&apos;s available and sufficient.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Battery className="h-5 w-5 text-battery" />
              <CardTitle className="text-base">Battery buffering</CardTitle>
              <CardDescription>Stored solar energy covers gaps without immediately starting the generator.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Flame className="h-5 w-5 text-gas" />
              <CardTitle className="text-base">Gas backup</CardTitle>
              <CardDescription>Natural gas generation covers what solar and battery can&apos;t — simulated, never automated against safety controls.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <div className="mt-8">
          <Button render={<Link href="/hybrid-energy" />} variant="outline">
            Open the energy flow simulator <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* AI Intelligence */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                kicker="AI Intelligence"
                title="A transparent, explainable scheduler — not a black box"
                description="AquaLoop AI forecasts weather and demand, models equipment performance, and runs a rule-based constrained scheduler that decides which machines run, from which energy source, and why. Every decision ships with a plain-language explanation."
              />
              <Button render={<Link href="/optimization" />} className="mt-6" variant="outline">
                See the optimization engine <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Example reasoning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>&ldquo;AWG-004 scheduled using solar — budget covers its request without starting the generator.&rdquo;</p>
                <p>&ldquo;AWG-012 paused — predicted conditions yield low water-per-kWh right now; reserve allows waiting.&rdquo;</p>
                <p>&ldquo;Production increased to maintain the site&apos;s minimum emergency water reserve.&rdquo;</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Deployment Network */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          kicker="Deployment Network"
          title="Five proposed Corpus Christi clusters"
          description="These are proposed demonstration areas with approximate, publicly-known neighborhood-level coordinates — not confirmed installations or customer sites."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-5">
          {CORPUS_CHRISTI_CLUSTERS.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader>
                <MapPin className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm">{cluster.name}</CardTitle>
                <CardDescription className="text-xs">4 AWGs · proposed</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Button render={<Link href="/deployment" />} variant="outline">
            Explore the fleet map <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Transparent Economics */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            kicker="Transparent Economics"
            title="We show the math, including when it doesn't favor AquaLoop"
            description="Seawater reverse osmosis is normally far more electricity-efficient for bulk freshwater. AquaLoop's potential advantage is decentralized deployment without a seawater intake or brine discharge at every site — not raw energy efficiency."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button render={<Link href="/desalination" />} variant="outline">
              <Scale className="h-4 w-4" /> Compare vs. desalination
            </Button>
            <Button render={<Link href="/dashboard/financials" />} variant="outline">
              Open the financial calculator
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Ready to see the whole fleet in motion?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Monitor 20 simulated AWGs, compare optimization strategies, and run financial scenarios in the operations
          platform.
        </p>
        <Button render={<Link href="/dashboard" />} size="lg" className="mt-8">
          Enter AquaLoop Command Center <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </>
  );
}
