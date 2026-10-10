"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Droplets,
  Zap,
  BrainCircuit,
  Flame,
  Wrench,
  DollarSign,
  Scale,
  Settings,
  FileDown,
  Map as MapIcon,
} from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  { href: "/dashboard", label: "Fleet Overview", icon: LayoutDashboard },
  { href: "/dashboard/water", label: "Water & Demand", icon: Droplets },
  { href: "/dashboard/energy", label: "Solar & Battery", icon: Zap },
  { href: "/dashboard/optimization", label: "AI Optimization", icon: BrainCircuit },
  { href: "/dashboard/maintenance", label: "Maintenance & Alerts", icon: Wrench },
  { href: "/dashboard/financials", label: "Financial Analytics", icon: DollarSign },
  { href: "/deployment", label: "Fleet Map", icon: MapIcon },
  { href: "/desalination", label: "Desalination Comparison", icon: Scale },
  { href: "/dashboard/reports", label: "Reports & Export", icon: FileDown },
  { href: "/dashboard/settings", label: "Simulation Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-secondary/30 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Flame className="h-4 w-4" />
        </span>
        <span className="font-semibold text-foreground">Command Center</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        Demonstration environment. No real equipment is connected.
      </div>
    </aside>
  );
}
