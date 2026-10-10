"use client";

import { useState } from "react";
import { cn } from "cn";

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  description: string;
}

const NODES: DiagramNode[] = [
  { id: "air", label: "Air Intake", x: 60, y: 120, color: "var(--color-water)", description: "Ambient air carries water vapor. How much depends on temperature and relative humidity — AquaLoop reads both continuously." },
  { id: "awg", label: "AWG Unit", x: 210, y: 120, color: "var(--color-water)", description: "A refrigerated coil cools air below its dew point so moisture condenses out, the same physics behind a cold glass of water sweating." },
  { id: "tank", label: "Water Tank", x: 360, y: 120, color: "var(--color-water)", description: "Condensed, treated water collects in a storage tank with monitored fill level, reserve threshold, and overflow protection." },
  { id: "solar", label: "Solar Array", x: 210, y: 20, color: "var(--color-solar)", description: "Rooftop/ground-mounted panels generate DC electricity whenever the sun is up — the preferred power source whenever available." },
  { id: "battery", label: "Battery", x: 60, y: 220, color: "var(--color-battery)", description: "Stores surplus solar energy for use after dark or during cloudy periods, within safe charge/discharge limits." },
  { id: "generator", label: "Gas Generator", x: 360, y: 220, color: "var(--color-gas)", description: "A natural gas backup generator covers any remaining demand solar and battery can't meet — simulated here, never automated against real safety controls." },
  { id: "ai", label: "AquaLoop AI", x: 210, y: 220, color: "var(--primary)", description: "Coordinates every component above: deciding when to run AWGs, which energy source to draw from, and when to defer production." },
];

const EDGES: Array<[string, string]> = [
  ["air", "awg"],
  ["awg", "tank"],
  ["solar", "awg"],
  ["solar", "battery"],
  ["battery", "awg"],
  ["generator", "awg"],
  ["ai", "awg"],
  ["ai", "solar"],
  ["ai", "battery"],
  ["ai", "generator"],
];

export function ProcessDiagram() {
  const [selectedId, setSelectedId] = useState<string>("ai");
  const selected = NODES.find((n) => n.id === selectedId) ?? NODES[0];
  const nodeById = new Map(NODES.map((n) => [n.id, n]));

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-6">
      <svg viewBox="0 0 420 260" className="h-auto w-full" role="img" aria-label="AquaLoop AI system diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" opacity={0.5} />
          </marker>
        </defs>

        {EDGES.map(([fromId, toId]) => {
          const from = nodeById.get(fromId)!;
          const to = nodeById.get(toId)!;
          const isActive = selectedId === fromId || selectedId === toId;
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isActive ? "var(--foreground)" : "var(--muted-foreground)"}
              strokeOpacity={isActive ? 0.6 : 0.25}
              strokeWidth={isActive ? 2 : 1.25}
              strokeDasharray="6 5"
              markerEnd="url(#arrow)"
              className={isActive ? "animate-[dash_1.2s_linear_infinite]" : undefined}
            />
          );
        })}

        {NODES.map((node) => {
          const isSelected = node.id === selectedId;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => setSelectedId(node.id)}
              className="cursor-pointer outline-none"
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${node.label}: show explanation`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedId(node.id);
              }}
            >
              <circle r={isSelected ? 26 : 22} fill="var(--card)" stroke={node.color} strokeWidth={isSelected ? 3 : 1.5} />
              <circle r={4} fill={node.color} opacity={0.9} />
              <text
                y={40}
                textAnchor="middle"
                className="select-none"
                fontSize={11}
                fill={isSelected ? "var(--foreground)" : "var(--muted-foreground)"}
                fontWeight={isSelected ? 600 : 500}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        className={cn(
          "mt-4 rounded-lg border border-border bg-secondary/50 p-4 text-sm text-foreground transition-opacity",
        )}
        role="status"
        aria-live="polite"
      >
        <span className="font-semibold" style={{ color: selected.color }}>
          {selected.label}
        </span>
        <span className="text-muted-foreground"> — {selected.description}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Click or tab to any component to see what it does.</p>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -22; }
        }
        @media (prefers-reduced-motion: reduce) {
          svg * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
