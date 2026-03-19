# Rendara Architecture — Backend Compatibility Reference

Detailed answers to 8 architecture questions for building a compatible backend.

---

## Q1 — Dashboard Data Model

**Database table** (`backend/database.py`):

```sql
CREATE TABLE IF NOT EXISTS dashboards (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT 'Untitled Dashboard',
    layout_json     TEXT NOT NULL DEFAULT '[]',
    conversation_id TEXT DEFAULT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Tile structure** — free-form canvas with **x/y/w/h percentage coordinates** (0-100), NOT a grid:

```typescript
interface TileSpec {
  id: string;
  type: "viz_chart" | "mermaid" | "text";
  content: ContentBlock[];   // array of content blocks (see below)
  x: number;                 // left position as % (0-100)
  y: number;                 // top position as % (0-100)
  w: number;                 // width as % (0-100)
  h: number;                 // height as % (0-100)
  title?: string;
}
```

Canvas renders with `aspect-ratio: 16/9` and absolute positioning.

**Content block types** inside a tile:

```typescript
type ContentBlock =
  | { type: "text"; text: string }                           // markdown
  | { type: "viz_chart"; spec: VizSpec }                     // chart with data
  | { type: "mermaid"; definition: string }                  // diagram
```

---

## Q2 — Dashboard Generation Flow

The LLM calls a built-in tool `create_dashboard`. It produces a **single JSON object** with the complete structure — not streamed tile-by-tile.

**Tool input schema** (what the LLM sends):

```json
{
  "title": "Sales Dashboard",
  "tiles": [
    {
      "id": "tile-1",
      "type": "viz_chart",
      "content": [
        {
          "type": "viz_chart",
          "spec": {
            "type": "bar",
            "title": "Monthly Revenue",
            "data": [{"month": "Jan", "revenue": 50000}],
            "xKey": "month",
            "yKey": "revenue"
          }
        }
      ],
      "x": 5, "y": 5, "w": 45, "h": 45
    },
    {
      "id": "tile-2",
      "type": "text",
      "content": [
        { "type": "text", "text": "## Key Insight\n\nRevenue grew 15% YoY." }
      ],
      "x": 55, "y": 5, "w": 40, "h": 45
    }
  ]
}
```

**Backend execution** (`mcp_client.py`):
1. Generates a UUID for the dashboard
2. Stores `tiles` as JSON string in `layout_json`
3. Returns `{ dashboard_id, title }` as the tool result

**SSE events emitted to frontend**:
1. `dashboard_creating` — `{ "type": "dashboard_creating", "message": "Creating dashboard..." }`
2. `dashboard_complete` — `{ "type": "dashboard_complete", "dashboard_id": "uuid", "title": "Sales Dashboard" }`

The frontend renders a preview card with an "Open Dashboard" link.

---

## Q3 — Story Data Model

**Database table** (`backend/database.py`):

```sql
CREATE TABLE IF NOT EXISTS stories (
    id                      TEXT PRIMARY KEY,
    title                   TEXT NOT NULL DEFAULT 'Untitled Story',
    slides_json             TEXT NOT NULL DEFAULT '[]',
    auto_advance_interval   INTEGER DEFAULT NULL,
    conversation_id         TEXT DEFAULT NULL,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Slide structure**:

```typescript
interface StorySlideData {
  id?: string;
  title: string;              // slide heading
  content: string;            // markdown body
  visualizations?: Array<     // optional charts/diagrams below content
    | { type: "viz_chart"; spec: VizSpec }
    | { type: "mermaid"; definition: string }
  >;
  notes?: string;             // speaker notes (shown outside presentation mode)
}
```

Slides are stored as a JSON array in `slides_json`.

---

## Q4 — Story Generation Flow

The LLM calls a built-in tool `create_story`. Like dashboards, it produces a **single JSON** with all slides.

**Tool input schema**:

```json
{
  "title": "Q1 Performance Review",
  "slides": [
    {
      "id": "slide-1",
      "title": "Executive Summary",
      "content": "Q1 revenue grew 15% YoY, driven by new customer acquisition.",
      "visualizations": [
        {
          "type": "viz_chart",
          "spec": {
            "type": "bar",
            "title": "Q1 Revenue vs Prior Year",
            "data": [{"quarter": "Q1 2024", "revenue": 1200000}],
            "xKey": "quarter",
            "yKey": "revenue"
          }
        }
      ],
      "notes": "Key discussion point for board meeting"
    }
  ],
  "auto_advance_interval": 5000
}
```

**SSE events**:
1. `story_creating` — `{ "type": "story_creating", "message": "Creating story..." }`
2. `story_complete` — `{ "type": "story_complete", "story_id": "uuid", "title": "Q1 Review" }`

---

## Q5 — Chart Data Contract

**VizSpec union type** (`types/viz.ts`):

7 chart types: `bar`, `line`, `area`, `pie`, `scatter`, `composed`, `kpi`

**Base spec** (shared by bar, line, area, pie, scatter):

```typescript
interface BaseVizSpec {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  config?: ChartConfig;
}
```

**ChartConfig** (optional, for advanced charts):

```typescript
interface ChartConfig {
  series?: SeriesDef[];                    // multi-series support
  orientation?: 'vertical' | 'horizontal';
  sort?: 'asc' | 'desc' | 'none';
  topN?: number;
  showOther?: boolean;
  highlights?: string[];                   // highlighted category values
  referenceLines?: ReferenceLine[];
  legendPosition?: 'top' | 'bottom' | 'right' | 'none';
  stacked?: boolean;
  formatY?: 'number' | 'currency' | 'percentage';
}

interface SeriesDef {
  key: string;
  label?: string;
  chartType?: 'bar' | 'line' | 'area';    // for composed charts
  yAxisId?: 'left' | 'right';
  stackId?: string;
  format?: 'number' | 'currency' | 'percentage';
  emphasis?: 'normal' | 'highlight' | 'muted';
  color?: string;
}

interface ReferenceLine {
  y: number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}
```

**Example — Bar chart**:

```json
{
  "type": "bar",
  "title": "Revenue by Plan",
  "data": [
    {"plan": "Starter", "revenue": 42500},
    {"plan": "Premium", "revenue": 61200}
  ],
  "xKey": "plan",
  "yKey": "revenue",
  "config": {
    "sort": "desc",
    "formatY": "currency",
    "highlights": ["Premium"]
  }
}
```

**Example — KPI scorecard**:

```json
{
  "type": "kpi",
  "title": "Key Metrics",
  "data": [
    {"label": "ARPU", "value": 42.80, "format": "currency", "trend": "+3.2%", "trendDirection": "up"},
    {"label": "Churn Rate", "value": 3.5, "format": "percentage", "trend": "-0.2%", "trendDirection": "down"},
    {"label": "Active Customers", "value": 125000, "format": "number", "trend": "+8.1%", "trendDirection": "up"}
  ]
}
```

**How charts arrive via SSE**: The LLM wraps charts in `<<<VIZ_START>>>` / `<<<VIZ_END>>>` sentinels in its text output. The backend's sentinel parser extracts them and emits a `viz_block` SSE event:

```json
{"type": "viz_block", "block_id": "viz_01", "spec": { ...VizSpec... }}
```

---

## Q6 — Dashboard Tile Data

**Tiles store full data snapshots**, NOT query references.

The `layout_json` column contains the complete tile array with all content — including chart data arrays, markdown text, and mermaid definitions. When a dashboard is opened, no queries are re-executed. The data is static from the moment of creation.

To refresh data, the user opens the agent chat panel on the dashboard detail page and asks the AI to update it (which calls `update_dashboard` with new tile data).

---

## Q7 — Pinned Responses

**Database table** (`backend/database.py`):

```sql
CREATE TABLE IF NOT EXISTS pinned_responses (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT,
    message_id      TEXT,
    title           TEXT NOT NULL DEFAULT 'Untitled',
    description     TEXT NOT NULL DEFAULT '',
    content_json    TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**What gets saved**: The **full response content** including chart data — stored as `content_json` (an array of content blocks). Plus a reference back to the source conversation and message via `conversation_id` and `message_id`.

**Content blocks** in `content_json` follow the same format as assistant message content:

```json
[
  {"type": "text", "text": "Here is the analysis..."},
  {"type": "viz_chart", "spec": {"type": "bar", "title": "...", "data": [...], "xKey": "...", "yKey": "..."}},
  {"type": "tool_call", "tool_call_id": "tc_123", "tool_name": "generate_query", "success": true, "duration_ms": 245}
]
```

**API response format** (camelCase):

```json
{
  "id": "pin_uuid",
  "conversationId": "conv_uuid",
  "messageId": "msg_uuid",
  "title": "Revenue Analysis",
  "description": "Monthly revenue breakdown by plan",
  "contentJson": [ ...content blocks... ],
  "createdAt": "2025-12-15T10:30:00",
  "updatedAt": "2025-12-15T10:30:00"
}
```

---

## Q8 — SSE Event Format

All events are sent as `data: <JSON>\n\n` lines on the `POST /api/chat/stream` endpoint (media type `text/event-stream`).

### Complete Event Catalog (15 types)

**Streaming content:**

| Event | Payload | Description |
|-------|---------|-------------|
| `text_delta` | `{ "type": "text_delta", "delta": "text fragment" }` | Incremental text token |
| `viz_block` | `{ "type": "viz_block", "block_id": "viz_01", "spec": VizSpec }` | Complete chart extracted from sentinels |
| `mermaid_block` | `{ "type": "mermaid_block", "block_id": "mmd_01", "definition": "graph LR..." }` | Complete diagram definition |

**Tool call lifecycle:**

| Event | Payload | Description |
|-------|---------|-------------|
| `tool_call_start` | `{ "type": "tool_call_start", "tool_call_id": "tc_123", "tool_name": "generate_query", "server_name": "mcp_server", "arguments": {...} }` | Tool execution begins |
| `tool_call_result` | `{ "type": "tool_call_result", "tool_call_id": "tc_123", "tool_name": "generate_query", "server_name": "mcp_server", "success": true, "duration_ms": 245, "result_summary": "123 rows", "tool_result": {...} }` | Tool succeeded |
| `tool_call_error` | `{ "type": "tool_call_error", "tool_call_id": "tc_123", "tool_name": "generate_query", "server_name": "mcp_server", "error_code": "MCP_TIMEOUT", "error_message": "..." }` | Tool failed |

**Dashboard/Story creation:**

| Event | Payload | Description |
|-------|---------|-------------|
| `dashboard_creating` | `{ "type": "dashboard_creating", "message": "Creating dashboard..." }` | Progress indicator |
| `dashboard_complete` | `{ "type": "dashboard_complete", "dashboard_id": "uuid", "title": "..." }` | Dashboard saved |
| `story_creating` | `{ "type": "story_creating", "message": "Creating story..." }` | Progress indicator |
| `story_complete` | `{ "type": "story_complete", "story_id": "uuid", "title": "..." }` | Story saved |
| `resource_updated` | `{ "type": "resource_updated", "resource_type": "dashboard", "resource_id": "uuid" }` | Existing resource modified |

**Metadata and completion:**

| Event | Payload | Description |
|-------|---------|-------------|
| `pinned_metadata` | `{ "type": "pinned_metadata", "title": "...", "description": "...", "message_id": "..." }` | Pin suggestion metadata |
| `message_complete` | `{ "type": "message_complete", "conversation_id": "uuid", "message_id": "uuid", "usage": {"prompt_tokens": 1234, "completion_tokens": 567} }` | Stream finished |
| `error` | `{ "type": "error", "error_code": "OPENROUTER_UNAVAILABLE", "error_message": "...", "recoverable": true }` | Fatal stream error |

**Internal (never sent to client):**

| Event | Payload | Description |
|-------|---------|-------------|
| `_persist` | `{ "type": "_persist", "message_id": "...", "user_message": "...", "content_blocks": [...] }` | Intercepted by chat router for DB persistence |

### Typical SSE Stream Example

User asks "Show revenue by plan":

```
data: {"type":"text_delta","delta":"I'll "}\n\n
data: {"type":"text_delta","delta":"query the data "}\n\n
data: {"type":"text_delta","delta":"for you."}\n\n
data: {"type":"tool_call_start","tool_call_id":"tc_1","tool_name":"generate_query","server_name":"Telco-Prepaid-Demo","arguments":{"model_id":"telco_prepaid_demo","question":"revenue by plan"}}\n\n
data: {"type":"tool_call_result","tool_call_id":"tc_1","tool_name":"generate_query","server_name":"Telco-Prepaid-Demo","success":true,"duration_ms":1200,"result_summary":"SQL generated"}\n\n
data: {"type":"tool_call_start","tool_call_id":"tc_2","tool_name":"execute_query","server_name":"Telco-Prepaid-Demo","arguments":{"model_id":"telco_prepaid_demo","sql_query":"SELECT ..."}}\n\n
data: {"type":"tool_call_result","tool_call_id":"tc_2","tool_name":"execute_query","server_name":"Telco-Prepaid-Demo","success":true,"duration_ms":45,"result_summary":"5 rows returned"}\n\n
data: {"type":"text_delta","delta":"Here is the revenue "}\n\n
data: {"type":"text_delta","delta":"breakdown by plan:"}\n\n
data: {"type":"viz_block","block_id":"viz_01","spec":{"type":"bar","title":"Revenue by Plan","data":[{"plan":"Starter","revenue":42500}],"xKey":"plan","yKey":"revenue"}}\n\n
data: {"type":"text_delta","delta":"\n\nPremium plans generate "}\n\n
data: {"type":"text_delta","delta":"45% of total revenue."}\n\n
data: {"type":"message_complete","conversation_id":"conv_uuid","message_id":"msg_uuid","usage":{"prompt_tokens":3200,"completion_tokens":450}}\n\n
```

---

## API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/stream` | SSE streaming chat (body: `{conversation_id, message, new_conversation?, resource_id?}`) |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/:id` | Get conversation with messages |
| `DELETE` | `/api/conversations/:id` | Soft-delete conversation |
| `GET` | `/api/dashboards` | List dashboards |
| `GET` | `/api/dashboards/:id` | Get dashboard with tiles |
| `POST` | `/api/dashboards` | Create dashboard |
| `PATCH` | `/api/dashboards/:id` | Update dashboard |
| `DELETE` | `/api/dashboards/:id` | Delete dashboard |
| `GET` | `/api/stories` | List stories |
| `GET` | `/api/stories/:id` | Get story with slides |
| `POST` | `/api/stories` | Create story |
| `PATCH` | `/api/stories/:id` | Update story |
| `DELETE` | `/api/stories/:id` | Delete story |
| `GET` | `/api/pinned` | List pinned responses |
| `POST` | `/api/pinned` | Create pinned response |
| `DELETE` | `/api/pinned/:id` | Delete pinned response |

All API responses use **camelCase** field names (e.g. `conversationId`, `layoutJson`, `slidesJson`, `contentJson`).
