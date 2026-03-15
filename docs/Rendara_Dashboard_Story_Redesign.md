# Rendara — Dashboard & Story Rich Content Design
## Addendum to SDD · Version 1.0

---

## 1. Design Principles

1. **One rendering pipeline.** Dashboards, stories, and chat all use identical content blocks. No parallel formats, no reinvented wheels.
2. **Agent-first authoring.** The LLM creates and edits all content. No drag-and-drop, no manual tile editor.
3. **Isolated edit conversations.** Each dashboard and story has its own persistent conversation for agent-driven edits.
4. **Minimal new surface area.** Reuse `VizChartBlock`, `MermaidBlock`, and the markdown renderer already in production.

---

## 2. Shared Content Block Format

This format is the single source of truth for all rich content in Rendara — chat messages, dashboard tiles, and story slides.

```typescript
type ContentBlock =
  | { type: "text";      text: string }           // rendered markdown
  | { type: "viz_chart"; spec: VizSpec }           // Recharts chart (all 7 types incl. kpi)
  | { type: "mermaid";   definition: string }      // Mermaid diagram
```

`VizSpec` is unchanged from `types/viz.ts`. `type: "kpi"` is a valid `VizSpec.type` — there is no separate `kpi` tile/block type.

---

## 3. Dashboard Schema

### 3.1 Tile Structure

```typescript
interface DashboardTile {
  id: string;                             // unique within dashboard
  type: "text" | "viz_chart" | "mermaid"; // "kpi" removed — use viz_chart with spec.type="kpi"
  content: ContentBlock[];                // ordered array of content blocks
  x: number;                             // left position, 0–100 (%)
  y: number;                             // top position, 0–100 (%)
  w: number;                             // width, 0–100 (%)
  h: number;                             // height, 0–100 (%)
  title?: string;                         // optional tile heading
}
```

`content` replaces the old `content: unknown` field. A tile may contain any mix of text, charts, and diagrams.

### 3.2 `layout_json` column (unchanged column name)

The `dashboards.layout_json` column stores a JSON-serialised `DashboardTile[]` array. Schema and API are unchanged. Only the shape of each tile's `content` field changes.

### 3.3 New column: `conversation_id`

```sql
ALTER TABLE dashboards ADD COLUMN conversation_id TEXT DEFAULT NULL;
```

Created lazily on first AgentChatPanel interaction. References `conversations.id`.

---

## 4. Story Schema

### 4.1 Slide Structure

```typescript
interface StorySlide {
  id?: string;
  title: string;                   // slide heading
  content: string;                 // markdown narrative (prose, bullets, headings)
  visualizations?: ContentBlock[]; // ordered viz/mermaid blocks rendered below content
  notes?: string;                  // speaker notes (hidden in presentation mode)
}
```

`content` stays a plain markdown string — it is the narrative voice of the slide. `visualizations` is a new optional array of `viz_chart` or `mermaid` blocks rendered below the text. Any number of visualizations per slide is supported. Text-only slides omit `visualizations` entirely.

### 4.2 New column: `conversation_id`

```sql
ALTER TABLE stories ADD COLUMN conversation_id TEXT DEFAULT NULL;
```

Same lazy-creation pattern as dashboards.

---

## 5. LLM Tools

### 5.1 Updated `create_dashboard`

```json
{
  "name": "create_dashboard",
  "description": "Create a free-canvas dashboard with tiles. Use when the user asks to create, build, or make a dashboard. Tiles are positioned absolutely on a 16:9 canvas using x/y/w/h as percentages (0-100).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "tiles": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id":    { "type": "string" },
            "type":  { "type": "string", "enum": ["text", "viz_chart", "mermaid"] },
            "title": { "type": "string" },
            "content": {
              "type": "array",
              "description": "Ordered content blocks for this tile",
              "items": {
                "oneOf": [
                  {
                    "type": "object",
                    "properties": {
                      "type": { "const": "text" },
                      "text": { "type": "string", "description": "Markdown text" }
                    },
                    "required": ["type", "text"]
                  },
                  {
                    "type": "object",
                    "properties": {
                      "type": { "const": "viz_chart" },
                      "spec": {
                        "type": "object",
                        "description": "VizSpec — same schema as chat charts. type: bar|line|area|pie|scatter|composed|kpi",
                        "properties": {
                          "type":  { "type": "string" },
                          "title": { "type": "string" },
                          "data":  { "type": "array" },
                          "xKey":  { "type": "string" },
                          "yKey":  { "type": "string" }
                        },
                        "required": ["type", "title", "data"]
                      }
                    },
                    "required": ["type", "spec"]
                  },
                  {
                    "type": "object",
                    "properties": {
                      "type":       { "const": "mermaid" },
                      "definition": { "type": "string", "description": "Valid Mermaid diagram definition" }
                    },
                    "required": ["type", "definition"]
                  }
                ]
              }
            },
            "x": { "type": "number" },
            "y": { "type": "number" },
            "w": { "type": "number" },
            "h": { "type": "number" }
          },
          "required": ["id", "type", "content", "x", "y", "w", "h"]
        }
      }
    },
    "required": ["title", "tiles"]
  }
}
```

### 5.2 Updated `create_story`

```json
{
  "name": "create_story",
  "description": "Create a slide-deck story. Use when the user asks to create a story, presentation, or slide deck.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "slides": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id":      { "type": "string" },
            "title":   { "type": "string", "description": "Slide heading" },
            "content": { "type": "string", "description": "Slide narrative in markdown" },
            "visualizations": {
              "type": "array",
              "description": "Optional ordered charts/diagrams rendered below content",
              "items": {
                "oneOf": [
                  {
                    "type": "object",
                    "properties": {
                      "type": { "const": "viz_chart" },
                      "spec": { "type": "object", "description": "VizSpec — same schema as chat charts" }
                    },
                    "required": ["type", "spec"]
                  },
                  {
                    "type": "object",
                    "properties": {
                      "type":       { "const": "mermaid" },
                      "definition": { "type": "string" }
                    },
                    "required": ["type", "definition"]
                  }
                ]
              }
            },
            "notes": { "type": "string" }
          },
          "required": ["id", "title", "content"]
        }
      },
      "auto_advance_interval": { "type": "integer" }
    },
    "required": ["title", "slides"]
  }
}
```

### 5.3 New `update_dashboard`

```json
{
  "name": "update_dashboard",
  "description": "Update an existing dashboard's title or tiles. Use when the user asks to edit, change, add to, or modify a dashboard they are currently viewing. Pass the full updated tiles array.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "dashboard_id": { "type": "string", "description": "ID of the dashboard to update" },
      "title": { "type": "string", "description": "New title (omit to keep existing)" },
      "tiles": { "type": "array",  "description": "Full replacement tiles array (same schema as create_dashboard). Required if changing layout or content." }
    },
    "required": ["dashboard_id"]
  }
}
```

### 5.4 New `update_story`

```json
{
  "name": "update_story",
  "description": "Update an existing story's title or slides. Use when the user asks to edit, change, add to, or modify a story they are currently viewing. Pass the full updated slides array.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "story_id": { "type": "string", "description": "ID of the story to update" },
      "title":  { "type": "string", "description": "New title (omit to keep existing)" },
      "slides": { "type": "array",  "description": "Full replacement slides array (same schema as create_story)." },
      "auto_advance_interval": { "type": "integer" }
    },
    "required": ["story_id"]
  }
}
```

---

## 6. AgentChatPanel — Functional Design

### 6.1 Behaviour

- Collapsed by default (32px strip). One click expands to 320px right panel.
- Each dashboard/story page has its own `AgentChatPanel` instance bound to the resource's `conversation_id`.
- On first open: a new conversation is created (`POST /api/conversations`) and the `conversation_id` is stored on the resource via `PATCH /api/dashboards/{id}` or `PATCH /api/stories/{id}`.
- The panel renders a full `ChatProvider` + `ConversationView` — the **identical** chat UI used on `/c/[id]`.

### 6.2 LLM Context Injection

When the AgentChatPanel sends a message, the backend prepends a **resource context block** as the first system message:

```
You are editing an existing dashboard/story. Current state:
ID: {id}
Title: {title}
Current tiles/slides: {JSON.stringify(layout_json or slides_json, null, 2)}

Use update_dashboard / update_story to apply changes.
Do not create a new dashboard/story unless explicitly asked.
Always pass the FULL tiles/slides array — partial updates are not supported.
Re-use data already retrieved in this conversation. Do not re-query unless needed.
```

This context is injected by the chat stream endpoint when it detects a `resource_id` field in the request body:

```typescript
// Extended chat stream request
interface ChatStreamRequest {
  conversation_id: string;
  message: string;
  new_conversation: boolean;
  resource_id?: string;   // NEW: "dashboard:{uuid}" or "story:{uuid}"
}
```

### 6.3 After `update_dashboard` / `update_story` tool call

1. Backend PATCHes the resource immediately inside `_execute_rendara_tool`.
2. The SSE stream emits: `{ type: "resource_updated", resource_type: "dashboard"|"story", resource_id: string }`.
3. The dashboard/story detail page listens via the `onResourceUpdated` adapter callback and re-fetches its data — **live update, no page reload**.

### 6.4 Tool UI for update tools

`update_dashboard` and `update_story` render as a `ToolCallIndicator` in the AgentChatPanel thread — no preview card, since the canvas already shows the updated result live.

---

## 7. Frontend Component Changes

### 7.1 `DashboardTile.tsx`

Replace `content: unknown` with content blocks array rendering. Each block renders using the same components as chat:

```typescript
function renderBlock(block: ContentBlock, idx: number) {
  if (block.type === "text")
    return <MarkdownRenderer key={idx} content={block.text} />;
  if (block.type === "viz_chart")
    return <VizChartBlock key={idx} spec={block.spec} status="complete" readOnly showPinButton={false} />;
  if (block.type === "mermaid")
    return <MermaidBlock key={idx} definition={block.definition} status="complete" readOnly showPinButton={false} />;
}

// Tile wrapper: scrollable, padded, rounded
<div style={absolutePositionStyle} className="overflow-y-auto rounded-xl border border-border bg-surface p-3">
  {tile.title && <p className="text-xs font-medium text-muted-foreground mb-2">{tile.title}</p>}
  {(tile.content as ContentBlock[]).map(renderBlock)}
</div>
```

**Migration:** `_normalise_content(raw)` helper wraps legacy string content in `[{ type: "text", text: raw }]`.

### 7.2 `StorySlide.tsx`

```typescript
// Narrative text rendered as markdown
<MarkdownRenderer content={slide.content} />

// Visualizations below content
{slide.visualizations?.map((block, idx) =>
  block.type === "viz_chart"
    ? <VizChartBlock key={idx} spec={block.spec} status="complete" readOnly showPinButton={false} />
    : <MermaidBlock  key={idx} definition={block.definition} status="complete" readOnly showPinButton={false} />
)}
```

Slide layout: fixed 16:9 aspect, title at top, markdown content body, visualizations at bottom (scrollable within the slide if content is tall).

### 7.3 `AgentChatPanel.tsx`

Full replacement of the static placeholder:

```typescript
interface AgentChatPanelProps {
  resourceId: string;   // "dashboard:{uuid}" or "story:{uuid}"
  className?: string;
}

export function AgentChatPanel({ resourceId, className }: AgentChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // On first expand: fetch or create conversation_id for this resource
  useEffect(() => {
    if (!isExpanded || conversationId) return;
    initResourceConversation(resourceId).then(setConversationId);
  }, [isExpanded, resourceId]);

  return (
    <div className={cn("...", isExpanded ? "w-80" : "w-8", className)}>
      <button onClick={() => setIsExpanded(v => !v)}>{/* chevron */}</button>
      {isExpanded && conversationId && (
        <ChatProvider conversationId={conversationId} resourceId={resourceId}>
          <ConversationView />
        </ChatProvider>
      )}
    </div>
  );
}
```

`initResourceConversation` calls `GET /api/dashboards/{id}` or `GET /api/stories/{id}`, returns existing `conversation_id` or creates a new conversation and PATCHes it onto the resource.

### 7.4 `MarkdownRenderer` (new shared component)

```typescript
// app/components/ui/MarkdownRenderer.tsx
"use client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <ReactMarkdown
      className={cn(
        "prose prose-invert prose-sm max-w-none",
        "prose-headings:text-white prose-p:text-[#8892A4]",
        "prose-strong:text-white prose-li:text-[#8892A4]",
        "prose-code:text-accent prose-code:bg-surface",
        className
      )}
    >
      {content}
    </ReactMarkdown>
  );
}
```

Used in: `DashboardTile`, `StorySlide`, and optionally as a replacement for bare `<p>` tags in chat message text blocks.

---

## 8. Backend Changes

### 8.1 `database.py`

- `init_db()`: add `conversation_id TEXT DEFAULT NULL` to `dashboards` and `stories` CREATE TABLE statements.
- Add `update_dashboard(id, title?, tiles_json?)` and `update_story(id, title?, slides_json?, auto_advance_interval?)` PATCH helpers.
- Add `set_resource_conversation(resource_type, resource_id, conversation_id)` to link a conversation to a resource.

### 8.2 `routers/dashboards.py` and `routers/stories.py`

- `PATCH /api/dashboards/{id}` and `PATCH /api/stories/{id}`: ensure `conversation_id` is accepted in the request body and forwarded to the database helper.
- `GET /api/dashboards/{id}` and `GET /api/stories/{id}`: include `conversation_id` in response so the frontend can reuse it.

### 8.3 `routers/chat.py`

```python
class ChatStreamRequest(BaseModel):
    conversation_id: str
    message: str
    new_conversation: bool = False
    resource_id: Optional[str] = None   # "dashboard:{uuid}" or "story:{uuid}"
```

Pass `resource_id` through to `run_chat_stream`.

### 8.4 `services/stream_processor.py`

When `resource_id` is present, before the first LLM call:
1. Parse `resource_id` to get type + UUID.
2. Fetch current resource state from DB.
3. Build context injection string.
4. Prepend as an additional system message (or inject into the first user message).

### 8.5 `services/mcp_client.py`

Register `update_dashboard` and `update_story` as built-in Rendara tools alongside `create_dashboard` and `create_story`. Dispatch via `_execute_rendara_tool`. On success, emit `resource_updated` SSE event.

### 8.6 New SSE event

```typescript
// types/sse.ts
export interface ResourceUpdatedEvent {
  type: "resource_updated";
  resource_type: "dashboard" | "story";
  resource_id: string;
}
// Add to SSEEvent union
```

### 8.7 System prompt additions (`prompts/system_prompt.py`)

Add to the DASHBOARDS AND STORIES section:

```
TILE CONTENT — Each tile's "content" is an array of content blocks:
  { "type": "text",      "text": "## Heading\n\nMarkdown prose" }
  { "type": "viz_chart", "spec": { "type": "bar", "title": "...", "data": [...], "xKey": "...", "yKey": "..." } }
  { "type": "mermaid",   "definition": "flowchart TD\n  A --> B" }

Use the SAME chart spec format as inline chat charts. A tile may contain any
number of blocks in any combination. A typical data tile: one viz_chart block.
A narrative tile: one text block. A mixed tile: text block then viz_chart block.

SLIDE VISUALIZATIONS — "visualizations" is an optional ordered array of
viz_chart or mermaid blocks rendered below the slide's markdown "content".
Keep slides focused: one key insight per slide, one or two supporting charts.

EDITING DASHBOARDS/STORIES — When resource context is provided:
- Use update_dashboard(dashboard_id, tiles?) to modify an existing dashboard.
- Use update_story(story_id, slides?) to modify an existing story.
- Pass the FULL tiles/slides array — partial updates are not supported.
- Re-use data already retrieved this session. Do not re-query unless needed.
```

---

## 9. Adapter Changes (`rendara-adapter.ts`)

Add `resource_id` to the fetch body when set, and handle the new SSE event:

```typescript
// In createRendaraAdapter — new optional params
export function createRendaraAdapter(
  existingConversationId?: string,
  onMessageComplete?: ...,
  onConversationCreated?: ...,
  onPinnedMetadata?: ...,
  onResourceUpdated?: (type: string, id: string) => void,
  resourceId?: string,             // NEW
): ChatModelAdapter

// In fetch body
body: JSON.stringify({
  conversation_id: conversationId,
  message: userText,
  new_conversation: messages.length <= 1,
  resource_id: resourceId ?? undefined,  // NEW
})

// In SSE switch
case "resource_updated": {
  if (onResourceUpdated) {
    onResourceUpdated(event.resource_type, event.resource_id);
  }
  break;
}
```

---

## 10. Implementation Order

| # | Work | Key files |
|---|------|-----------|
| 1 | DB schema: `conversation_id` on dashboards + stories | `database.py` |
| 2 | `update_dashboard` + `update_story` DB helpers + REST PATCH | `database.py`, `routers/` |
| 3 | Register `update_dashboard`/`update_story` as LLM tools | `mcp_client.py` |
| 4 | `resource_id` in chat request + context injection | `routers/chat.py`, `stream_processor.py` |
| 5 | `resource_updated` SSE event | `stream_processor.py`, `types/sse.ts`, `rendara-adapter.ts` |
| 6 | `MarkdownRenderer` component | `app/components/ui/MarkdownRenderer.tsx` |
| 7 | `DashboardTile` — content blocks rendering + migration shim | `app/components/dashboards/DashboardTile.tsx` |
| 8 | `StorySlide` — markdown + visualizations | `app/components/stories/StorySlide.tsx` |
| 9 | `AgentChatPanel` — real chat runtime wired up | `app/components/layout/AgentChatPanel.tsx` |
| 10 | System prompt + tool schemas updated | `prompts/system_prompt.py`, `mcp_client.py` |

---

## 11. Data Migration

Existing tiles in `demo.db` use `content: "plain string"`. A `_normalise_content(raw)` helper in `DashboardTile.tsx` wraps legacy string values:

```typescript
function normaliseContent(raw: unknown): ContentBlock[] {
  if (Array.isArray(raw)) return raw as ContentBlock[];
  if (typeof raw === "string") return [{ type: "text", text: raw }];
  return [{ type: "text", text: JSON.stringify(raw) }];
}
```

No backend migration needed — the frontend normalises on read. Once the LLM starts producing new-format tiles, the DB naturally migrates over time.

---

## 12. Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | AgentChatPanel edit model | Option A — single `update_dashboard`/`update_story` replacing full content |
| 2 | Tile content format | Option A — content blocks array (identical to chat) |
| 3 | Manual tile drag/resize | Deferred — agent-only layout for now |
| 4 | Story slide content | Option C+ — markdown string + ordered `visualizations` array, unlimited viz per slide |
| 5 | AgentChatPanel conversation | Option A — isolated per-resource conversation stored on the resource |
| 6 | KPI tile type | Option A — removed; KPI is `viz_chart` with `spec.type = "kpi"` |
