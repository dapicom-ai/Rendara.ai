"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LayoutDashboard, ChevronLeft } from "lucide-react";
import { DashboardPreviewCard } from "@/app/components/chat/DashboardPreviewCard";
import { BACKEND_URL } from "@/app/lib/api";

interface Dashboard {
  id: string;
  title: string;
  tileCount: number;
  updatedAt: string;
}

export default function DashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/dashboards`);
        if (res.ok) setDashboards(await res.json());
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`${BACKEND_URL}/api/dashboards/${id}`, { method: "DELETE" });
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-border px-8 py-6">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1.5 hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          aria-label="Back to chat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <LayoutDashboard className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-semibold text-primary">Dashboards</h1>
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl bg-surface/30 animate-pulse" style={{ aspectRatio: "3/2" }} />
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <LayoutDashboard className="size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No dashboards yet</p>
            <p className="text-xs text-muted-foreground">Ask the agent in chat to create a dashboard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="group relative">
                <DashboardPreviewCard
                  dashboardId={dashboard.id}
                  title={dashboard.title}
                  className="w-full"
                  noBorder
                  hideOpenLink
                />
                <button
                  onClick={(e) => handleDelete(dashboard.id, e)}
                  aria-label="Delete dashboard"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-surface hover:bg-surface-high text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
