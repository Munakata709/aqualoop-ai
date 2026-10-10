"use client";

interface FlowNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface FlowEdge {
  from: string;
  to: string;
  kw: number;
}

const NODES: FlowNode[] = [
  { id: "solar", label: "Solar Array", x: 70, y: 40, color: "var(--color-solar)" },
  { id: "battery", label: "Battery", x: 70, y: 160, color: "var(--color-battery)" },
  { id: "generator", label: "Gas Generator", x: 70, y: 280, color: "var(--color-gas)" },
  { id: "awg", label: "AWG Load", x: 300, y: 160, color: "var(--color-water)" },
];

export function EnergyFlowDiagram({
  solarToAwgKw,
  solarToBatteryKw,
  batteryToAwgKw,
  generatorToAwgKw,
  unmetKw,
  maxKw,
}: {
  solarToAwgKw: number;
  solarToBatteryKw: number;
  batteryToAwgKw: number;
  generatorToAwgKw: number;
  unmetKw: number;
  maxKw: number;
}) {
  const edges: FlowEdge[] = [
    { from: "solar", to: "awg", kw: solarToAwgKw },
    { from: "solar", to: "battery", kw: solarToBatteryKw },
    { from: "battery", to: "awg", kw: batteryToAwgKw },
    { from: "generator", to: "awg", kw: generatorToAwgKw },
  ];
  const nodeById = new Map(NODES.map((n) => [n.id, n]));
  const widthFor = (kw: number) => Math.max(1, Math.min(10, 1 + (kw / Math.max(1, maxKw)) * 9));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <svg viewBox="0 0 380 320" className="h-auto w-full" role="img" aria-label="Energy flow diagram">
        {edges.map((edge) => {
          const from = nodeById.get(edge.from)!;
          const to = nodeById.get(edge.to)!;
          const active = edge.kw > 0.01;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={from.x + 32}
                y1={from.y}
                x2={to.x - 32}
                y2={to.y}
                stroke={active ? from.color : "var(--border)"}
                strokeWidth={widthFor(edge.kw)}
                strokeOpacity={active ? 0.85 : 0.3}
                strokeDasharray={active ? "8 6" : undefined}
                className={active ? "animate-[energyflow_1s_linear_infinite]" : undefined}
                strokeLinecap="round"
              />
              {active && (
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 10} textAnchor="middle" fontSize={11} fill="var(--foreground)">
                  {edge.kw.toFixed(1)} kW
                </text>
              )}
            </g>
          );
        })}

        {NODES.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle r={30} fill="var(--secondary)" stroke={node.color} strokeWidth={2} />
            <text y={48} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--foreground)">
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {unmetKw > 0.01 && (
        <p className="mt-2 rounded-lg border border-critical/30 bg-critical/10 p-2 text-center text-xs text-critical">
          Unmet load: {unmetKw.toFixed(1)} kW — solar, battery, and generator together couldn&apos;t cover requested demand this step.
        </p>
      )}
      <style>{`
        @keyframes energyflow { to { stroke-dashoffset: -28; } }
        @media (prefers-reduced-motion: reduce) { svg * { animation: none !important; } }
      `}</style>
    </div>
  );
}
