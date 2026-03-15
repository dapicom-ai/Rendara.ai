"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCallIndicator } from "./ToolCallIndicator";
import { VizChartBlock } from "@/app/components/viz";
import { MermaidBlock } from "@/app/components/viz";
import type { VizSpec } from "@/types";
import { DashboardPreviewCard } from "./DashboardPreviewCard";
import { StoryPreviewCard } from "./StoryPreviewCard";

type VizStatus = "running" | "complete" | "incomplete";

function toVizStatus(s: string): VizStatus {
  if (s === "running" || s === "complete" || s === "incomplete") return s;
  return "incomplete";
}

/**
 * VizChartToolUI -- renders viz_block tool calls using PRISM's VizChartBlock.
 * Mounted inside AssistantRuntimeProvider to register the tool UI.
 */
export const VizChartToolUI = makeAssistantToolUI({
  toolName: "viz_block",
  render: ({ toolCallId, result, status }) => {
    const statusType = toVizStatus(status.type);
    if (!result) {
      return <ToolCallIndicator toolName="viz_block" status={statusType} />;
    }
    return (
      <VizChartBlock
        spec={result as VizSpec}
        status={statusType}
        blockId={toolCallId}
        showPinButton={false}
      />
    );
  },
});

/**
 * MermaidToolUI -- renders mermaid_block tool calls using PRISM's MermaidBlock.
 */
export const MermaidToolUI = makeAssistantToolUI({
  toolName: "mermaid_block",
  render: ({ toolCallId, result, status }) => {
    const statusType = toVizStatus(status.type);
    if (!result) {
      return <ToolCallIndicator toolName="mermaid_block" status={statusType} />;
    }
    return (
      <MermaidBlock
        definition={result as string}
        status={statusType}
        blockId={toolCallId}
        showPinButton={false}
      />
    );
  },
});

export const DashboardToolUI = makeAssistantToolUI({
  toolName: "create_dashboard",
  render: ({ result, status }) => {
    const statusType = toVizStatus(status.type);
    if (!result) {
      return <ToolCallIndicator toolName="create_dashboard" status={statusType} />;
    }
    const r = result as { dashboard_id: string; title: string };
    return <DashboardPreviewCard dashboardId={r.dashboard_id} title={r.title} />;
  },
});

export const StoryToolUI = makeAssistantToolUI({
  toolName: "create_story",
  render: ({ result, status }) => {
    const statusType = toVizStatus(status.type);
    if (!result) {
      return <ToolCallIndicator toolName="create_story" status={statusType} />;
    }
    const r = result as { story_id: string; title: string; slide_count?: number };
    return <StoryPreviewCard storyId={r.story_id} title={r.title} slideCount={r.slide_count ?? 0} />;
  },
});

export const SemanticSchemaToolUI = makeAssistantToolUI({
  toolName: "get_semantic_model_schema",
  render: ({ status }) => {
    if (status.type === "complete") return null;
    return (
      <div className="flex items-center gap-2 my-1 text-xs text-muted-foreground">
        <span className="inline-block size-1.5 rounded-full bg-accent animate-pulse" />
        <span>Loading data model…</span>
      </div>
    );
  },
});

/**
 * MCPToolCallUI -- renders generic MCP tool calls (e.g. execute_query)
 * Uses a fallback pattern: any tool call not matched by viz_block/mermaid_block
 * will render as a ToolCallIndicator.
 */
export const MCPToolCallUI = makeAssistantToolUI({
  toolName: "*",
  render: ({ toolName, args, result, status }) => {
    // Skip tools that have dedicated UIs
    if (["viz_block", "mermaid_block", "create_dashboard", "create_story", "generate_query", "execute_query", "get_semantic_model_schema"].includes(toolName)) {
      return null;
    }

    const toolResult = result as Record<string, unknown> | undefined;
    return (
      <ToolCallIndicator
        toolName={toolName}
        status={status.type}
        result={
          toolResult
            ? {
                success: !toolResult.error_code,
                duration_ms: toolResult.duration_ms as number | undefined,
                result_summary: toolResult.result_summary as string | undefined,
                server_name: toolResult.server_name as string | undefined,
                error_code: toolResult.error_code as string | undefined,
                error_message: toolResult.error_message as string | undefined,
              }
            : undefined
        }
      />
    );
  },
});
