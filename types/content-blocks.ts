// Content Block Type Reference (SDD Appendix D)
// Used in both SSE streaming events and SQLite message storage.

import type { VizSpec } from "./viz";

// D.1 Markdown / text block
export interface TextBlock {
  type: "text";
  text: string;
}

// D.2 Viz chart block
export interface VizChartBlock {
  type: "viz_chart";
  spec: VizSpec;
}

// D.3 Mermaid diagram block
export interface MermaidBlock {
  type: "mermaid";
  definition: string;
}

// D.4 Tool call block — records tool execution in stored messages
export interface ToolCallBlock {
  type: "tool_call";
  tool_call_id: string;
  tool_name: string;
  server_name: string;
  success: boolean;
  duration_ms: number;
  error_code: string | null;
  error_message: string | null;
}

// Discriminated union of all content block types (SDD Appendix D)
export type ContentBlock =
  | TextBlock
  | VizChartBlock
  | MermaidBlock
  | ToolCallBlock;
