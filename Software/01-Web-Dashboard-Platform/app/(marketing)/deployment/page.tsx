"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CORPUS_CHRISTI_CLUSTERS, AWGS_PER_CLUSTER } from "@/data/corpus-christi/clusters";
import { LiveWeatherCard } from "@/components/weather/LiveWeatherCard";

const LAT_RANGE = [27.62, 27.86] as const;
const LON_RANGE = [-97.58, -97.27] as const;

function project(lat: number, lon: number) {
  const x = ((lon - LON_RANGE[0]) / (LON_RANGE[1] - LON_RANGE[0])) * 100;
  const y = (1 - (lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * 100;
  return { x, y };
}

export default function DeploymentPage() {
  const [selectedId, setSelectedId] = useState(CORPUS_CHRISTI_CLUSTERS[0].id);
  const selected = CORPUS_CHRISTI_CLUSTERS.find((c) => c.id === selectedId)!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        kicker="Corpus Christi Deployment"
        title="Five proposed clusters, twenty simulated AWGs"
        description="These are proposed demonstration areas with approximate, publicly-known neighborhood-level coordinates, shown on a simplified relative-position map — not a GIS basemap, and not confirmed installations or customer sites."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-6">
          <svg viewBox="0 0 100 100" className="h-auto w-full rounded-lg bg-secondary/40" role="img" aria-label="Simplified Corpus Christi deployment map">
            <text x="50" y="6" textAnchor="middle" fontSize="3.5" fill="var(--muted-foreground)">
              Corpus Christi Bay area (simplified, not to scale)
            </text>
            {CORPUS_CHRISTI_CLUSTERS.map((cluster) => {
              const { x, y } = project(cluster.approximateLatitude, cluster.approximateLongitude);
              const isSelected = cluster.id === selectedId;
              return (
                <g
                  key={cluster.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(cluster.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${cluster.name} cluster`}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedId(cluster.id); }}
                >
                  <circle r={isSelected ? 4.5 : 3.5} fill="var(--color-water)" opacity={isSelected ? 0.9 : 0.6} stroke="var(--card)" strokeWidth={0.6} />
                  <text y={-6} textAnchor="middle" fontSize="3" fontWeight={isSelected ? 700 : 500} fill="var(--foreground)">
                    {cluster.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="mt-3 text-xs text-muted-foreground">Click a marker to see its cluster details.</p>
        </div>

        <Card>
          <CardHeader>
            <MapPin className="h-4 w-4 text-accent" />
            <CardTitle>{selected.name}</CardTitle>
            <CardDescription>Proposed cluster · {AWGS_PER_CLUSTER} AWGs · approximate location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Approx. {selected.approximateLatitude.toFixed(3)}°N, {Math.abs(selected.approximateLongitude).toFixed(3)}°W
            </p>
            <div className="space-y-2">
              {Array.from({ length: AWGS_PER_CLUSTER }, (_, i) => `${selected.id}-awg-${i + 1}`).map((awgId) => (
                <Link
                  key={awgId}
                  href={`/dashboard/awg/${awgId}`}
                  className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span>{awgId}</span>
                  <Badge variant="outline" className="text-[10px]">
                    View
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <LiveWeatherCard />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-5">
        {CORPUS_CHRISTI_CLUSTERS.map((cluster) => (
          <button key={cluster.id} onClick={() => setSelectedId(cluster.id)} className="text-left">
            <Card className={cluster.id === selectedId ? "border-primary/50" : undefined}>
              <CardHeader>
                <CardTitle className="text-sm">{cluster.name}</CardTitle>
                <CardDescription className="text-xs">{AWGS_PER_CLUSTER} AWGs · proposed</CardDescription>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
