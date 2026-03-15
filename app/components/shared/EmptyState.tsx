"use client";

import { MessageSquare, LayoutDashboard, FileText, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  variant:
    | "conversations"
    | "dashboards"
    | "dashboard-detail"
    | "reports"
    | "report-builder"
    | "pinned";
  onAction?: () => void;
  className?: string;
}

const emptyStateConfigs = {
  conversations: {
    icon: MessageSquare,
    title: "No conversations yet",
    subtitle: "Start a new conversation to explore your data",
    ctaLabel: "New Conversation",
  },
  dashboards: {
    icon: LayoutDashboard,
    title: "No dashboards yet",
    subtitle: "Dashboards are created by the agent. Ask in chat to create one.",
    ctaLabel: "Create Dashboard",
  },
  "dashboard-detail": {
    icon: LayoutDashboard,
    title: "No insights pinned",
    subtitle: "Pin insights from your conversations to build this dashboard",
    ctaLabel: "Go to Conversations",
  },
  reports: {
    icon: FileText,
    title: "No reports yet",
    subtitle: "Build your first data story",
    ctaLabel: "Create Report",
  },
  "report-builder": {
    icon: FileText,
    title: "Empty report",
    subtitle: "Add sections to build your report story",
    ctaLabel: "Add Section",
  },
  pinned: {
    icon: Bookmark,
    title: "No pinned responses yet",
    subtitle: "Pin a response from chat to save it here.",
    ctaLabel: "",
  },
};

export function EmptyState({
  variant,
  onAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfigs[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-24 px-4",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground" />
      <div className="text-center">
        <h3 className="text-balance text-lg font-semibold text-primary">
          {config.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{config.subtitle}</p>
      </div>
      {onAction && (
        <Button onClick={onAction} className="mt-4">
          {config.ctaLabel}
        </Button>
      )}
    </div>
  );
}
