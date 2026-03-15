"use client";

import { useEffect, useState } from "react";
import { McpServerBadge } from "./McpServerBadge";

interface McpServer {
  name: string;
  status: "connected" | "disconnected" | "error";
}

export function McpStatusBar() {
  const [servers, setServers] = useState<McpServer[]>([]);

  useEffect(() => {
    // In a real app, fetch MCP servers from API
    // For MVP, hardcode demo servers
    setServers([
      { name: "SQL Analytics (Demo)", status: "connected" },
      { name: "Power BI", status: "disconnected" },
    ]);
  }, []);

  if (servers.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border px-3 py-3">
      <p className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        MCP Servers
      </p>
      <div className="flex flex-wrap gap-2">
        {servers.map((server) => (
          <McpServerBadge
            key={server.name}
            name={server.name}
            status={server.status}
          />
        ))}
      </div>
    </div>
  );
}
