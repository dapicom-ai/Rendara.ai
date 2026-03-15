import React from "react";
import { DashboardTile } from "./DashboardTile";

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

interface DashboardCanvasProps {
  tiles: TileSpec[];
  className?: string;
  style?: React.CSSProperties;
}

export function DashboardCanvas({ tiles, className, style }: DashboardCanvasProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#0F1117",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #2D313E",
        ...style,
      }}
    >
      {tiles.map((tile) => (
        <DashboardTile key={tile.id} tile={tile} />
      ))}
    </div>
  );
}
