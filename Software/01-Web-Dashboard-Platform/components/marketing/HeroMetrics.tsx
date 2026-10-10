const METRICS = [
  { value: "20", label: "Simulated AWGs" },
  { value: "1,000 gal/day", label: "Rated fleet target" },
  { value: "70%", label: "Solar energy target" },
  { value: "5", label: "Proposed Corpus Christi clusters" },
  { value: "24h", label: "Predictive optimization horizon" },
];

export function HeroMetrics() {
  return (
    <div>
      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Design targets for the initial demonstration — not live achievements
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border bg-card/60 px-4 py-5 text-center backdrop-blur-sm"
          >
            <p className="text-2xl font-semibold text-foreground sm:text-3xl">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
