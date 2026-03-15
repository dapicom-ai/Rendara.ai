// SSE Event Schema (SDD Appendix B)
// All events emitted by the FastAPI backend over /api/chat/stream.

export interface TextDeltaEvent {
  type: "text_delta";
  delta: string;
}

export interface ToolCallStartEvent {
  type: "tool_call_start";
  tool_call_id: string;
  tool_name: string;
  server_name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResultEvent {
  type: "tool_call_result";
  tool_call_id: string;
  tool_name: string;
  server_name: string;
  success: true;
  duration_ms: number;
  result_summary: string;
  tool_result?: Record<string, unknown>;
}

export interface ToolCallErrorEvent {
  type: "tool_call_error";
  tool_call_id: string;
  tool_name: string;
  server_name: string;
  error_code: "MCP_UNREACHABLE" | "MCP_TIMEOUT" | "MCP_TOOL_ERROR" | "TOOL_NOT_FOUND";
  error_message: string;
}

import type { VizSpec } from "./viz";

export interface VizBlockEvent {
  type: "viz_block";
  block_id: string;
  spec: VizSpec;
}

export interface MermaidBlockEvent {
  type: "mermaid_block";
  block_id: string;
  definition: string;
}

export interface MessageCompleteEvent {
  type: "message_complete";
  conversation_id: string;
  message_id: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface ErrorEvent {
  type: "error";
  error_code:
    | "OPENROUTER_UNAVAILABLE"
    | "CONTEXT_ASSEMBLY_FAILED"
    | "STREAM_INTERRUPTED"
    | "INTERNAL_ERROR";
  error_message: string;
  recoverable: boolean;
}

// New events for Pinned Responses, Dashboards, Stories
export interface PinnedMetadataEvent {
  type: "pinned_metadata";
  title: string;
  description: string;
  message_id: string;
}

export interface DashboardCreatingEvent {
  type: "dashboard_creating";
  message: string;
}

export interface DashboardCompleteEvent {
  type: "dashboard_complete";
  dashboard_id: string;
  title: string;
}

export interface StoryCreatingEvent {
  type: "story_creating";
  message: string;
}

export interface StoryCompleteEvent {
  type: "story_complete";
  story_id: string;
  title: string;
}

export interface ResourceUpdatedEvent {
  type: "resource_updated";
  resource_type: "dashboard" | "story";
  resource_id: string;
}

// Discriminated union of all SSE event types
export type SSEEvent =
  | TextDeltaEvent
  | ToolCallStartEvent
  | ToolCallResultEvent
  | ToolCallErrorEvent
  | VizBlockEvent
  | MermaidBlockEvent
  | MessageCompleteEvent
  | ErrorEvent
  | PinnedMetadataEvent
  | DashboardCreatingEvent
  | DashboardCompleteEvent
  | StoryCreatingEvent
  | StoryCompleteEvent
  | ResourceUpdatedEvent;
