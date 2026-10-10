"use client";

import Link from "next/link";
import { Play, Pause, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFleetStore } from "@/lib/store/fleetStore";

export function DashboardTopBar() {
  const isRunning = useFleetStore((s) => s.isRunning);
  const speedMultiplier = useFleetStore((s) => s.speedMultiplier);
  const hourOfDay = useFleetStore((s) => s.hourOfDay);
  const simStepsElapsed = useFleetStore((s) => s.simStepsElapsed);
  const seed = useFleetStore((s) => s.seed);
  const play = useFleetStore((s) => s.play);
  const pause = useFleetStore((s) => s.pause);
  const reset = useFleetStore((s) => s.reset);
  const setSpeed = useFleetStore((s) => s.setSpeed);
  const tick = useFleetStore((s) => s.tick);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden" aria-label="Back to site">
          <Home className="h-4 w-4" />
        </Link>
        <Badge variant="outline">Demo environment</Badge>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Hour {hourOfDay.toFixed(0).padStart(2, "0")}:00 · Step {simStepsElapsed} · Seed {seed}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={() => (isRunning ? pause() : play())} aria-label={isRunning ? "Pause simulation" : "Play simulation"}>
          {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon-sm" variant="outline" onClick={tick} disabled={isRunning} aria-label="Step once">
          ⏭
        </Button>
        <Button size="icon-sm" variant="outline" onClick={() => reset()} aria-label="Reset simulation">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-1 text-xs font-medium ${speedMultiplier === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
