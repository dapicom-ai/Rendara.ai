"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface McpServerBadgeProps {
  name: string;
  status: "connected" | "disconnected" | "error";
  onClick?: () => void;
}

export function McpServerBadge({
  name,
  status,
  onClick,
}: McpServerBadgeProps) {
  const statusColor =
    status === "connected"
      ? "bg-success"
      : status === "error"
        ? "bg-error"
        : "bg-muted";

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-surface/50",
          "text-muted-foreground hover:text-primary"
        )}
        aria-label={`${name} - ${status}`}
      >
        <div className={cn("h-2 w-2 rounded-full", statusColor)} />
        <span className="truncate">{name}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {status === "connected" ? "Connected" : "Disconnected"}
      </TooltipContent>
    </Tooltip>
  );
}
