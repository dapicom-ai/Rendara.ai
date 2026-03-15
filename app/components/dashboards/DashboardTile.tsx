import React from "react";
import { VizChartBlock } from "@/app/components/viz";
import { MermaidBlock } from "@/app/components/viz";
import { MarkdownRenderer } from "@/app/components/ui/MarkdownRenderer";
import type { VizSpec } from "@/types/viz";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "viz_chart"; spec: VizSpec }
  | { type: "mermaid"; definition: string };

interface TileSpec {
  id: string;
  type: "text" | "viz_chart" | "mermaid";
  content: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
}

interface DashboardTileProps {
  tile: TileSpec;
}

function normaliseContent(raw: unknown): ContentBlock[] {
  if (Array.isArray(raw)) {
    return raw as ContentBlock[];
  }
  if (typeof raw === "string") {
    return [{ type: "text", text: raw }];
  }
  return [{ type: "text", text: JSON.stringify(raw) }];
}

export function DashboardTile({ tile }: DashboardTileProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${tile.x}%`,
    top: `${tile.y}%`,
    width: `${tile.w}%`,
    height: `${tile.h}%`,
    overflow: "hidden",
  };

  function renderContent() {
    const blocks = normaliseContent(tile.content);
    const isKpi = blocks.some(
      (b) => b.type === "viz_chart" && (b as { type: "viz_chart"; spec: VizSpec }).spec?.type === "kpi"
    );
    return (
      <div
        className={
          isKpi
            ? "h-full overflow-hidden rounded-xl border border-border bg-surface p-3"
            : "h-full overflow-hidden rounded-xl bg-surface p-3"
        }
      >
        {blocks.map((block, idx) => {
          if (block.type === "text") {
            return <MarkdownRenderer key={idx} content={block.text} />;
          }
          if (block.type === "viz_chart") {
            return (
              <VizChartBlock
                key={idx}
                blockId={`${tile.id}-${idx}`}
                spec={block.spec}
                status="complete"
                readOnly={true}
                showPinButton={false}
                compact={true}
                allowExpand={true}
                className="h-full"
              />
            );
          }
          if (block.type === "mermaid") {
            return (
              <MermaidBlock
                key={idx}
                blockId={`${tile.id}-${idx}`}
                definition={block.definition}
                status="complete"
                readOnly={true}
                showPinButton={false}
                allowExpand={true}
                compact={true}
                className="h-full"
              />
            );
          }
          return null;
        })}
      </div>
    );
  }

  return <div style={style}>{renderContent()}</div>;
}
