import { Leaf, Droplets, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export default function ImpactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="Environmental Impact"
        title="A measured, honest view of AquaLoop's environmental case"
        description="AquaLoop aims to improve resource efficiency by reducing unnecessary energy use and optimizing the deployment of decentralized water-generation equipment. That's a real but bounded claim — not a zero-impact or carbon-neutral one."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <Droplets className="h-5 w-5 text-water" />
            <CardTitle className="text-base">Coastal water conservation</CardTitle>
            <CardDescription>Local production that doesn&apos;t draw from strained coastal supply.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every gallon an AWG produces on-site is a gallon not drawn from municipal or coastal freshwater resources — but that
            benefit must be weighed against the energy used to produce it.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Factory className="h-5 w-5 text-gas" />
            <CardTitle className="text-base">Emissions are real, and estimated honestly</CardTitle>
            <CardDescription>Natural gas backup has a measurable carbon footprint.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every dashboard and financial page that reports emissions uses a clearly labeled estimate from a documented
            emissions factor — never presented as a measured result.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Leaf className="h-5 w-5 text-success" />
            <CardTitle className="text-base">AI&apos;s role is efficiency, not magic</CardTitle>
            <CardDescription>Scheduling and energy coordination, not a new energy source.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            AquaLoop AI doesn&apos;t generate energy or water from nothing — it reduces waste by matching when machines run to
            when solar is available and conditions are favorable.
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
        <p className="font-semibold">What we won&apos;t claim</p>
        <p className="mt-1">
          Not &ldquo;unlimited free water,&rdquo; not &ldquo;zero-cost water,&rdquo; not &ldquo;100% carbon neutral,&rdquo; not a
          &ldquo;guaranteed 50% energy savings,&rdquo; and not &ldquo;cheaper than desalination everywhere.&rdquo; AWG technology is
          energy-intensive compared with seawater reverse osmosis — see the honest side-by-side comparison.
        </p>
      </div>
    </div>
  );
}
