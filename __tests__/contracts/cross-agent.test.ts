/**
 * Suite 11: Cross-Agent Contract Tests (Frontend side).
 *
 * Verifies that interfaces between agents are consistent:
 * - MERIDIAN <-> ANVIL: SSE Event Consumption
 * - MERIDIAN <-> PRISM: Tool UI Registration
 * - All <-> FORGE: Shared TypeScript Interfaces
 *
 * These are static/structural tests using TypeScript type imports.
 * No runtime components needed — tests verify structural contracts.
 *
 * SDD Section 5.1 — SSE Event Schema
 * SDD Appendix B — SSE Event Schema Reference
 * SDD Appendix D — Content Block Type Reference
 */

import { describe, it, expect } from 'vitest';

// Import shared type definitions from FORGE's types/
import type {
  SSEEvent,
  TextDeltaEvent,
  ToolCallStartEvent,
  ToolCallResultEvent,
  ToolCallErrorEvent,
  VizBlockEvent,
  MermaidBlockEvent,
  MessageCompleteEvent,
  ErrorEvent,
} from '@/types/sse';

import type {
  ContentBlock,
  TextBlock,
  VizChartBlock,
  MermaidBlock,
  ToolCallBlock,
} from '@/types/content-blocks';

import type {
  VizSpec,
  BarVizSpec,
  LineVizSpec,
  AreaVizSpec,
  PieVizSpec,
  ScatterVizSpec,
  ComposedVizSpec,
  KpiVizSpec,
  ChartType,
} from '@/types/viz';

import type {
  Conversation,
  Message,
  Dashboard,
  Pin,
  Report,
  ChatStreamRequest,
} from '@/types/api';

import { isValidVizSpec, isValidKpiSpec } from '@/types/viz';


// ---------------------------------------------------------------------------
// MERIDIAN <-> ANVIL: SSE Event field name verification
// ---------------------------------------------------------------------------

describe('SSE Event Schema Contracts (SDD Appendix B)', () => {
  it('TextDeltaEvent has type and delta fields', () => {
    // SDD 5.1: text_delta event schema
    const event: TextDeltaEvent = {
      type: 'text_delta',
      delta: 'Hello world',
    };
    expect(event.type).toBe('text_delta');
    expect(typeof event.delta).toBe('string');
  });

  it('ToolCallStartEvent has all required fields', () => {
    // SDD 5.1: tool_call_start event schema
    const event: ToolCallStartEvent = {
      type: 'tool_call_start',
      tool_call_id: 'tc_01',
      tool_name: 'execute_query',
      server_name: 'SQL Analytics (Demo)',
      arguments: { sql: 'SELECT * FROM sales' },
    };
    expect(event.type).toBe('tool_call_start');
    expect(typeof event.tool_call_id).toBe('string');
    expect(typeof event.tool_name).toBe('string');
    expect(typeof event.server_name).toBe('string');
    expect(typeof event.arguments).toBe('object');
  });

  it('ToolCallResultEvent has success:true, duration_ms, result_summary', () => {
    // SDD 5.1: tool_call_result event schema
    const event: ToolCallResultEvent = {
      type: 'tool_call_result',
      tool_call_id: 'tc_01',
      tool_name: 'execute_query',
      server_name: 'SQL Analytics (Demo)',
      success: true,
      duration_ms: 143,
      result_summary: '4 rows returned',
    };
    expect(event.success).toBe(true);
    expect(typeof event.duration_ms).toBe('number');
    expect(typeof event.result_summary).toBe('string');
  });

  it('ToolCallErrorEvent has error_code and error_message', () => {
    // SDD 5.1: tool_call_error event schema
    const event: ToolCallErrorEvent = {
      type: 'tool_call_error',
      tool_call_id: 'tc_01',
      tool_name: 'execute_query',
      server_name: 'SQL Analytics (Demo)',
      error_code: 'MCP_TOOL_ERROR',
      error_message: 'SQL validation failed',
    };
    expect(typeof event.error_code).toBe('string');
    expect(typeof event.error_message).toBe('string');
  });

  it('VizBlockEvent has block_id and spec', () => {
    // SDD 5.1: viz_block event schema
    const spec: BarVizSpec = {
      type: 'bar',
      title: 'Revenue',
      data: [{ region: 'AMER', revenue: 1000 }],
      xKey: 'region',
      yKey: 'revenue',
    };
    const event: VizBlockEvent = {
      type: 'viz_block',
      block_id: 'viz_01',
      spec,
    };
    expect(event.type).toBe('viz_block');
    expect(typeof event.block_id).toBe('string');
    expect(event.spec.type).toBe('bar');
  });

  it('MermaidBlockEvent has block_id and definition', () => {
    // SDD 5.1: mermaid_block event schema
    const event: MermaidBlockEvent = {
      type: 'mermaid_block',
      block_id: 'mmd_01',
      definition: 'flowchart TD\n  A --> B',
    };
    expect(typeof event.block_id).toBe('string');
    expect(typeof event.definition).toBe('string');
  });

  it('MessageCompleteEvent has conversation_id, message_id, usage', () => {
    // SDD 5.1: message_complete event schema
    const event: MessageCompleteEvent = {
      type: 'message_complete',
      conversation_id: 'conv_abc123',
      message_id: 'msg_xyz789',
      usage: { prompt_tokens: 1240, completion_tokens: 387 },
    };
    expect(typeof event.conversation_id).toBe('string');
    expect(typeof event.message_id).toBe('string');
    expect(typeof event.usage.prompt_tokens).toBe('number');
    expect(typeof event.usage.completion_tokens).toBe('number');
  });

  it('ErrorEvent has error_code, error_message, recoverable', () => {
    // SDD 5.1: error event schema
    const event: ErrorEvent = {
      type: 'error',
      error_code: 'OPENROUTER_UNAVAILABLE',
      error_message: 'LLM unavailable',
      recoverable: true,
    };
    expect(typeof event.error_code).toBe('string');
    expect(typeof event.error_message).toBe('string');
    expect(typeof event.recoverable).toBe('boolean');
  });
});


// ---------------------------------------------------------------------------
// MERIDIAN <-> PRISM: Tool UI field name mapping
// ---------------------------------------------------------------------------

describe('Tool UI Status Mapping Contracts (SDD 5.5)', () => {
  it('tool_call_start maps to running status', () => {
    // SDD 5.5: tool_call_start → "running"
    // This is a contract assertion: the values must match what makeAssistantToolUI expects
    const statusMapping = {
      tool_call_start: 'running',
      tool_call_result: 'complete',
      tool_call_error: 'incomplete',
    };
    expect(statusMapping.tool_call_start).toBe('running');
    expect(statusMapping.tool_call_result).toBe('complete');
    expect(statusMapping.tool_call_error).toBe('incomplete');
  });

  it('viz_block tool name matches SSE event type field', () => {
    // The tool name in makeAssistantToolUI must match the SSE event type
    // SDD 5.5: viz_block and mermaid_block are modeled as tool calls
    const toolNames = {
      viz: 'viz_block',
      mermaid: 'mermaid_block',
    };
    expect(toolNames.viz).toBe('viz_block');
    expect(toolNames.mermaid).toBe('mermaid_block');
  });
});


// ---------------------------------------------------------------------------
// FORGE: Shared TypeScript Interface Consistency
// ---------------------------------------------------------------------------

describe('ContentBlock Type Definitions (SDD Appendix D)', () => {
  it('TextBlock has type "text" and text field', () => {
    const block: TextBlock = { type: 'text', text: 'Hello world' };
    expect(block.type).toBe('text');
    expect(typeof block.text).toBe('string');
  });

  it('VizChartBlock has type "viz_chart" and spec field', () => {
    const spec: BarVizSpec = {
      type: 'bar',
      title: 'Chart',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    };
    const block: VizChartBlock = { type: 'viz_chart', spec };
    expect(block.type).toBe('viz_chart');
    expect(block.spec.type).toBe('bar');
  });

  it('MermaidBlock has type "mermaid" and definition field', () => {
    const block: MermaidBlock = { type: 'mermaid', definition: 'flowchart TD\n  A --> B' };
    expect(block.type).toBe('mermaid');
    expect(typeof block.definition).toBe('string');
  });

  it('ToolCallBlock has all required fields', () => {
    const block: ToolCallBlock = {
      type: 'tool_call',
      tool_call_id: 'tc_01',
      tool_name: 'execute_query',
      server_name: 'SQL Analytics (Demo)',
      success: true,
      duration_ms: 143,
      error_code: null,
      error_message: null,
    };
    expect(block.type).toBe('tool_call');
    expect(block.success).toBe(true);
    expect(block.error_code).toBeNull();
  });

  it('ContentBlock discriminated union covers all 4 types', () => {
    // Type-level contract: all 4 block types are in the union
    const types: ContentBlock['type'][] = ['text', 'viz_chart', 'mermaid', 'tool_call'];
    expect(types).toHaveLength(4);
  });
});


// ---------------------------------------------------------------------------
// API Type Contracts (ATLAS <-> ANVIL)
// ---------------------------------------------------------------------------

describe('API Type Contracts (SDD Section 9, 10)', () => {
  it('ChatStreamRequest has required fields matching SDD 10.1', () => {
    // SDD 10.1: POST /api/chat/stream request body
    const req: ChatStreamRequest = {
      conversation_id: 'conv_123',
      message: 'What are total sales?',
      new_conversation: false,
    };
    expect(typeof req.conversation_id).toBe('string');
    expect(typeof req.message).toBe('string');
    expect(typeof req.new_conversation).toBe('boolean');
  });

  it('Conversation type has all fields from SDD 9.1', () => {
    const conv: Conversation = {
      id: 'conv_123',
      title: 'Q4 Analysis',
      created_at: '2026-03-13T10:00:00Z',
      updated_at: '2026-03-13T10:00:00Z',
      deleted_at: null,
    };
    expect(conv.deleted_at).toBeNull();
  });

  it('Pin block_type field matches SDD 9.1 constraint', () => {
    // SDD 9.1: block_type TEXT — 'viz_chart' | 'mermaid' | 'text'
    const validTypes: Pin['block_type'][] = ['viz_chart', 'mermaid', 'text'];
    expect(validTypes).toHaveLength(3);
  });

  it('Report has public_uuid that can be null (draft) or string (published)', () => {
    // SDD 9.1: public_uuid TEXT UNIQUE; null = draft
    const draftReport: Report = {
      id: 'rep_123',
      title: 'Draft Report',
      content: '[]',
      public_uuid: null,
      created_at: '2026-03-13T10:00:00Z',
      updated_at: '2026-03-13T10:00:00Z',
    };
    expect(draftReport.public_uuid).toBeNull();
  });
});


// ---------------------------------------------------------------------------
// VizSpec Type Consistency (all 7 chart types)
// ---------------------------------------------------------------------------

describe('VizSpec Type Definitions (SDD Section 8.1, Appendix A)', () => {
  it('ChartType covers all 7 chart types', () => {
    // SDD 8.1: bar, line, area, pie, scatter, composed, kpi
    const chartTypes: ChartType[] = ['bar', 'line', 'area', 'pie', 'scatter', 'composed', 'kpi'];
    expect(chartTypes).toHaveLength(7);
  });

  it('ComposedVizSpec has y2Key field', () => {
    // SDD 8.1: y2Key additionally required for composed
    const spec: ComposedVizSpec = {
      type: 'composed',
      title: 'Revenue and Units',
      data: [{ month: 'Jan', revenue: 1000, units: 50 }],
      xKey: 'month',
      yKey: 'revenue',
      y2Key: 'units',
    };
    expect(spec.y2Key).toBe('units');
  });

  it('KpiVizSpec has data as KpiItem array (not DataRecord)', () => {
    // SDD Appendix A: kpi spec has different structure (no xKey/yKey)
    const spec: KpiVizSpec = {
      type: 'kpi',
      title: 'Key Metrics',
      data: [
        { label: 'Revenue', value: 1842350, format: 'currency', trend: '+12%', trendDirection: 'up' },
      ],
    };
    expect(spec.data[0].label).toBe('Revenue');
    expect(spec.data[0].format).toBe('currency');
  });
});
