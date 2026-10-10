"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/hybrid-energy", label: "Hybrid Energy" },
  { href: "/optimization", label: "AI Optimization" },
  { href: "/deployment", label: "Deployment" },
  { href: "/desalination", label: "vs. Desalination" },
  { href: "/technology", label: "Technology" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Droplets className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="text-foreground">AquaLoop AI</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button render={<Link href="/simulation" />} variant="ghost" size="sm">
            Live Simulation
          </Button>
          <Button render={<Link href="/dashboard" />} size="sm">
            Command Center
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button render={<Link href="/simulation" />} variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Live Simulation
              </Button>
              <Button render={<Link href="/dashboard" />} size="sm" onClick={() => setOpen(false)}>
                Command Center
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
