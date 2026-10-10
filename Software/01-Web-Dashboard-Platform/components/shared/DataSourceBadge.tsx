import { Badge } from "@/components/ui/badge";
import type { DataSource } from "@/lib/simulation/types";
import { cn } from "cn";

const LABELS: Record<DataSource, string> = {
  simulated: "Simulated",
  forecast: "Forecast",
  measured: "Measured",
  estimated: "Estimated",
  "user-entered": "User-entered",
};

const STYLES: Record<DataSource, string> = {
  simulated: "bg-secondary text-muted-foreground border-border",
  forecast: "bg-battery/15 text-battery border-battery/30",
  measured: "bg-success/15 text-success border-success/30",
  estimated: "bg-solar/15 text-solar border-solar/30",
  "user-entered": "bg-water/15 text-water border-water/30",
};

export function DataSourceBadge({ source, className }: { source: DataSource; className?: string }) {
  return (
    <Badge variant="outline" className={cn("data-source-badge", STYLES[source], className)}>
      {LABELS[source]}
    </Badge>
  );
}
