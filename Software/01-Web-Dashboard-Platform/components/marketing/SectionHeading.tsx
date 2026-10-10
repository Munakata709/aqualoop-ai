import { cn } from "cn";

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {kicker && <p className="text-sm font-semibold uppercase tracking-wide text-primary">{kicker}</p>}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}
