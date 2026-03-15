"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ArrowUpRight } from "lucide-react";
import { DashboardCanvas } from "@/app/components/dashboards/DashboardCanvas";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

// Natural render size for the canvas inside the miniature
const INNER_W = 960;
const INNER_H = 540;

interface DashboardPreviewCardProps {
  dashboardId: string;
  title: string;
  className?: string;
  noBorder?: boolean;
  hideOpenLink?: boolean;
  /** Slot rendered inside the card after the preview (e.g. a delete button overlay) */
  children?: React.ReactNode;
}

export function DashboardPreviewCard({ dashboardId, title, className, noBorder, hideOpenLink, children }: DashboardPreviewCardProps) {
  const router = useRouter();
  const [tiles, setTiles] = useState<unknown[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/dashboards/${dashboardId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        let layout = d?.layoutJson;
        if (typeof layout === "string") {
          try { layout = JSON.parse(layout); } catch { layout = []; }
        }
        if (Array.isArray(layout)) setTiles(layout);
      })
      .catch(() => {});
  }, [dashboardId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(w / INNER_W);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`rounded-xl bg-surface p-4 flex flex-col gap-3${noBorder ? "" : " border border-border"}${className ? ` ${className}` : " max-w-sm"}${hideOpenLink ? " cursor-pointer" : ""}`}
      onClick={hideOpenLink ? () => router.push(`/dashboards/${dashboardId}`) : undefined}
    >
      <div className="flex items-center gap-2">
        <LayoutDashboard className="size-4 text-accent" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dashboard Created
        </span>
      </div>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>

      {/* Miniature canvas preview */}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border bg-[#0F1117]"
        style={{ aspectRatio: "16/9", position: "relative" }}
      >
        {tiles && tiles.length > 0 ? (
          <div
            style={{
              width: INNER_W,
              height: INNER_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <DashboardCanvas
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tiles={tiles as any}
              style={{ width: INNER_W, height: INNER_H, borderRadius: 0, border: "none" }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <LayoutDashboard className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {!hideOpenLink && (
        <Link
          href={`/dashboards/${dashboardId}`}
          className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 transition-opacity"
        >
          Open Dashboard
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
      {children}
    </div>
  );
}
