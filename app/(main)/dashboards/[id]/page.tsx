"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCanvas } from "@/app/components/dashboards/DashboardCanvas";
import { AgentChatPanel } from "@/app/components/layout/AgentChatPanel";
import { BACKEND_URL } from "@/app/lib/api";

interface TileSpec {
  id: string;
  type: "viz_chart" | "mermaid" | "text";
  content: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
}

interface Dashboard {
  id: string;
  title: string;
  layoutJson: TileSpec[];
  updatedAt: string;
}

export default function DashboardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dashboardId = params?.id as string;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFSChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  useEffect(() => {
    if (!dashboardId) return;
    async function fetchDashboard() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/dashboards/${dashboardId}`);
        if (!response.ok) throw new Error("Dashboard not found");
        const data = await response.json();
        // Defensively parse layoutJson in case the API returns a pre-serialised string
        const layoutJson = typeof data.layoutJson === "string"
          ? JSON.parse(data.layoutJson)
          : (data.layoutJson ?? []);
        setDashboard({ ...data, layoutJson });
        setTitle(data.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, [dashboardId, refreshKey]);

  const handleTitleBlur = async () => {
    if (!dashboard || title === dashboard.title) { setIsEditingTitle(false); return; }
    try {
      await fetch(`${BACKEND_URL}/api/dashboards/${dashboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setDashboard({ ...dashboard, title });
    } catch {}
    setIsEditingTitle(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-20 border-b border-border animate-pulse bg-surface/20" />
        <div className="flex-1 p-8">
          <div className="w-full aspect-[16/9] rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{error ?? "Dashboard not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div ref={canvasRef} className="flex flex-col flex-1 overflow-hidden" style={isFullscreen ? { backgroundColor: "#0F1117" } : undefined}>
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pl-6 pr-14 py-4 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-surface transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); }}
                autoFocus
                className="w-full bg-transparent text-2xl font-bold text-primary outline-none"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
              >
                {title}
              </h1>
            )}
          </div>
          <span className="text-xs text-muted-foreground rounded-full bg-surface border border-border px-3 py-1">
            Agent created
          </span>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-8">
          {dashboard.layoutJson.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-sm text-muted-foreground">This dashboard has no tiles yet.</p>
              <p className="text-xs text-muted-foreground">Ask the agent to add content.</p>
            </div>
          ) : (
            <DashboardCanvas tiles={dashboard.layoutJson} />
          )}
        </div>

        {/* Canvas controls */}
        <div className="flex items-center justify-end pl-6 pr-14 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={() => {
              if (isFullscreen) {
                document.exitFullscreen().catch(console.error);
              } else if (canvasRef.current) {
                canvasRef.current.requestFullscreen().catch(console.error);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm text-muted-foreground hover:text-primary hover:border-accent/40 transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Agent Chat Panel */}
      <AgentChatPanel
        resourceId={`dashboard:${dashboardId}`}
        onResourceUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
