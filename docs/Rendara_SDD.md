# Solution Design Document

## Business Data Analyst AI Agent UI

-----

**Document Type:** Solution Design Document (SDD)  
**Version:** 1.0 — Final  
**Based On:** BRD v1.0 — Business Data Analyst AI Agent UI  
**Status:** Approved for Engineering Implementation  
**Date:** March 2026  
**Classification:** Confidential  
**Supersedes:** SDD Architecture Meta-Document (pre-engineering scope document)

-----

## Table of Contents

1. [Document Purpose and Scope](#1-document-purpose-and-scope)
1. [Confirmed Decisions — Inherited from BRD](#2-confirmed-decisions--inherited-from-brd)
1. [System Context and Boundaries](#3-system-context-and-boundaries)
1. [Logical Architecture](#4-logical-architecture)
1. [Streaming and Communication Design](#5-streaming-and-communication-design)
1. [AI Agent Runtime Design](#6-ai-agent-runtime-design)
1. [MCP Integration Design](#7-mcp-integration-design)
1. [Response Content Design](#8-response-content-design)
1. [Data Design](#9-data-design)
1. [API Design](#10-api-design)
1. [Conversation and Context Design](#11-conversation-and-context-design)
1. [Non-Functional Design](#12-non-functional-design)
1. [Security Design](#13-security-design)
1. [Deployment Design](#14-deployment-design)
1. [Architecture Decision Register](#15-architecture-decision-register)
1. [Open Items and Deferred Decisions](#16-open-items-and-deferred-decisions)

**Appendices**

- [Appendix A — JSON Viz Schema Reference](#appendix-a--json-viz-schema-reference)
- [Appendix B — SSE Event Schema Reference](#appendix-b--sse-event-schema-reference)
- [Appendix C — LLM System Prompt Template](#appendix-c--llm-system-prompt-template)
- [Appendix D — Content Block Type Reference](#appendix-d--content-block-type-reference)
- [Appendix E — MCP Test Data Server](#appendix-e--mcp-test-data-server)

-----

-----

# 1. Document Purpose and Scope

## 1.1 What This Document Is

This Solution Design Document is the engineering authority for building the Business Data Analyst AI Agent UI. It translates BRD v1.0 from product intent into implementation contracts: interface schemas, runtime behaviour, fallback rules, data structures, and deployment topology.

Every open question identified in the SDD Architecture Meta-Document has been resolved through a structured decision session. All 12 decisions are locked and recorded in Section 15. This document is final — it does not contain open architectural questions.

## 1.2 What This Document Is Not

This document does not restate product requirements. It does not re-evaluate BRD decisions unless a BRD decision was technically incompatible with the architecture (one such case: Supabase replaced by SQLite — see DR-05). It does not cover Phase 2 features (authentication, multi-tenancy, message branching) except where a Phase 1 decision must leave a clean migration path.

## 1.3 How to Use This Document

**Frontend engineer:** Primary references are Sections 5, 8, and 11. The SSE event schema (Section 5), content block type reference (Appendix D), and viz schema (Appendix A) are the contracts you build against. You do not need to ask the backend engineer about data shapes — everything is defined here.

**Backend engineer:** Primary references are Sections 5, 6, 7, 10, and 14. The chat endpoint contract (Section 10), streaming design (Section 5), tool orchestration (Section 7), and system prompt (Appendix C) are fully specified. You do not need to ask the frontend engineer what the stream must look like.

**Both engineers:** Read Section 15 (Decision Register) before writing any code. Each decision records rationale and consequences — understanding why a decision was made prevents it from being accidentally reversed.

## 1.4 Relationship to the BRD

The BRD is the product authority. This SDD is the technical authority. Where the BRD specifies *what* the system must do, this SDD specifies *how*. Where the two conflict (e.g. Supabase vs. SQLite), this SDD takes precedence and the rationale is recorded in the Decision Register.

-----

-----

# 2. Confirmed Decisions — Inherited from BRD

The following decisions are fixed constraints inherited from BRD v1.0. They are not re-opened or re-evaluated in this SDD.

|#   |Decision                 |Value                                                     |
|----|-------------------------|----------------------------------------------------------|
|T-01|Frontend framework       |Next.js 14+ with TypeScript                               |
|T-02|Chat interface layer     |assistant-ui                                              |
|T-03|UI component library     |shadcn/ui + Radix UI                                      |
|T-04|Styling                  |Tailwind CSS                                              |
|T-05|Data visualisation       |Recharts (Plotly excluded)                                |
|T-06|Diagram rendering        |Mermaid.js                                                |
|T-07|Animation                |Framer Motion                                             |
|T-08|Backend framework        |FastAPI (Python)                                          |
|T-09|LLM provider gateway     |OpenRouter                                                |
|T-10|MCP client implementation|MCP Python SDK                                            |
|T-11|Streaming protocol       |SSE (Server-Sent Events) from FastAPI to frontend         |
|T-12|LLM parameters (base)    |max_tokens: 4096, temperature: 0.3                        |
|T-13|Platform                 |Desktop-first responsive web application                  |
|T-14|Visual theme             |Dark (charcoal #0F1117, surface #1A1D27, accent #00D4FF)  |
|T-15|Frontend deployment      |Vercel                                                    |
|T-16|Backend deployment       |Railway or Render                                         |
|T-17|Authentication           |None in MVP (single-user deployment)                      |
|T-18|Mobile support           |None in MVP                                               |
|T-19|Configuration mechanism  |config.json + mcp_servers.json on disk                    |
|T-20|Source data storage      |Never — source data is never persisted by this application|

**One BRD decision was superseded:**

|BRD Decision     |BRD Value            |SDD Value                  |Rationale                                                                                                                                                                    |
|-----------------|---------------------|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Persistence layer|Supabase (PostgreSQL)|SQLite + JSON files on disk|Removes all external database dependencies for MVP. Zero provisioning, zero credentials, zero network dependency. SQLite demo.db is adequate for single-user demo. See DR-05.|

-----

-----

# 3. System Context and Boundaries

## 3.1 System Context Diagram

```
+---------------------------------------------------------------------+
|                        BROWSER (Desktop)                            |
|                                                                     |
|   +-----------------------------------------------------------+    |
|   |              Next.js Frontend (Vercel)                    |    |
|   |  assistant-ui  shadcn/ui  Recharts  Mermaid.js            |    |
|   +------------------------+----------------------------------+    |
|                             | SSE (chat stream)                     |
|                             | REST (conversations, dashboards)      |
+-----------------------------+---------------------------------------+
                              |
                              v
          +-------------------------------------------+
          |      FastAPI Backend (Railway/Render)      |
          |                                            |
          |  +----------------+  +------------------+ |
          |  | Chat Endpoint  |  |  REST Endpoints  | |
          |  | /chat/stream   |  |  (CRUD)          | |
          |  +-------+--------+  +--------+---------+ |
          |          |                    |            |
          |  +-------v--------+  +--------v---------+ |
          |  | MCP Client     |  | SQLite (demo.db)  | |
          |  | (Python SDK)   |  | + JSON files      | |
          |  +-------+--------+  +------------------+ |
          +----------+---------------------------------+
                     | MCP (SSE or HTTP)
          +----------+------------------------------+
          |         MCP Servers                     |
          |  +------------------+  +-------------+ |
          |  | SQL Analytics    |  | [Future MCP | |
          |  | Demo Server      |  |  Servers]   | |
          |  | (localhost:8001) |  |             | |
          |  +------------------+  +-------------+ |
          +-----------------------------------------+
                     |
          +----------v---------+
          |   OpenRouter API   |
          |  (LLM inference)   |
          +--------------------+
```

## 3.2 Scope Boundary

**In scope — this system owns:**

- The Next.js frontend: all UI, rendering, streaming consumption
- The FastAPI backend: chat orchestration, MCP client, REST API, persistence reads/writes
- The SQLite database (`demo.db`): conversations, messages, dashboards, reports
- The JSON config files: `config.json`, `mcp_servers.json`, `semantic_meta.json`
- The MCP SQL Analytics Demo Server (Appendix E)
- The LLM system prompt and context assembly logic

**Out of scope — external systems own:**

- LLM inference (OpenRouter owns model selection, inference, billing)
- MCP server business logic (each MCP server owns its data and query execution)
- Source business data (never enters this system’s storage boundary)
- DNS, TLS, CDN (Vercel and Railway/Render platform layer)

## 3.3 Assumptions

|#   |Assumption                                                   |Risk if False                                                   |
|----|-------------------------------------------------------------|----------------------------------------------------------------|
|A-01|OpenRouter supports SSE streaming for the configured model   |Stream collapses to polling; TTFT target missed                 |
|A-02|OpenRouter supports OpenAI-compatible tool calling format    |Tool call round-trip must be re-implemented                     |
|A-03|MCP servers are reachable via HTTP/SSE from the backend host |Demo cannot use live data; must fall back to demo server only   |
|A-04|MCP servers return structured data (JSON), not free-form text|LLM context injection logic must be redesigned                  |
|A-05|Demo audience has < 200ms latency to Vercel/Railway          |TTFT perceived as poor despite meeting target                   |
|A-06|Single concurrent user is maximum load for MVP               |Multi-user contention for SQLite write lock                     |
|A-07|LLM via OpenRouter supports at least 32k context window      |Sliding window of 10 messages exceeds context; responses degrade|
|A-08|Demo environment is a controlled setting (known participants)|UUID-only public links expose reports to unintended viewers     |

## 3.4 External Dependencies

|Dependency                         |Interface Type       |MVP Criticality|Owner                    |
|-----------------------------------|---------------------|---------------|-------------------------|
|OpenRouter                         |HTTPS REST + SSE     |Critical       |External                 |
|MCP SQL Analytics Demo Server      |MCP over HTTP/SSE    |Critical       |This project (Appendix E)|
|Vercel (frontend hosting)          |Platform deployment  |Critical       |Platform                 |
|Railway or Render (backend hosting)|Platform deployment  |Critical       |Platform                 |
|Mermaid.js                         |npm package (browser)|High           |Open source              |
|assistant-ui                       |npm package          |High           |Open source              |
|MCP Python SDK                     |pip package          |High           |Open source              |

-----

-----

# 4. Logical Architecture

## 4.1 Component Responsibilities

### Next.js Frontend

**Owns:** All UI rendering and interaction; SSE stream consumption and content block routing; React state for all views; streaming progress indicators; PIN-to-dashboard modal and report builder UI; public report consumer view (`/r/[uuid]`).

**Does not own:** LLM calls; MCP tool calls; persistence (all reads/writes go through FastAPI REST); system prompt construction.

### FastAPI Backend

**Owns:** Chat orchestration (context assembly, LLM request, tool call loop, SSE emission); LLM system prompt construction and injection; MCP client lifecycle; context window assembly; all reads and writes to SQLite `demo.db`; JSON config file loading at startup.

**Does not own:** UI rendering; content block rendering decisions; MCP server business logic.

### MCP Client (within FastAPI)

**Owns:** MCP server connections at startup; `tools/list` calls at startup; tool schema collection and injection into OpenRouter requests; `tools/call` execution; tool call result injection into the messages array.

### SQLite (`demo.db`)

**Owns:** Conversations, messages, dashboards, reports, pins tables. Message content stored as serialised JSON (full assistant-ui message snapshot).

## 4.2 Frontend / Backend AI Boundary

All LLM calls and all MCP calls originate from FastAPI. The frontend never calls OpenRouter directly. The frontend never calls MCP servers directly. This is a hard architectural constraint — it must not be relaxed in the MVP even if assistant-ui’s runtime supports direct OpenRouter connections.

**Rationale:** FastAPI must remain in the stream path to perform MCP tool call orchestration. If the frontend connected to OpenRouter directly, the Python MCP SDK would be bypassed entirely and tool calling would break. See DR-01.

-----

-----

# 5. Streaming and Communication Design

## 5.1 SSE Event Schema

Every event emitted from FastAPI to the frontend over the `/api/chat/stream` endpoint is a JSON object with a mandatory `type` field. Transmitted as:

```
data: {JSON payload}\n\n
```

### `text_delta`

```json
{ "type": "text_delta", "delta": "The revenue trend shows" }
```

### `tool_call_start`

```json
{
  "type": "tool_call_start",
  "tool_call_id": "tc_01",
  "tool_name": "execute_query",
  "server_name": "SQL Analytics (Demo)",
  "arguments": { "model_id": "demo_sales", "sql_query": "SELECT region, SUM(amount) FROM sales GROUP BY region" }
}
```

### `tool_call_result`

```json
{
  "type": "tool_call_result",
  "tool_call_id": "tc_01",
  "tool_name": "execute_query",
  "server_name": "SQL Analytics (Demo)",
  "success": true,
  "duration_ms": 143,
  "result_summary": "4 rows returned"
}
```

### `tool_call_error`

```json
{
  "type": "tool_call_error",
  "tool_call_id": "tc_01",
  "tool_name": "execute_query",
  "server_name": "SQL Analytics (Demo)",
  "error_code": "MCP_TOOL_ERROR",
  "error_message": "SQL validation failed: DML statement detected"
}
```

### `viz_block`

Emitted as a **complete block** after the backend accumulates and validates the full JSON from the LLM stream. Not streamed token-by-token.

```json
{
  "type": "viz_block",
  "block_id": "viz_01",
  "spec": {
    "type": "bar",
    "title": "Q4 2024 Revenue by Region",
    "data": [
      { "region": "AMER", "total_revenue": 1842350 },
      { "region": "EMEA", "total_revenue": 1421780 },
      { "region": "APAC", "total_revenue": 987340 },
      { "region": "LATAM", "total_revenue": 412890 }
    ],
    "xKey": "region",
    "yKey": "total_revenue"
  }
}
```

### `mermaid_block`

Emitted as a complete block after the backend accumulates the full definition.

```json
{
  "type": "mermaid_block",
  "block_id": "mmd_01",
  "definition": "flowchart TD\n  A[Customer] --> B[Sales Rep]\n  B --> C[Order Created]\n  C --> D{Credit Check}\n  D -->|Pass| E[Fulfilled]\n  D -->|Fail| F[On Hold]"
}
```

### `message_complete`

```json
{
  "type": "message_complete",
  "conversation_id": "conv_abc123",
  "message_id": "msg_xyz789",
  "usage": { "prompt_tokens": 1240, "completion_tokens": 387 }
}
```

### `error`

```json
{
  "type": "error",
  "error_code": "OPENROUTER_UNAVAILABLE",
  "error_message": "The LLM service is temporarily unavailable. Please try again.",
  "recoverable": true
}
```

## 5.2 Content Block Sentinels

The LLM is instructed (via system prompt) to wrap structured content with sentinels:

|Block Type|Start Sentinel   |End Sentinel   |
|----------|-----------------|---------------|
|Viz JSON  |`<<<VIZ_START>>>`|`<<<VIZ_END>>>`|
|Mermaid   |`<<<MMD_START>>>`|`<<<MMD_END>>>`|

The backend stream processor buffers tokens between sentinels, then emits the typed event. Text outside sentinels is emitted as `text_delta` immediately without buffering.

## 5.3 Backend Stream Processing Logic

```
OpenRouter SSE stream
        |
        v
Stream Processor (FastAPI):
  1. Text delta? -> emit text_delta to frontend immediately
  2. Tool call signal? ->
       emit tool_call_start
       execute MCP tool
       emit tool_call_result or tool_call_error
       inject result into messages array
       resume LLM call (next round)
  3. Accumulating VIZ block (<<<VIZ_START>>> detected)?
       buffer until <<<VIZ_END>>>
       validate JSON
       emit viz_block (or skip if invalid per DR-07)
  4. Accumulating MMD block (<<<MMD_START>>> detected)?
       buffer until <<<MMD_END>>>
       emit mermaid_block
  5. OpenRouter [DONE] and no more tool calls?
       persist message to SQLite
       emit message_complete
```

## 5.4 Streaming State Machine

```
IDLE
  | user submits message
  v
SUBMITTING
  | POST /api/chat/stream returns 200 + stream begins
  v
STREAMING (receiving text_delta events)
  | tool_call_start received
  v
TOOL_CALLING
  | tool_call_result or tool_call_error received
  | (may repeat zero or more times)
  v
STREAMING (continued LLM response)
  | message_complete received
  v
COMPLETE -> IDLE

Any state -> ERROR on "error" event or SSE connection drop
ERROR -> IDLE on user retry
```

## 5.5 Frontend SSE Consumption

The frontend uses a `ChatModelAdapter` to consume the FastAPI SSE stream, and `makeAssistantToolUI` to render viz and mermaid blocks as tool call UIs:

```typescript
// ChatModelAdapter — async generator consuming FastAPI SSE
import { ChatModelAdapter, useLocalRuntime } from "@assistant-ui/react";

const rendaraAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content: ContentPart[] = [];

    // Parse SSE events, accumulate content array
    // Each yield replaces the entire content state — assistant-ui diffs internally
    // viz_block and mermaid_block are modeled as tool calls
    // tool_call_start/result/error map to assistant-ui status: "running" | "complete" | "incomplete"
    yield { content };
  },
};

// Viz and Mermaid blocks rendered via makeAssistantToolUI
import { makeAssistantToolUI } from "@assistant-ui/react";

const VizChartToolUI = makeAssistantToolUI({
  toolName: "viz_block",
  render: ({ args, result, status }) => <VizChartBlock spec={result} status={status} />,
});

const MermaidToolUI = makeAssistantToolUI({
  toolName: "mermaid_block",
  render: ({ args, result, status }) => <MermaidBlock definition={result} status={status} />,
});
```

-----

-----

# 6. AI Agent Runtime Design

## 6.1 LLM Responsibility Boundaries

**The LLM is responsible for:**

- Selecting which MCP tool(s) to call and constructing their arguments
- Writing the narrative response in markdown
- Deciding when a viz block is appropriate and generating the JSON spec
- Deciding when a diagram is appropriate and generating the Mermaid definition
- Choosing the correct Mermaid diagram type
- Composing multi-part responses (text + viz blocks + diagrams)

**The LLM is not responsible for:**

- Executing queries (delegated to MCP tools)
- Persisting data (delegated to FastAPI)
- Rendering (delegated to the frontend)
- Routing SSE events (delegated to the backend stream processor)

## 6.2 Tool Calling Model

**Multi-round, unbounded with configurable hard stop.**

The LLM may request as many sequential tool calls as needed. The backend executes each, injects the result into the messages array, and makes another LLM call. This loop continues until the LLM produces a response with no tool calls.

A hard stop is enforced via `max_tool_rounds` in `config.json` (default: 10).

Tool calls are **sequential, not parallel**. The LLM requests one tool at a time.

## 6.3 Context Window Assembly

```python
def assemble_messages(system_prompt, history, user_message):
    messages = [{"role": "system", "content": system_prompt}]
    # Sliding window: last 10 messages only
    recent = history[-10:] if len(history) > 10 else history
    for msg in recent:
        messages.append({
            "role": msg["role"],
            "content": msg["text_content"]  # text only, no viz data
        })
    messages.append({"role": "user", "content": user_message})
    return messages
```

Viz data from stored messages is not re-injected into the LLM context. Only text content is included.

## 6.4 Configurable LLM Parameters

```json
{
  "llm": {
    "model": "anthropic/claude-sonnet-4-5",  // configurable via config.json
    "max_tokens": 4096,
    "temperature": 0.3,
    "max_tool_rounds": 10,
    "request_timeout_seconds": 120
  }
}
```

The system prompt is hardcoded in `backend/prompts/system_prompt.py`. It is not configurable via config.json.

## 6.5 Fallback for Malformed LLM Output (DR-07)

|Block Type     |Failure Condition                        |Fallback                                     |
|---------------|-----------------------------------------|---------------------------------------------|
|`viz_block`    |JSON parse error, missing required fields|Skip — emit no event for this block          |
|`mermaid_block`|Empty definition string                  |Skip                                         |
|`mermaid_block`|Invalid Mermaid syntax                   |Mermaid.js renders its built-in error diagram|
|`text_delta`   |Never fails                              |N/A                                          |

-----

-----

# 7. MCP Integration Design

## 7.1 MCP Connection Lifecycle

MCP connections are established at **FastAPI startup**, not per-request.

```
FastAPI starts
  |
  v
load_mcp_tools() called
  reads mcp_servers.json
  for each server:
    establish MCP connection (SSE or HTTP)
    call tools/list
    collect tool schemas
  v
Tool schemas aggregated into global tool_registry
  v
FastAPI ready to serve requests
```

If a connection drops between requests, the next tool call using that server receives an MCP error (handled per Section 7.4).

## 7.2 Tool Discovery and Registration

Tool schemas are injected into every OpenRouter request:

```python
tools_for_openrouter = [
    {
        "type": "function",
        "function": {
            "name": entry["schema"]["name"],
            "description": entry["schema"]["description"],
            "parameters": entry["schema"]["inputSchema"]
        }
    }
    for entry in tool_registry.values()
]
```

If two MCP servers expose a tool with the same name, the second overwrites the first (logged as a warning). Acceptable for MVP.

## 7.3 Tool Call Round-Trip Protocol

```
LLM emits tool_call signal
  |
  v
Backend:
  1. Extract tool_name and arguments
  2. Emit tool_call_start SSE event
  3. Look up tool_name in tool_registry
  4. Call MCP server: tools/call {name, arguments}
  5. Receive result
  6. Emit tool_call_result or tool_call_error
  7. Append to messages array:
     {role: "assistant", tool_calls: [{id, name, arguments}]}
     {role: "tool", tool_call_id: id, content: result_json_string}
  8. Make next OpenRouter request with updated messages array
  9. Continue streaming
```

## 7.4 MCP Error Taxonomy

|Error Type                   |LLM Context Injection                          |UI Event                         |
|-----------------------------|-----------------------------------------------|---------------------------------|
|Server unreachable at startup|Tool not in registry; LLM told in system prompt|None (startup; logged)           |
|Tool not found in registry   |Tool result: “Tool not available”              |`tool_call_error`                |
|Tool call timeout (>30s)     |Tool result: “Query timed out after 30 seconds”|`tool_call_error`                |
|MCP error response           |Tool result: error message from server         |`tool_call_error`                |
|Empty result (0 rows)        |Tool result: “Query returned no rows”          |`tool_call_result` (success=true)|

In all error cases the LLM receives the error as a tool result message and continues generating a graceful natural-language response.

## 7.5 Timeouts

|Timeout                     |Default|Config Key                   |
|----------------------------|-------|-----------------------------|
|Per MCP tool call           |30s    |`mcp.tool_timeout_seconds`   |
|Total tool round            |60s    |`mcp.round_timeout_seconds`  |
|OpenRouter streaming request|120s   |`llm.request_timeout_seconds`|

-----

# 8. Response Content Design

## 8.1 JSON Viz Specification Schema (DR-02)

Minimal Recharts-native schema. Five required fields, no translation layer.

|Field  |Type  |Description                                                |
|-------|------|-----------------------------------------------------------|
|`type` |string|One of: `bar`, `line`, `area`, `pie`, `scatter`, `composed`, `kpi`|
|`title`|string|Chart title displayed above the chart                      |
|`data` |array |Data rows — objects with consistent keys                   |
|`xKey` |string|Key in each data object for the X/category axis            |
|`yKey` |string|Key in each data object for the Y/value axis               |

`y2Key` is additionally required for `composed` type (the line series).

**Validation rules (backend, before emitting viz_block):**

1. `type` is one of the seven allowed values
1. `data` is a non-empty array
1. `xKey` exists as a key in `data[0]`
1. `yKey` exists as a key in `data[0]`
1. `title` is a non-empty string

Full schema reference with all chart type examples: Appendix A.

## 8.2 Content Block Type Taxonomy

|Block Type |Source                |Streaming Event               |Storage type field|
|-----------|----------------------|------------------------------|------------------|
|`text`     |LLM text tokens       |`text_delta` (assembled)      |`text`            |
|`viz_chart`|LLM viz JSON          |`viz_block`                   |`viz_chart`       |
|`mermaid`  |LLM Mermaid definition|`mermaid_block`               |`mermaid`         |
|`tool_call`|Backend tool execution|`tool_call_start/result/error`|`tool_call`       |

Full type definitions: Appendix D.

## 8.3 Mermaid Configuration

```javascript
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#00D4FF',
    primaryTextColor: '#E8EAED',
    primaryBorderColor: '#2A2D3E',
    lineColor: '#6B7280',
    sectionBkgColor: '#1A1D27',
    altSectionBkgColor: '#0F1117',
    gridColor: '#2A2D3E',
    secondaryColor: '#1A1D27',
    tertiaryColor: '#0F1117',
  },
  securityLevel: 'loose'
});
```

## 8.4 Fallback Rendering Rules

|Failure                       |Fallback                                                     |
|------------------------------|-------------------------------------------------------------|
|viz_block fails validation    |Block silently omitted; surrounding text renders             |
|mermaid_block empty definition|Block silently omitted                                       |
|mermaid_block invalid syntax  |Mermaid.js renders its own error diagram                     |
|tool_call_error               |Tool indicator shows red error state; LLM narrative continues|

-----

-----

# 9. Data Design

## 9.1 SQLite Schema (replaces BRD Supabase schema — DR-05)

```sql
CREATE TABLE conversations (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at   TEXT
);

CREATE TABLE messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content         TEXT NOT NULL,   -- JSON: full assistant-ui message snapshot
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE dashboards (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pins (
    id              TEXT PRIMARY KEY,
    dashboard_id    TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    message_id      TEXT NOT NULL REFERENCES messages(id),
    block_index     INTEGER NOT NULL,
    block_type      TEXT NOT NULL,      -- 'viz_chart' | 'mermaid' | 'text'
    block_content   TEXT NOT NULL,      -- JSON snapshot of the specific block
    note            TEXT,
    position        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pins_dashboard ON pins(dashboard_id, position);

CREATE TABLE reports (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,          -- JSON: array of report section blocks
    public_uuid  TEXT UNIQUE,            -- UUID v4; null = draft; set on publish
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 9.2 Message Content Schema (DR-11)

The `content` column stores the complete serialised assistant-ui message object as a JSON string. Maximum fidelity — the frontend reconstructs the full render on reload from this JSON alone.

**User message:**

```json
{
  "role": "user",
  "id": "msg_usr_001",
  "content": "What were total sales by region last quarter?",
  "createdAt": "2026-03-13T10:00:00Z"
}
```

**Assistant message:**

```json
{
  "role": "assistant",
  "id": "msg_ast_002",
  "createdAt": "2026-03-13T10:00:05Z",
  "content": [
    { "type": "text", "text": "Here's the regional revenue breakdown for Q4 2024:" },
    {
      "type": "tool_call",
      "tool_name": "execute_query",
      "server_name": "SQL Analytics (Demo)",
      "success": true,
      "duration_ms": 143
    },
    {
      "type": "viz_chart",
      "spec": {
        "type": "bar",
        "title": "Q4 2024 Revenue by Region",
        "data": [
          { "region": "AMER", "total_revenue": 1842350 },
          { "region": "EMEA", "total_revenue": 1421780 }
        ],
        "xKey": "region",
        "yKey": "total_revenue"
      }
    },
    { "type": "text", "text": "AMER leads with $1.84M, followed by EMEA at $1.42M." }
  ]
}
```

## 9.3 Report Content Schema

```json
[
  { "type": "heading", "level": 1, "text": "Q4 2024 Sales Performance Report" },
  { "type": "text", "markdown": "Regional performance improved across all territories..." },
  {
    "type": "viz_chart",
    "spec": {
      "type": "bar",
      "title": "Q4 2024 Revenue by Region",
      "data": [{ "region": "AMER", "total_revenue": 1842350 }],
      "xKey": "region",
      "yKey": "total_revenue"
    }
  },
  {
    "type": "mermaid",
    "definition": "pie title Revenue Split\n  AMER : 42\n  EMEA : 32\n  APAC : 19\n  LATAM : 7"
  }
]
```

Report content is a snapshot — viz data is embedded, not referenced. Reports render without access to the original conversation.

## 9.4 Data Lifecycle

All data persists indefinitely in MVP. No automated cleanup. Source data never enters `demo.db` — MCP query results are consumed by the LLM but not stored.

## 9.5 JSON Configuration Files

**config.json** (non-secret values only — committed to source control):

```json
{
  "llm": {
    "model": "anthropic/claude-sonnet-4-5",  // configurable via config.json
    "max_tokens": 4096,
    "temperature": 0.3,
    "max_tool_rounds": 10,
    "request_timeout_seconds": 120
  },
  "mcp": {
    "tool_timeout_seconds": 30,
    "round_timeout_seconds": 60
  },
  "database": {
    "path": "./demo.db"
  }
}
```

**mcp_servers.json** (endpoints only — no credentials in MVP):

```json
[
  {
    "name": "SQL Analytics (Demo)",
    "type": "sse",
    "endpoint": "http://localhost:8001/sse",
    "description": "Demo SQL analytics model — sales, customers, products, regions"
  }
]
```

-----

-----

# 10. API Design

## 10.1 Chat Endpoint

### `POST /api/chat/stream`

**Request:**

```json
{
  "conversation_id": "conv_abc123",
  "message": "What were total sales by region last quarter?",
  "new_conversation": false
}
```

If `new_conversation: true`, `conversation_id` is ignored and a new conversation is created. The new ID is returned in the `message_complete` event.

**Response:** `Content-Type: text/event-stream` — SSE events per Section 5.1.

**Error responses (non-stream):** `400` missing fields, `404` conversation not found, `503` OpenRouter unreachable.

## 10.2 Conversation Endpoints

|Method|Path                     |Description                          |
|------|-------------------------|-------------------------------------|
|GET   |`/api/conversations`     |All conversations, most recent first |
|GET   |`/api/conversations/{id}`|Single conversation with all messages|
|DELETE|`/api/conversations/{id}`|Soft delete (sets deleted_at)        |
|PATCH |`/api/conversations/{id}`|Update conversation title `{title}`  |

## 10.3 Dashboard Endpoints

|Method|Path                                          |Description                                |
|------|----------------------------------------------|-------------------------------------------|
|GET   |`/api/dashboards`                             |All dashboards with pin count              |
|GET   |`/api/dashboards/{id}`                        |Dashboard with all pins ordered by position|
|POST  |`/api/dashboards`                             |Create dashboard `{title, description}`    |
|POST  |`/api/dashboards/{id}/pins`                   |Pin an insight block to dashboard          |
|DELETE|`/api/dashboards/{dashboard_id}/pins/{pin_id}`|Remove pin                                 |
|PATCH |`/api/dashboards/{id}/pins/reorder`           |Update pin positions `{pin_ids: [...]}`    |

## 10.4 Report Endpoints

|Method|Path                       |Description                            |
|------|---------------------------|---------------------------------------|
|GET   |`/api/reports`             |All reports                            |
|GET   |`/api/reports/{id}`        |Single report with full content        |
|POST  |`/api/reports`             |Create report `{title, content}`       |
|PUT   |`/api/reports/{id}`        |Replace report content                 |
|POST  |`/api/reports/{id}/publish`|Set public_uuid; returns `{public_url}`|

## 10.5 Public Report Endpoint

### `GET /api/reports/public/{public_uuid}`

No authentication required. Returns `404` if UUID not found. UUID-only permanent access (DR-12).

## 10.6 CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ["FRONTEND_URL"]],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)
```

Local development: `FRONTEND_URL` defaults to `http://localhost:3000`.

-----

-----

# 11. Conversation and Context Design

## 11.1 Context Window Assembly Algorithm

On every call to `POST /api/chat/stream`:

1. Load conversation history from SQLite ordered by `created_at ASC`
1. For each message, extract text content only (strip viz data from assistant messages)
1. Apply sliding window: keep last 10 messages
1. Assemble messages array: `[system_prompt, ...last_10, current_user_message]`

## 11.2 Conversation Title Generation

Title is the first user message, truncated to 100 characters. No LLM call.

```python
def generate_title(first_message: str) -> str:
    return first_message[:100]
```

## 11.3 Message Persistence

Messages are persisted **after** the full streaming response completes (on `message_complete`). If the stream is interrupted before `message_complete`, no message is stored. Both the user message and the complete assistant message are written in a single transaction.

## 11.4 Regenerate Behaviour

1. Delete the previous assistant message (hard delete by `id`)
1. Make a new LLM call with conversation history minus the deleted message
1. Stream and store the new response

History is linear — no branching in MVP.

-----

-----

# 12. Non-Functional Design

## 12.1 Latency Budget

|Segment                       |Expected Latency                |
|------------------------------|--------------------------------|
|Frontend → Railway (network)  |50–150ms                        |
|FastAPI context assembly      |<50ms                           |
|FastAPI → OpenRouter (network)|50–200ms                        |
|OpenRouter → first text token |500ms–1500ms                    |
|**TTFT (no tool calls)**      |**650ms–2000ms** (target: <3s)  |
|Per MCP tool call             |500ms–2000ms                    |
|**TTFT (with tool calls)**    |**+1000ms–6000ms** (target: <8s)|

## 12.2 Resilience

|Failure Mode                     |Frontend Behaviour                                    |Recovery          |
|---------------------------------|------------------------------------------------------|------------------|
|OpenRouter unreachable           |`error` SSE event → error state                       |User retries      |
|MCP server unreachable at startup|System prompt notes unavailability; LLM explains      |Restart FastAPI   |
|MCP tool call timeout            |`tool_call_error` event → red indicator; LLM continues|Partial response  |
|SQLite write failure             |Message not saved; UI shows warning                   |User notes content|
|SSE connection drops             |Error state; no auto-reconnect                        |User retries      |

## 12.3 Structured Logging

FastAPI logs to stdout in JSON format. MCP query results are **never logged** (data privacy).

```json
{
  "timestamp": "2026-03-13T10:00:05.123Z",
  "level": "INFO",
  "event": "chat_stream_complete",
  "conversation_id": "conv_abc123",
  "tool_rounds": 1,
  "total_duration_ms": 3240,
  "prompt_tokens": 1240,
  "completion_tokens": 387
}
```

**Events logged:** `chat_stream_start`, `tool_call_start`, `tool_call_complete`, `tool_call_error`, `chat_stream_complete`, `mcp_connect_success`, `mcp_connect_failure`, `viz_block_invalid`.

## 12.4 Pre-Demo Verification Checklist (DR-10)

```
PRE-DEMO CHECKLIST
------------------
[ ] 1. Open app in fresh browser tab
       Expected: shell loads, no console errors

[ ] 2. Start new conversation: type "Hello"
       Expected: LLM responds within 5 seconds

[ ] 3. Ask data question: "What were total sales by region last quarter?"
       Expected: tool call indicator appears, bar chart renders in response

[ ] 4. Pin chart to a dashboard
       Expected: pin modal opens, saves, dashboard shows the chart

[ ] 5. Open report builder, add chart, publish, open public link
       Expected: public URL opens without login, chart visible
```

If step 3 fails: check FastAPI logs for MCP connection errors. Restart FastAPI if needed.

-----

-----

# 13. Security Design

## 13.1 Secrets Management (DR-09)

The OpenRouter API key is **never** in `config.json` or `mcp_servers.json`. These files contain placeholder values only and are committed to source control.

Real secrets are set as environment variables on the deployment platform. FastAPI reads them at startup:

```python
OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]  # fails fast if not set
```

`.env.example` is committed. `.env` is in `.gitignore`.

```bash
# .env.example
OPENROUTER_API_KEY=sk-or-...
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=./demo.db
MCP_SERVERS_PATH=./mcp_servers.json
```

## 13.2 Public Report Access (DR-12)

- UUID v4 generated by `uuid.uuid4()` (128-bit cryptographically random)
- Permanent access for anyone with the URL — no revocation, no expiry
- Appropriate for controlled demo audience
- Phase 2 migration: add `is_active BOOLEAN DEFAULT TRUE` + PATCH endpoint + UI button

## 13.3 Data Privacy

- MCP query results not persisted to `demo.db`
- MCP query results not included in structured logs
- AI-generated content (may quote business metrics) is persisted — accepted for MVP
- Error logs contain only error codes and messages, not result data

-----

-----

# 14. Deployment Design

## 14.1 Deployment Topology

```
+------------------------+     +----------------------------------------+
|  Vercel                |     |  Railway (or Render)                   |
|                        |     |                                        |
|  Next.js Frontend      +---->|  FastAPI Backend                       |
|                        |     |  (uvicorn, single instance)            |
|  Env vars:             |     |                                        |
|  NEXT_PUBLIC_API_URL   |     |  Env vars:                             |
|                        |     |  OPENROUTER_API_KEY                    |
|                        |     |  FRONTEND_URL                          |
+------------------------+     |                                        |
                               |  Persistent volume files:              |
                               |  demo.db (SQLite)                      |
                               |  config.json                           |
                               |  mcp_servers.json                      |
                               |                                        |
                               |  MCP SQL Server (port 8001)            |
                               |  (same container or separate service)  |
                               +----------------------------------------+
```

## 14.2 Environment Variables

### Frontend (Vercel)

|Variable             |Value                             |
|---------------------|----------------------------------|
|`NEXT_PUBLIC_API_URL`|`https://your-backend.railway.app`|

### Backend (Railway/Render)

|Variable            |Required                          |
|--------------------|----------------------------------|
|`OPENROUTER_API_KEY`|Yes                               |
|`FRONTEND_URL`      |Yes (CORS)                        |
|`DATABASE_PATH`     |No (default: `./demo.db`)         |
|`MCP_SERVERS_PATH`  |No (default: `./mcp_servers.json`)|

## 14.3 SQLite Persistence at Deployment

`demo.db` is created on first run if absent. Configure a persistent volume mount at `DATABASE_PATH` on Railway/Render. Without a persistent volume, `demo.db` is lost on service redeploy.

## 14.4 MCP SQL Server Deployment Options

**Option A — Same service, Procfile:**

```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
mcp: python mcp_sql_server/server.py
```

**Option B — Separate Railway service.** Update `endpoint` in `mcp_servers.json` to the Railway service URL.

Option A is simpler for the demo.

## 14.5 URL Structure

|Route             |Access                           |
|------------------|---------------------------------|
|`/`               |Private — New conversation home  |
|`/c/[id]`         |Private — Active conversation    |
|`/dashboards`     |Private — Dashboards index       |
|`/dashboards/[id]`|Private — Dashboard detail       |
|`/reports`        |Private — Reports index          |
|`/reports/[id]`   |Private — Report builder         |
|`/r/[uuid]`       |**Public** — Report consumer view|
|`/api/*`          |CORS-protected FastAPI           |

-----

# 15. Architecture Decision Register

All 12 open questions from the SDD Architecture Meta-Document are resolved here. These decisions are final and are not re-opened during MVP implementation.

-----

## DR-01 — SSE Streaming Event Schema

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                                                           |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What is the SSE event schema between FastAPI and the frontend?                                                                                                                                                                                                                                                                                                                                                  |
|**Decision**    |**B — Rich typed SSE events from FastAPI**                                                                                                                                                                                                                                                                                                                                                                      |
|**Rationale**   |FastAPI must remain in the stream path to perform MCP tool call orchestration using the Python SDK. The rich typed event schema (distinct event type per content block) enables the frontend to render each content type correctly without custom parsing logic. The alternative (Option C: assistant-ui direct to OpenRouter) would eliminate FastAPI from the stream path and break MCP tool calling entirely.|
|**Consequences**|FastAPI is responsible for detecting sentinel boundaries in the LLM stream and emitting typed events. The frontend does not parse the raw LLM output. Both sides are built against the event schema defined in Section 5.1.                                                                                                                                                                                     |

-----

## DR-02 — JSON Viz Specification Schema

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                                       |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What is the complete JSON viz specification schema?                                                                                                                                                                                                                                                                                                                                         |
|**Decision**    |**A — Minimal custom schema purpose-built for Recharts**                                                                                                                                                                                                                                                                                                                                    |
|**Rationale**   |The minimal schema (`type` + `data` + `xKey` + `yKey` + `title`) is natively consumed by Recharts without a translation layer. Vega-Lite (initially preferred) requires either a translation layer or a renderer swap — neither is acceptable for demo reliability. The minimal schema is also the most reliable schema for LLM output compliance, as fewer fields means fewer ways to fail.|
|**Consequences**|The LLM system prompt must include the minimal schema definition and examples. The frontend Recharts components are wired directly to the schema fields. No translation layer exists between the viz spec and the chart render.                                                                                                                                                             |

-----

## DR-03 — LLM System Prompt

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                                       |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What is the LLM system prompt?                                                                                                                                                                                                                                                                                                                                                              |
|**Decision**    |**C — Full structured system prompt**                                                                                                                                                                                                                                                                                                                                                       |
|**Rationale**   |The system prompt is the highest-leverage single engineering artefact in the entire build. A minimal prompt (Option A) produces inconsistent output format that breaks chart rendering and demo quality. A full structured prompt — including format rules, sentinel usage, viz schema examples, MCP server context, and error handling instructions — is required for reliable demo output.|
|**Consequences**|The system prompt is a significant engineering effort (estimated 2–4 hours to write and test). It is hardcoded in `backend/prompts/system_prompt.py`, not configurable via config.json. Full template in Appendix C.                                                                                                                                                                        |

-----

## DR-04 — Context Window Assembly

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                           |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |How is conversation history assembled for each LLM request?                                                                                                                                                                                                                                                                                                                     |
|**Decision**    |**B — Sliding window, last 10 messages**                                                                                                                                                                                                                                                                                                                                        |
|**Rationale**   |Simple to implement, zero token-counting dependency, and acceptable for demo-length conversations. A full history (Option A) risks context window overflow for longer conversations. Token-counting (Option C) adds a dependency on a tokeniser library. Summarisation (Option D) adds latency and complexity. The sliding window is the best risk/simplicity trade-off for MVP.|
|**Consequences**|Conversations longer than 10 exchanges lose early context. This is acceptable for demo scenarios. Viz data from stored messages is not re-injected into the LLM context — only text content.                                                                                                                                                                                    |

-----

## DR-05 — Persistence Model

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |How is application state persisted?                                                                                                                                                                                                                                                                                                                                                                                                         |
|**Decision**    |**C — Hybrid: JSON files for config/MCP definitions, SQLite for application state**                                                                                                                                                                                                                                                                                                                                                         |
|**Rationale**   |Supabase (the BRD’s original choice) introduces three failure points: provisioning, credentials, and network connectivity. For a single-user demo, these risks are not justified. SQLite has zero external dependencies, zero provisioning, zero credentials, and zero network risk. It is robust, fast, and sufficient for single-user MVP. The hybrid model (JSON for static config, SQLite for dynamic state) is the cleanest separation.|
|**Consequences**|Supabase is removed from the architecture entirely. The BRD’s Supabase table definitions are re-implemented as SQLite tables (Section 9.1). Phase 2 migration to Postgres/Supabase is straightforward: the schema is already relational. SQLite persistent volume must be configured on Railway/Render.                                                                                                                                     |

-----

## DR-06 — Tool Call Round-Trip Model

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                          |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |How many tool call rounds are permitted per conversation turn?                                                                                                                                                                                                                                                                                 |
|**Decision**    |**C + safety ceiling — Unbounded multi-round with configurable hard stop (`max_tool_rounds`)**                                                                                                                                                                                                                                                 |
|**Rationale**   |The LLM may legitimately need to call multiple tools in sequence to answer complex questions (e.g. get schema → generate query → execute query). A fixed single-round limit (Option A) would cripple the agentic behaviour. Unbounded is the correct intent, but a configurable hard stop (default: 10) prevents runaway loops during the demo.|
|**Consequences**|`max_tool_rounds` in `config.json` defaults to 10. If the limit is hit, the backend stops the loop and emits `message_complete` with whatever response exists. The LLM orchestration loop must track round count and enforce the ceiling.                                                                                                      |

-----

## DR-07 — Fallback for Malformed LLM Output

|Attribute       |Value                                                                                                                                                                                                                                                        |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What happens when the LLM produces malformed structured content?                                                                                                                                                                                             |
|**Decision**    |**C — Skip and continue**                                                                                                                                                                                                                                    |
|**Rationale**   |During a demo, a visible error block (Option B) or a broken JavaScript exception is worse than silently omitting a failed chart. Valid content before and after the failed block still renders. The LLM’s narrative text always renders — it is the fallback.|
|**Consequences**|The backend validates viz JSON before emitting the `viz_block` event. Invalid blocks are dropped silently. No error event is emitted for block-level failures. The frontend Mermaid renderer handles invalid syntax natively (shows a Mermaid error diagram).|

-----

## DR-08 — MCP Tool Call Error Handling

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                       |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |How are MCP tool call errors communicated to the user?                                                                                                                                                                                                                                                                                                      |
|**Decision**    |**B — Tool indicator error state**                                                                                                                                                                                                                                                                                                                          |
|**Rationale**   |Silent failure (Option A) is dishonest — the user sees a response that is missing data with no explanation. A toast notification (Option C) is intrusive for what is often a recoverable partial failure. The red tool indicator is visible enough to be honest without being alarming. The LLM’s graceful natural-language response explains what happened.|
|**Consequences**|The `tool_call_error` SSE event triggers an error state on the tool call indicator component. The indicator shows the tool name and a brief error label (e.g. “Query failed”). The LLM continues streaming a response that acknowledges the failure.                                                                                                        |

-----

## DR-09 — Secrets Management

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                                     |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |How are API keys and secrets managed?                                                                                                                                                                                                                                                                                                                                                     |
|**Decision**    |**C — `config.json` committed with placeholder values; real secrets in `.env` (gitignored) and deployment platform env vars**                                                                                                                                                                                                                                                             |
|**Rationale**   |`config.json` documents all required configuration fields (making onboarding simple) without containing real secrets. Real values live exclusively in environment variables — either `.env` for local development (gitignored) or platform env vars for deployment. FastAPI reads secrets from `os.environ` at startup, failing fast with a clear error if a required variable is missing.|
|**Consequences**|`.gitignore` must include `.env`. A `.env.example` file documents all required keys. `config.json` uses placeholder strings for any secret-adjacent fields. FastAPI startup code uses `os.environ["OPENROUTER_API_KEY"]` (not `os.environ.get(...)`) to enforce that secrets are always set.                                                                                              |

-----

## DR-10 — Demo Readiness / Health Check

|Attribute       |Value                                                                                                                                                                                                                                                                                       |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |Is there a health check endpoint and pre-demo verification procedure?                                                                                                                                                                                                                       |
|**Decision**    |**A — Manual spot-test only**                                                                                                                                                                                                                                                               |
|**Rationale**   |Building a formal `/health` endpoint (Option B) requires FastAPI to actively probe OpenRouter, MCP servers, and SQLite on demand — adding code that provides marginal value for a single-user demo. The 5-step pre-demo checklist (Section 12.4) achieves the same assurance with zero code.|
|**Consequences**|The pre-demo checklist is documented in Section 12.4 and in the project README. If a component fails during the checklist, the FastAPI structured logs provide diagnostic information. No `/health` endpoint exists.                                                                        |

-----

## DR-11 — Content Block Storage Schema

|Attribute       |Value                                                                                                                                                                                                                                                                                                                                                                 |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What is the internal structure of the `content` column in the `messages` table?                                                                                                                                                                                                                                                                                       |
|**Decision**    |**C — Full assistant-ui message snapshot serialised to JSON**                                                                                                                                                                                                                                                                                                         |
|**Rationale**   |Storing the complete assistant-ui message object provides maximum fidelity on reload — the frontend reconstructs the exact render from the stored JSON without re-parsing, re-rendering from text, or any post-processing. Tight coupling to the assistant-ui version is accepted for MVP; schema migration is a Phase 2 concern.                                     |
|**Consequences**|The `content` column stores a JSON string. For user messages this is a simple object. For assistant messages this is the full content block array. On conversation reload, the frontend deserialises the JSON and passes it directly to the assistant-ui renderer. If the assistant-ui message schema changes in a future version, stored messages may need migration.|

-----

## DR-12 — Public Link Security

|Attribute       |Value                                                                                                                                                                                                                                                                                   |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Question**    |What access controls apply to shared report links?                                                                                                                                                                                                                                      |
|**Decision**    |**A — UUID only, permanent: anyone with the link can view forever, no revocation**                                                                                                                                                                                                      |
|**Rationale**   |The demo audience is controlled and known. Revocation UI (Option B) requires an `is_active` column, a PATCH endpoint, and a UI button — all zero-risk functionality that adds build time with no demo value. UUID v4 entropy is sufficient security for the demo context.               |
|**Consequences**|Published reports are permanently accessible to anyone with the UUID. `public_uuid` is generated once on publish and never changes or expires. No revocation UI exists in MVP. Phase 2 can add `is_active` boolean + revoke button in a single migration + one endpoint + one UI button.|

-----

-----

# 16. Open Items and Deferred Decisions

No architectural decisions are open. All 12 decisions from the SDD Architecture Meta-Document are resolved (Section 15).

## 16.1 Deferred to Phase 2

The following items are explicitly out of scope for MVP and should not be implemented during the demo build week:

|#    |Item                                           |Phase 2 Migration Path                                                                |
|-----|-----------------------------------------------|--------------------------------------------------------------------------------------|
|P2-01|User authentication (login, sessions, JWT)     |Add NextAuth.js to frontend; add JWT middleware to FastAPI; enable Supabase RLS       |
|P2-02|Multi-tenancy (per-user data isolation)        |Migrate SQLite to Supabase/Postgres; add `user_id` FK to all tables                   |
|P2-03|Report link revocation                         |Add `is_active BOOLEAN DEFAULT TRUE` to reports; add PATCH endpoint; add revoke button|
|P2-04|Message branching (regenerate creates a branch)|Add `parent_message_id` FK to messages table                                          |
|P2-05|Conversation title LLM generation              |Add async LLM call after first exchange; update title column                          |
|P2-06|Context summarisation                          |Replace sliding window with LLM-generated summary for older messages                  |
|P2-07|config.json → database migration               |Move MCP server definitions to a `mcp_servers` table; add UI for management           |
|P2-08|Staging environment                            |Add Railway staging service; add Vercel preview environments                          |
|P2-09|CI/CD pipeline                                 |GitHub Actions: lint + test + deploy on merge to main                                 |
|P2-10|Horizontal scaling                             |Move SQLite to Postgres; add connection pooling; make FastAPI stateless               |

## 16.2 Pending External Input

|#     |Item                                                      |Blocked On                 |
|------|----------------------------------------------------------|---------------------------|
|EXT-01|Production MCP server credentials (Power BI, Databricks)  |Stakeholder / IT to provide|
|EXT-02|Demo data domain confirmation (sales analytics is assumed)|Stakeholder to confirm     |
|EXT-03|Vercel project name and Railway service name              |Deployment setup           |

-----

-----

# Appendix A — JSON Viz Schema Reference

Full schema definitions for all seven MVP chart types. These are the exact schemas the LLM must produce and the frontend must render.

## A.1 Bar Chart

```json
{
  "type": "bar",
  "title": "Q4 2024 Revenue by Region",
  "data": [
    { "region": "AMER", "total_revenue": 1842350 },
    { "region": "EMEA", "total_revenue": 1421780 },
    { "region": "APAC", "total_revenue": 987340 },
    { "region": "LATAM", "total_revenue": 412890 }
  ],
  "xKey": "region",
  "yKey": "total_revenue"
}
```

**Recharts mapping:** `BarChart` → `Bar dataKey={yKey}` → `XAxis dataKey={xKey}`

## A.2 Line Chart

```json
{
  "type": "line",
  "title": "Monthly Revenue Trend — 2024",
  "data": [
    { "month": "Jan", "revenue": 1240000 },
    { "month": "Feb", "revenue": 1380000 },
    { "month": "Mar", "revenue": 1290000 },
    { "month": "Apr", "revenue": 1520000 }
  ],
  "xKey": "month",
  "yKey": "revenue"
}
```

**Recharts mapping:** `LineChart` → `Line dataKey={yKey}` → `XAxis dataKey={xKey}`

## A.3 Area Chart

```json
{
  "type": "area",
  "title": "Cumulative Revenue by Quarter",
  "data": [
    { "quarter": "Q1", "cumulative_revenue": 3800000 },
    { "quarter": "Q2", "cumulative_revenue": 8100000 },
    { "quarter": "Q3", "cumulative_revenue": 13200000 },
    { "quarter": "Q4", "cumulative_revenue": 19100000 }
  ],
  "xKey": "quarter",
  "yKey": "cumulative_revenue"
}
```

**Recharts mapping:** `AreaChart` → `Area dataKey={yKey} fill="..." fillOpacity={0.3}`

## A.4 Pie Chart

```json
{
  "type": "pie",
  "title": "Revenue Mix by Customer Segment",
  "data": [
    { "segment": "Enterprise", "revenue": 9800000 },
    { "segment": "Mid-Market", "revenue": 6200000 },
    { "segment": "SMB", "revenue": 3100000 }
  ],
  "xKey": "segment",
  "yKey": "revenue"
}
```

**Recharts mapping:** `PieChart` → `Pie dataKey={yKey} nameKey={xKey}`

## A.5 Scatter Chart

```json
{
  "type": "scatter",
  "title": "Order Value vs Order Frequency by Customer",
  "data": [
    { "avg_order_value": 4200, "order_count": 42, "customer": "Acme Corp" },
    { "avg_order_value": 1800, "order_count": 87, "customer": "Beta Inc" },
    { "avg_order_value": 8900, "order_count": 12, "customer": "Gamma Ltd" }
  ],
  "xKey": "avg_order_value",
  "yKey": "order_count"
}
```

**Recharts mapping:** `ScatterChart` → `Scatter dataKey={yKey}` → `XAxis dataKey={xKey} type="number"`

## A.6 Composed Chart (Bar + Line Overlay)

For the composed type, an additional `y2Key` field specifies the secondary metric rendered as a line:

```json
{
  "type": "composed",
  "title": "Revenue vs Target by Region",
  "data": [
    { "region": "AMER", "revenue": 1842350, "target": 1750000 },
    { "region": "EMEA", "revenue": 1421780, "target": 1500000 },
    { "region": "APAC", "revenue": 987340,  "target": 1000000 }
  ],
  "xKey": "region",
  "yKey": "revenue",
  "y2Key": "target"
}
```

**Recharts mapping:** `ComposedChart` → `Bar dataKey={yKey}` + `Line dataKey={y2Key}`

## A.7 Validation Rules Summary

|Field  |Required           |Validation                                                         |
|-------|-------------------|-------------------------------------------------------------------|
|`type` |Yes                |Must be one of: `bar`, `line`, `area`, `pie`, `scatter`, `composed`, `kpi`|
|`title`|Yes                |Non-empty string                                                   |
|`data` |Yes                |Non-empty array of objects                                         |
|`xKey` |Yes                |Must exist as a key in `data[0]`                                   |
|`yKey` |Yes                |Must exist as a key in `data[0]`                                   |
|`y2Key`|Only for `composed`|Must exist as a key in `data[0]` if present                        |

-----

-----

# Appendix B — SSE Event Schema Reference

Complete JSON Schema definitions for all SSE events emitted by the FastAPI backend.

## B.1 All Event Types Summary

|Event Type        |When Emitted                              |Frequency                      |
|------------------|------------------------------------------|-------------------------------|
|`text_delta`      |Each text token from LLM                  |Many per response              |
|`tool_call_start` |When LLM requests a tool                  |Once per tool call             |
|`tool_call_result`|When tool call succeeds                   |Once per tool call             |
|`tool_call_error` |When tool call fails                      |Once per tool call (on failure)|
|`viz_block`       |When complete viz JSON assembled          |Once per chart in response     |
|`mermaid_block`   |When complete Mermaid definition assembled|Once per diagram in response   |
|`message_complete`|When full response is done                |Once per conversation turn     |
|`error`           |On fatal error                            |Once (terminates stream)       |

## B.2 Full Event Definitions

### `text_delta`

```json
{
  "type": "text_delta",
  "delta": "string — incremental text token"
}
```

### `tool_call_start`

```json
{
  "type": "tool_call_start",
  "tool_call_id": "string — unique ID for this tool call",
  "tool_name": "string — MCP tool name",
  "server_name": "string — display name of MCP server",
  "arguments": "object — tool arguments"
}
```

### `tool_call_result`

```json
{
  "type": "tool_call_result",
  "tool_call_id": "string",
  "tool_name": "string",
  "server_name": "string",
  "success": true,
  "duration_ms": "integer",
  "result_summary": "string — e.g. '4 rows returned'"
}
```

### `tool_call_error`

```json
{
  "type": "tool_call_error",
  "tool_call_id": "string",
  "tool_name": "string",
  "server_name": "string",
  "error_code": "string — one of: MCP_UNREACHABLE | MCP_TIMEOUT | MCP_TOOL_ERROR | TOOL_NOT_FOUND",
  "error_message": "string — human-readable description"
}
```

### `viz_block`

```json
{
  "type": "viz_block",
  "block_id": "string — unique ID within this message",
  "spec": "object — validated viz spec matching Appendix A schema"
}
```

### `mermaid_block`

```json
{
  "type": "mermaid_block",
  "block_id": "string — unique ID within this message",
  "definition": "string — Mermaid diagram definition"
}
```

### `message_complete`

```json
{
  "type": "message_complete",
  "conversation_id": "string — UUID",
  "message_id": "string — UUID of the stored assistant message",
  "usage": {
    "prompt_tokens": "integer",
    "completion_tokens": "integer"
  }
}
```

### `error`

```json
{
  "type": "error",
  "error_code": "string — one of: OPENROUTER_UNAVAILABLE | CONTEXT_ASSEMBLY_FAILED | STREAM_INTERRUPTED | INTERNAL_ERROR",
  "error_message": "string — human-readable description",
  "recoverable": "boolean — true if user can retry"
}
```

-----

-----

# Appendix C — LLM System Prompt Template

This is the full system prompt injected as the first message in every LLM request. It is stored in `backend/prompts/system_prompt.py`.

-----

```
You are a Business Data Analyst AI Agent. You help analysts explore business data, 
identify trends, and communicate findings through compelling narratives and visualisations.

You have access to MCP (Model Context Protocol) tools that connect you to live data sources.
Always query live data when answering data questions — never guess or fabricate numbers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE MCP SERVERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SQL Analytics (Demo)
  Tools: get_semantic_model_schema, generate_query, execute_query
  Data: Sales transactions, customers, products, regions (2022–present)
  
  Recommended workflow:
  1. Call get_semantic_model_schema(model_id="demo_sales") to understand available data
  2. Call generate_query(model_id="demo_sales", question="...") to get SQL
  3. Call execute_query(model_id="demo_sales", sql_query="...") to get results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write your response in markdown. Lead with insight, not with process 
(say "AMER led all regions at $1.84M" not "I ran a query and got results").

CHARTS: When you have data that benefits from visualisation, produce a chart 
using this exact format — the sentinels are required:

<<<VIZ_START>>>
{
  "type": "bar",
  "title": "Descriptive chart title",
  "data": [{"key": "value", "metric": 123}],
  "xKey": "key",
  "yKey": "metric"
}
<<<VIZ_END>>>

Allowed chart types: bar, line, area, pie, scatter, composed, kpi
- bar: rankings, categorical comparisons
- line: trends over time
- area: cumulative trends, volume
- pie: composition, part-to-whole (use sparingly, max 6 slices)
- scatter: correlation, distribution
- composed: use when you need bar + line overlay (e.g. revenue vs target)
  Add "y2Key": "target_field" for the line series.

The data array must contain plain JSON objects with string or number values only.
Do not nest objects. Do not use null values. Every object must have the same keys.

DIAGRAMS: For process flows, org charts, or relationship diagrams:

<<<MMD_START>>>
flowchart TD
  A[Start] --> B[Step]
  B --> C[End]
<<<MMD_END>>>

Use flowchart TD for vertical flows, flowchart LR for horizontal.
Use sequenceDiagram for interaction sequences.
Use pie for simple composition (alternative to chart when data is 3–5 items).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL USE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always use tools for data questions. Never fabricate numbers.

When to use get_semantic_model_schema:
- Before the first data question in a session, or when you are unsure what 
  data is available
- You do not need to call it on every question — cache it mentally

When to use generate_query:
- To convert a natural language question into validated SQL
- Pass schema_context with relevant tables to help the agent focus

When to use execute_query:
- After generate_query has produced SQL
- Use the sql_query from the generate_query result directly

If a tool call fails:
- Acknowledge it naturally: "I wasn't able to retrieve that data right now"
- Offer alternatives: "I can try a different approach" or "Here's what I can 
  tell you from the schema..."
- Never pretend the tool call succeeded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NARRATIVE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior data analyst presenting findings to business leaders.

Lead with the headline number or key insight.
Support with context: is this good? how does it compare to prior periods?
Suggest the next question or analysis when appropriate.
Be concise — one paragraph of narrative per chart is usually enough.
Use business language: revenue, growth, performance, target, variance.
Format numbers clearly: $1.84M not 1842350; 23% not 0.23.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT NOT TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

× Do not describe what tool you are calling ("I'll now call execute_query...")
× Do not show raw SQL in your response unless the user explicitly asks
× Do not show raw JSON viz specs in your response — use sentinels
× Do not use tables instead of charts for data that benefits from visualisation
× Do not produce more than 3 charts in a single response
× Do not apologise excessively when tools fail — acknowledge briefly and move on
```

-----

-----

# Appendix D — Content Block Type Reference

Type-discriminated content block definitions used in both SSE streaming events and SQLite storage.

## D.1 Markdown Block

Used for text content. In storage, all consecutive `text_delta` tokens are assembled into one or more markdown blocks.

```json
{
  "type": "text",
  "text": "string — markdown-formatted text content"
}
```

## D.2 Viz Chart Block

```json
{
  "type": "viz_chart",
  "spec": {
    "type": "bar | line | area | pie | scatter | composed | kpi",
    "title": "string",
    "data": "array of objects",
    "xKey": "string",
    "yKey": "string",
    "y2Key": "string — optional, composed charts only"
  }
}
```

## D.3 Mermaid Block

```json
{
  "type": "mermaid",
  "definition": "string — valid Mermaid diagram definition"
}
```

## D.4 Tool Call Block

Stored in message content to record that a tool call occurred. Not rendered visibly in the conversation replay — used for conversation fidelity only.

```json
{
  "type": "tool_call",
  "tool_call_id": "string",
  "tool_name": "string",
  "server_name": "string",
  "success": "boolean",
  "duration_ms": "integer",
  "error_code": "string — null if success",
  "error_message": "string — null if success"
}
```

## D.5 Complete Assistant Message Content Example

An assistant message content array in the order blocks appeared in the response:

```json
[
  {
    "type": "text",
    "text": "Here's the Q4 2024 regional revenue breakdown:"
  },
  {
    "type": "tool_call",
    "tool_call_id": "tc_01",
    "tool_name": "execute_query",
    "server_name": "SQL Analytics (Demo)",
    "success": true,
    "duration_ms": 143,
    "error_code": null,
    "error_message": null
  },
  {
    "type": "viz_chart",
    "spec": {
      "type": "bar",
      "title": "Q4 2024 Revenue by Region",
      "data": [
        { "region": "AMER", "total_revenue": 1842350 },
        { "region": "EMEA", "total_revenue": 1421780 },
        { "region": "APAC", "total_revenue": 987340 },
        { "region": "LATAM", "total_revenue": 412890 }
      ],
      "xKey": "region",
      "yKey": "total_revenue"
    }
  },
  {
    "type": "text",
    "text": "AMER leads at **$1.84M**, outperforming the EMEA region by 29%. LATAM remains the smallest contributor at $412K — worth investigating whether this reflects market size, coverage gaps, or seasonal patterns."
  }
]
```

-----

-----

# Appendix E — MCP Test Data Server

## LangGraph SQL Agent Behind a Power-BI-Pattern MCP Interface

*This appendix is preserved verbatim from the SDD Architecture Meta-Document. It defines the MCP SQL Analytics Demo Server that serves as the primary data source for the MVP demo.*

-----

### E.0 Research Basis

This appendix draws directly from:

- The **LangGraph SQL agent reference implementation** (`docs.langchain.com/oss/python/langgraph/sql-agent`). The implementation uses `langchain_community.utilities.SQLDatabase`, `langchain_community.agent_toolkits.SQLDatabaseToolkit`, and a `StateGraph` with nodes: `list_tables` → `call_get_schema` → `get_schema` → `generate_query` → `check_query` → `run_query`.
- The **Power BI remote MCP server** (`learn.microsoft.com/en-us/power-bi/developer/mcp/remote-mcp-server-tools`). Exposes exactly three tools: Get Semantic Model Schema, Generate Query, Execute Query.
- The **MCP specification** (version 2025-11-25) at `modelcontextprotocol.io`. The **FastMCP** framework (official `mcp` Python SDK) is the implementation pattern used.

-----

### E.1 Executive Summary

This appendix proposes a **prototype MCP server** that:

1. Mirrors the **exact three-tool interaction pattern** of the Power BI remote MCP server
1. Replaces Power BI’s DAX/semantic model backend with a **LangGraph SQL agent** against a SQLite database with representative demo data
1. Is implemented using the **official MCP Python SDK (FastMCP)**
1. Serves as the **primary integration test vehicle** for the full MCP call path
1. Can be populated with any business domain data (sales, finance, HR)

-----

### E.2 Tool Definitions

The server exposes exactly three tools, mirroring the Power BI remote MCP pattern:

#### `get_semantic_model_schema`

Returns business-friendly metadata for a named data model: tables, columns, data types, sample values, relationships, pre-defined metrics, and AI query instructions.

**Input:** `model_id: string`  
**Output:** `SemanticSchema` object (see E.5.1 for full example)

#### `generate_query`

Generates a validated SQL query from a natural language question using the LangGraph SQL agent. Does not execute the query.

**Inputs:** `model_id`, `question`, `schema_context` (optional), `row_limit` (optional, default 100)  
**Output:** `GeneratedQuery` — `sql_query`, `explanation`, `tables_used`, `estimated_complexity`, `agent_steps`

#### `execute_query`

Executes a SQL SELECT query and returns structured results. Does not use the LangGraph agent — execution is deterministic.

**Inputs:** `model_id`, `sql_query`, `row_limit` (optional, default 1000), `timeout_seconds` (optional, default 30)  
**Output:** `QueryResult` — `columns`, `rows`, `row_count`, `truncated`, `execution_ms`, `sql_executed`

-----

### E.3 LangGraph Agent Design

The agent follows the canonical LangGraph SQL agent reference:

```
START
  → list_tables         (returns available table names)
  → call_get_schema     (LLM selects relevant tables)
  → get_schema          (returns DDL + sample rows)
  → generate_query      (LLM generates SQL)
  → check_query         (validates SQL for common mistakes)
  → [END — run_query node excluded for generate_query tool]
```

Two compiled graph instances:

- `agent_generate_only` — excludes `run_query` node; used by `generate_query` tool
- `agent_full` — includes `run_query`; reserved for internal testing

The `execute_query` tool uses `SQLDatabase.run()` directly, bypassing the agent entirely.

-----

### E.4 Safety Controls

|Control                |Implementation                                                |
|-----------------------|--------------------------------------------------------------|
|Read-only DB connection|`SQLDatabase.from_uri("file:demo_data.db?mode=ro&uri=true")`  |
|Table allowlist        |`SQLDatabaseToolkit(include_tables=allowed_tables)`           |
|SELECT-only validation |`sqlparse` + DML keyword regex before execution               |
|Row limits             |Append `LIMIT {effective_limit}` if not present; hard cap 5000|
|Query timeout          |`asyncio.wait_for(..., timeout=effective_timeout)`            |

-----

### E.5 Example MCP Payloads

#### `get_semantic_model_schema` Response (abbreviated)

```json
{
  "model_id": "demo_sales",
  "model_name": "Sales Analytics Model",
  "entities": [
    {
      "table_name": "sales",
      "display_name": "Sales Transactions",
      "columns": [
        {"column_name": "order_id", "data_type": "INTEGER", "is_primary_key": true},
        {"column_name": "amount", "data_type": "NUMERIC", "description": "Revenue in USD"},
        {"column_name": "order_date", "data_type": "DATE"}
      ]
    },
    {
      "table_name": "customers",
      "columns": [
        {"column_name": "customer_id", "data_type": "INTEGER"},
        {"column_name": "region", "data_type": "TEXT", "sample_values": ["EMEA", "APAC", "AMER"]}
      ]
    }
  ],
  "relationships": [
    {"from_table": "sales", "from_column": "customer_id", "to_table": "customers", "to_column": "customer_id"}
  ],
  "metrics": [
    {"metric_name": "Total Revenue", "sql_expression": "SUM(sales.amount)"},
    {"metric_name": "Average Order Value", "sql_expression": "AVG(sales.amount)"}
  ],
  "ai_instructions": "Always join sales to customers using customer_id. Revenue figures are in USD."
}
```

#### `generate_query` Response

```json
{
  "sql_query": "SELECT c.region, SUM(s.amount) AS total_revenue FROM sales s JOIN customers c ON s.customer_id = c.customer_id WHERE s.order_date >= '2024-10-01' AND s.order_date < '2025-01-01' GROUP BY c.region ORDER BY total_revenue DESC LIMIT 10;",
  "explanation": "Aggregates sale amounts by region for Q4 2024, ordered by revenue descending.",
  "tables_used": ["sales", "customers"],
  "estimated_complexity": "simple",
  "agent_steps": 5
}
```

#### `execute_query` Response

```json
{
  "columns": ["region", "total_revenue"],
  "rows": [["AMER", 1842350.00], ["EMEA", 1421780.50], ["APAC", 987340.25], ["LATAM", 412890.75]],
  "row_count": 4,
  "truncated": false,
  "execution_ms": 43,
  "model_id": "demo_sales",
  "sql_executed": "SELECT c.region, SUM(s.amount) AS total_revenue ..."
}
```

-----

### E.6 `server.py` — FastMCP Implementation

```python
import asyncio
from mcp.server.fastmcp import FastMCP
from agent import agent_generate_only, db
from safety import validate_sql_safety, enforce_row_limit, execute_with_timeout
from semantic_meta import load_semantic_schema, merge_with_live_schema

mcp = FastMCP(
    "SQL Analytics MCP",
    description="Power BI-pattern MCP server backed by a LangGraph SQL agent",
)

@mcp.tool()
async def get_semantic_model_schema(model_id: str) -> dict:
    """
    Retrieve the semantic schema for a SQL analytics model.
    Returns business-friendly metadata including entities, relationships,
    metrics and query hints. Mirror of Power BI Get Semantic Model Schema.
    """
    static_meta = load_semantic_schema(model_id)
    return merge_with_live_schema(static_meta, db)


@mcp.tool()
async def generate_query(
    model_id: str,
    question: str,
    schema_context: dict = None,
    row_limit: int = 100
) -> dict:
    """
    Generate a SQL query from a natural language question using the LangGraph
    SQL agent. Returns the SQL query and an explanation without executing it.
    Mirror of Power BI Generate Query tool.
    """
    prompt = (
        f"Generate a validated SQL query (do not execute it) to answer: {question}. "
        f"Limit results to at most {row_limit} rows."
    )
    result = await agent_generate_only.ainvoke(
        {"messages": [{"role": "user", "content": prompt}]}
    )
    return _extract_query_result(result["messages"])


@mcp.tool()
async def execute_query(
    model_id: str,
    sql_query: str,
    row_limit: int = 1000,
    timeout_seconds: int = 30
) -> dict:
    """
    Execute a SQL SELECT query and return structured results.
    Enforces read-only access, table allowlist, row limits and query timeout.
    Mirror of Power BI Execute Query tool.
    """
    validate_sql_safety(sql_query)
    safe_sql = enforce_row_limit(sql_query, row_limit)
    import time
    start = time.time()
    raw_result = await execute_with_timeout(safe_sql, timeout_seconds)
    execution_ms = int((time.time() - start) * 1000)
    columns, rows = _parse_sql_result(raw_result)
    return {
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
        "truncated": len(rows) >= row_limit,
        "execution_ms": execution_ms,
        "model_id": model_id,
        "sql_executed": safe_sql
    }


if __name__ == "__main__":
    mcp.run(transport="sse", port=8001)
```

-----

### E.7 Demo Database Schema

```sql
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    region      TEXT NOT NULL,  -- 'AMER', 'EMEA', 'APAC', 'LATAM'
    segment     TEXT            -- 'Enterprise', 'Mid-Market', 'SMB'
);

CREATE TABLE products (
    product_id   INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    category     TEXT,
    unit_price   NUMERIC(10,2)
);

CREATE TABLE sales (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    product_id  INTEGER REFERENCES products(product_id),
    amount      NUMERIC(10,2) NOT NULL,
    quantity    INTEGER NOT NULL,
    order_date  DATE NOT NULL,
    rep_name    TEXT
);

CREATE TABLE monthly_targets (
    region      TEXT,
    month       TEXT,   -- 'YYYY-MM'
    target      NUMERIC(12,2),
    PRIMARY KEY (region, month)
);
```

-----

### E.8 File Structure

```
mcp_sql_server/
├── server.py              # FastMCP server — exposes 3 tools
├── agent.py               # LangGraph SQL agent setup
├── semantic_meta.json     # Business metadata for demo model(s)
├── safety.py              # SQL validation, row limit, timeout helpers
├── demo_data.db           # SQLite demo database (gitignored if contains real data)
├── seed_demo_data.py      # Script to create and populate demo_data.db
├── generate_skeleton.py   # Utility: auto-generate semantic_meta.json from schema
├── requirements.txt       # langchain, langgraph, langchain-community, mcp
└── README.md              # Setup and connection instructions
```

-----

### E.9 Demo Suggested Prompts

Pre-validated questions for the Home screen prompt chips (BRD HOME-05):

1. “What were total sales by region last quarter, ranked highest to lowest?”
1. “Which products are our top 5 revenue generators this year?”
1. “How does this month’s revenue compare to the same month last year?”
1. “Show me the breakdown of sales by customer segment and region”

-----

### E.10 Deployment

```bash
# Start MCP server
cd mcp_sql_server
pip install -r requirements.txt
python server.py
# Runs at http://localhost:8001/sse
```

For production-like deployment:

```bash
uvicorn server:mcp.streamable_http_app() --host 0.0.0.0 --port 8001
```

Add to `mcp_servers.json`:

```json
[
  {
    "name": "SQL Analytics (Demo)",
    "type": "sse",
    "endpoint": "http://localhost:8001/sse",
    "description": "Demo SQL analytics model — sales, customers, products, regions"
  }
]
```

-----

### E.11 Limitations vs. Real Power BI Semantic Models

|Capability             |Power BI Remote MCP         |This Prototype                                  |
|-----------------------|----------------------------|------------------------------------------------|
|Query language         |DAX                         |SQL                                             |
|Semantic layer depth   |Full semantic model         |Static JSON metadata                            |
|Query generation engine|Microsoft Copilot DAX engine|LangGraph SQL agent (LLM-driven)                |
|Row-level security     |Microsoft Entra ID          |Read-only DB user + table allowlist             |
|Time intelligence      |DAX CALCULATE, DATEADD      |SQL DATE functions                              |
|Authentication         |Microsoft Entra ID          |None (MVP)                                      |
|Multi-model            |Native                      |Supported via `model_id` in `semantic_meta.json`|

-----

*Document prepared by: Senior AI Solution Architect*  
*All 12 SDD open questions resolved: March 2026*  
*This document is the engineering authority for MVP implementation.*  
*Supersedes: SDD Architecture Meta-Document (pre-engineering scope document)*