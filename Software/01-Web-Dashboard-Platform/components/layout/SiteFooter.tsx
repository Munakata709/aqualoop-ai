import Link from "next/link";

const COLUMNS = [
  {
    heading: "Platform",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/simulation", label: "Live Simulation" },
      { href: "/hybrid-energy", label: "Hybrid Energy" },
      { href: "/optimization", label: "AI Optimization" },
    ],
  },
  {
    heading: "Business",
    links: [
      { href: "/deployment", label: "Corpus Christi Deployment" },
      { href: "/desalination", label: "AquaLoop vs. Desalination" },
      { href: "/dashboard/financials", label: "Financial Calculator" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/technology", label: "Technology" },
      { href: "/impact", label: "Environmental Impact" },
      { href: "/about", label: "About / Mission" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <p className="font-semibold text-foreground">AquaLoop AI</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              AquaLoop AI brings predictive energy management to atmospheric water generation, coordinating solar
              power, battery storage, natural gas backup, and water production through one intelligent platform.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-sm font-semibold text-foreground">{col.heading}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            AWG technology is energy-intensive compared with seawater reverse osmosis. AquaLoop is designed to
            improve AWG economics in applications where decentralized water production offers operational
            advantages — see the desalination comparison for an honest, assumption-transparent breakdown.
          </p>
          <p className="mt-2">© 2026 AquaLoop AI. Demonstration environment — all metrics are simulated unless labeled otherwise.</p>
        </div>
      </div>
    </footer>
  );
}
