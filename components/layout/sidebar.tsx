"use client";

import { useRef, useEffect } from "react";
import { PanelLeft } from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/app/components/layout/AppLogo";
import { NavRail } from "@/app/components/layout/NavRail";
import { ConversationHistoryPanel } from "@/app/components/sidebar/ConversationHistoryPanel";
import { McpStatusBar } from "@/app/components/sidebar/McpStatusBar";
import { useNavigationStore } from "@/app/stores/useNavigationStore";

export function Sidebar() {
  const sidebarCollapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useNavigationStore((s) => s.setSidebarCollapsed);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (sidebarCollapsed) return;
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setSidebarCollapsed(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  if (sidebarCollapsed) {
    return (
      <button
        onClick={() => setSidebarCollapsed(false)}
        className="fixed top-3 left-3 z-50 flex items-center justify-center h-8 w-8 rounded-lg bg-surface hover:bg-surface-high transition-colors text-muted-foreground hover:text-primary"
        aria-label="Open sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside
      ref={drawerRef}
      className="fixed left-0 top-0 h-dvh w-60 z-40 flex flex-col bg-background border-r border-border"
    >
      {/* Logo */}
      <AppLogo />

      {/* Collapse button */}
      <div className="flex justify-end px-3 pt-1">
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-primary"
          aria-label="Close sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Conversation button */}
      <div className="px-3 py-3">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-accent text-background hover:opacity-90 transition-opacity"
        >
          New Conversation
        </Link>
      </div>

      {/* Nav Rail */}
      <NavRail />

      {/* Conversation History */}
      <ConversationHistoryPanel />

      {/* MCP Status Bar */}
      <McpStatusBar />
    </aside>
  );
}
