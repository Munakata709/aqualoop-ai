"use client";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { useFleetClock } from "@/lib/store/fleetStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useFleetClock();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardTopBar />
        <main className="flex-1 overflow-x-hidden bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
