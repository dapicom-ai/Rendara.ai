# Test Plan — Dashboard & Story Rich Content
## Rendara v2 · Wave 1 (ANVIL) + Wave 2 (MERIDIAN-UPDATE)

---

## 1. Scope

This plan covers the implementation described in `docs/Rendara_Dashboard_Story_Redesign.md` and the files changed in both implementation waves:

**Wave 1 — ANVIL (backend)**
- `backend/database.py` — `conversation_id` column, `update_dashboard`, `update_story`, `set_resource_conversation` helpers
- `backend/services/mcp_client.py` — `update_dashboard`/`update_story` LLM tool registration + `_execute_rendara_tool` dispatch
- `backend/services/stream_processor.py` — `resource_id` context injection + `resource_updated` SSE emission
- `backend/routers/chat.py` — `resource_id` field on `ChatStreamRequest`
- `backend/routers/dashboards.py` — `conversation_id` in GET/PATCH
- `backend/routers/stories.py` — `conversation_id` in GET/PATCH
- `backend/prompts/system_prompt.py` — tile content blocks + editing instructions
- `types/sse.ts` — `ResourceUpdatedEvent` type

**Wave 2 — PRISM-UPDATE + MERIDIAN-UPDATE (frontend)**
- `app/components/ui/MarkdownRenderer.tsx` — shared prose markdown component
- `app/components/dashboards/DashboardTile.tsx` — ContentBlock rendering + `normaliseContent`
- `app/components/stories/StorySlide.tsx` — markdown + visualizations
- `app/lib/rendara-adapter.ts` — `resourceId` + `onResourceUpdated` handler
- `app/lib/use-rendara-runtime.ts` — forwarded new params
- `app/components/chat/ChatProvider.tsx` — `resourceId` + `onResourceUpdated` props
- `app/components/layout/AgentChatPanel.tsx` — full chat runtime
- `app/(main)/dashboards/[id]/page.tsx` — `refreshKey` + AgentChatPanel wired
- `app/(main)/stories/[id]/page.tsx` — same pattern

---

## 2. Unit Tests

### 2.1 Frontend — `normaliseContent` (DashboardTile.tsx)

| # | Input | Expected output |
|---|-------|-----------------|
| U-NC-1 | `[{ type: "text", text: "hello" }]` (already a block array) | Returns the same array as-is |
| U-NC-2 | `"plain string"` | `[{ type: "text", text: "plain string" }]` |
| U-NC-3 | `null` | `[{ type: "text", text: "null" }]` |
| U-NC-4 | `{ foo: "bar" }` (arbitrary object) | `[{ type: "text", text: '{"foo":"bar"}' }]` |
| U-NC-5 | `[]` (empty array) | `[]` |
| U-NC-6 | Mixed-type array with text + viz_chart blocks | Returned as-is (pass-through) |

### 2.2 Frontend — `MarkdownRenderer` rendering

| # | Input | Expected DOM output |
|---|-------|---------------------|
| U-MR-1 | `"# Heading"` | `<h1>` with text "Heading" |
| U-MR-2 | `"**bold**"` | `<strong>` element inside `<p>` |
| U-MR-3 | `"- item one\n- item two"` | `<ul>` with two `<li>` elements |
| U-MR-4 | `` "`code`" `` | `<code>` element with text "code" |
| U-MR-5 | Extra `className` prop | `className` applied to wrapper `<div>` |

### 2.3 Frontend — `ResourceUpdatedEvent` type contract

| # | Assertion | Purpose |
|---|-----------|---------|
| U-RT-1 | `ResourceUpdatedEvent` has `type: "resource_updated"` | Type field present |
| U-RT-2 | `resource_type` is `"dashboard" \| "story"` | Union type constrained |
| U-RT-3 | `resource_id` is `string` | ID field present |
| U-RT-4 | `SSEEvent` union includes `ResourceUpdatedEvent` | Event union exhaustive |

### 2.4 Backend — `database.update_dashboard`

| # | Test | Expected |
|---|------|---------|
| U-DB-1 | Update title only | `title` changed, `layout_json` unchanged, `updated_at` refreshed |
| U-DB-2 | Update tiles_json only | `layout_json` changed, `title` unchanged |
| U-DB-3 | Update both title + tiles_json | Both fields updated in single call |
| U-DB-4 | Neither title nor tiles_json provided | Row unchanged, no error |
| U-DB-5 | Non-existent ID | Returns `None` |

### 2.5 Backend — `database.update_story`

| # | Test | Expected |
|---|------|---------|
| U-DS-1 | Update title only | `title` changed |
| U-DS-2 | Update slides_json only | `slides_json` changed |
| U-DS-3 | Update `auto_advance_interval` | Column updated |
| U-DS-4 | Pass `slides_json` as a Python list | Serialised to JSON string in DB |
| U-DS-5 | Non-existent ID | Returns `None` |

### 2.6 Backend — `database.set_resource_conversation`

| # | Test | Expected |
|---|------|---------|
| U-RC-1 | `resource_type="dashboard"` | Updates `dashboards.conversation_id` |
| U-RC-2 | `resource_type="story"` | Updates `stories.conversation_id` |
| U-RC-3 | Verify the linked ID can be read back via `get_dashboard` | `conversation_id` field present in returned dict |

### 2.7 Backend — `_execute_rendara_tool` dispatch

| # | Tool | Arguments | Expected return |
|---|------|-----------|----------------|
| U-ET-1 | `update_dashboard` | `{dashboard_id, tiles: [...]}` | `(True, {dashboard_id, updated: True}, ...)` |
| U-ET-2 | `update_dashboard` | `{dashboard_id, title: "New"}` (no tiles) | Title updated, tiles unchanged |
| U-ET-3 | `update_story` | `{story_id, slides: [...]}` | `(True, {story_id, updated: True}, ...)` |
| U-ET-4 | `update_dashboard` | Non-existent `dashboard_id` | Returns `(True, ...)` (DB layer handles gracefully) |

### 2.8 Backend — `resource_id` context injection

| # | Input | Expected LLM messages |
|---|-------|----------------------|
| U-RI-1 | `resource_id="dashboard:{uuid}"` and dashboard exists | Second message has `role: "system"` with dashboard title and tiles JSON |
| U-RI-2 | `resource_id="story:{uuid}"` and story exists | Second message contains slides JSON |
| U-RI-3 | `resource_id=None` | Only one system message (no resource context) |
| U-RI-4 | `resource_id="dashboard:nonexistent-uuid"` | No context block injected (resource not found); no exception raised |
| U-RI-5 | Malformed `resource_id` (no colon) | No context block; exception logged but not raised |

---

## 3. API Contract Tests

### 3.1 Dashboard endpoints

| # | Request | Expected response |
|---|---------|------------------|
| A-D-1 | `GET /api/dashboards/{id}` | 200 with `conversation_id` field (may be `null`) |
| A-D-2 | `PATCH /api/dashboards/{id}` with `{ conversation_id: "abc" }` | 200, `conversation_id` stored |
| A-D-3 | `PATCH /api/dashboards/{id}` with new-format tile `content: [{ type: "text", text: "md" }]` | 200, `layoutJson` reflects new content |
| A-D-4 | `PATCH /api/dashboards/{id}` with `layout_json` as already-serialised JSON string | 200, parsed and stored correctly |

### 3.2 Story endpoints

| # | Request | Expected response |
|---|---------|------------------|
| A-S-1 | `GET /api/stories/{id}` | 200 with `conversation_id` field (may be `null`) |
| A-S-2 | `PATCH /api/stories/{id}` with `{ conversation_id: "abc" }` | 200, stored |
| A-S-3 | `POST /api/stories` with slides containing `visualizations` array | 200, slides stored with visualizations intact |

### 3.3 Chat stream endpoint

| # | Request | Expected behaviour |
|---|---------|-------------------|
| A-C-1 | `POST /api/chat/stream` with `resource_id: "dashboard:{uuid}"` | Streams without error; SSE events flow normally |
| A-C-2 | `POST /api/chat/stream` without `resource_id` | Streams without error (backwards compatible) |
| A-C-3 | `POST /api/chat/stream` with `resource_id` pointing to non-existent resource | Streams without error; context injection silently skipped |

---

## 4. E2E Click Paths

### 4.1 Dashboard rich content

| # | Flow | Key assertions |
|---|------|---------------|
| E-DC-1 | Navigate to seeded dashboard with tiles | No "has no tiles yet" empty state; DashboardCanvas renders |
| E-DC-2 | Text tile with legacy string content | `normaliseContent` wraps it; markdown paragraph visible |
| E-DC-3 | Text tile with markdown (heading + bullets) | `<h2>` / `<h3>` and `<li>` elements visible inside tile |
| E-DC-4 | Text tile with new ContentBlock array format | Renders identically to legacy string |
| E-DC-5 | viz_chart tile | SVG element or canvas present (Recharts rendered) |
| E-DC-6 | mermaid tile | SVG diagram visible |
| E-DC-7 | Tile with optional `title` field | Title text rendered above content |
| E-DC-8 | AgentChatPanel expand → chat input visible | `<textarea>` or chat input present in panel |
| E-DC-9 | AgentChatPanel collapse | Panel returns to 32px strip |
| E-DC-10 | `resource_updated` SSE mock → canvas refreshes | `refreshKey` increments; canvas re-renders with new tiles |

### 4.2 Story rich content

| # | Flow | Key assertions |
|---|------|---------------|
| E-SC-1 | Navigate to seeded story with slides | Slide viewer renders; slide title `<h2>` visible |
| E-SC-2 | Slide with markdown content | `<p>` or heading elements from `MarkdownRenderer` visible |
| E-SC-3 | Slide with `visualizations` (viz_chart) | SVG chart below slide content |
| E-SC-4 | Slide with `visualizations` (mermaid) | SVG diagram below content |
| E-SC-5 | Slide with no visualizations | No chart section rendered |
| E-SC-6 | Next button advances slide | Counter changes from "1 / N" to "2 / N" |
| E-SC-7 | Previous button retreats slide | Counter decrements |
| E-SC-8 | Keyboard ArrowRight/ArrowLeft | Slide counter updates |
| E-SC-9 | Present button | Fullscreen overlay visible; slide footer hidden |
| E-SC-10 | Escape exits presentation | Overlay hidden; normal view restored |
| E-SC-11 | AgentChatPanel on story detail | Expands and collapses correctly |

### 4.3 AgentChatPanel lifecycle

| # | Flow | Key assertions |
|---|------|---------------|
| E-AP-1 | Dashboard detail page load | Panel is collapsed (32px strip, expand button visible) |
| E-AP-2 | Click expand button | Panel widens to ~320px; chat UI mounts |
| E-AP-3 | Click collapse button | Panel returns to 32px |
| E-AP-4 | Expand → `initResourceConversation` creates a conversation | `PATCH /api/dashboards/{id}` called with new `conversation_id` |
| E-AP-5 | Second expand on same page | Reuses existing `conversation_id` (no new PATCH) |
| E-AP-6 | Send message in expanded panel | Message appears in chat thread |
| E-AP-7 | `resource_updated` event → `onResourceUpdated` fires | Parent page re-fetches; canvas content changes |

---

## 5. Visual Regression Checkpoints

| State | Screenshot name | Key elements to verify |
|-------|----------------|------------------------|
| Dashboard with text tile (markdown) | `rc-dash-text-tile.png` | Tile border, heading styles, paragraph text color `#8892A4` |
| Dashboard with viz_chart tile | `rc-dash-chart-tile.png` | Recharts SVG visible inside tile boundary |
| Dashboard with mermaid tile | `rc-dash-mermaid-tile.png` | SVG diagram inside tile |
| Dashboard with tile title header | `rc-dash-tile-title.png` | Small `text-xs` title above content |
| Story slide — text only | `rc-story-slide-text.png` | Slide `h2`, MarkdownRenderer prose |
| Story slide — with viz | `rc-story-slide-viz.png` | Chart below slide content |
| Story — presentation mode | `rc-story-present.png` | Full-window overlay, footer hidden |
| AgentChatPanel — collapsed | `rc-panel-collapsed.png` | 32px strip, chevron icon |
| AgentChatPanel — expanded | `rc-panel-expanded.png` | 320px panel with chat input |
| AgentChatPanel — initializing state | `rc-panel-init.png` | "Initializing..." spinner text |

---

## 6. Test Files

| File | Type | Test count |
|------|------|-----------|
| `e2e/dashboard-rich-content.spec.ts` | Playwright E2E | 16 |
| `e2e/story-rich-content.spec.ts` | Playwright E2E | 16 |
| `e2e/agent-chat-panel.spec.ts` | Playwright E2E | 10 |
| `backend/tests/test_update_tools.py` | pytest async | 14 |
| `backend/tests/test_resource_context.py` | pytest async | 11 |
| `__tests__/components/normalise-content.test.ts` | Vitest unit | 7 |
| `__tests__/components/markdown-renderer.test.tsx` | Vitest unit | 5 |
| `__tests__/contracts/resource-updated-event.test.ts` | Vitest type contract | 4 |

**Total: 83 test cases**

---

## 7. Assumptions & Setup Requirements

1. **Backend running** at `http://localhost:8001` before E2E tests execute. The `playwright.config.ts` `webServer` only starts the frontend; the backend must be started separately.

2. **Database seeding**: All E2E tests self-seed via `POST /api/dashboards` and `POST /api/stories` using the existing `createTestDashboard` / `createTestStory` helpers from `e2e/helpers/page-objects.ts`. All created resources are deleted in `finally` blocks.

3. **Recharts rendering**: Playwright tests that check for SVG charts wait up to `TIMEOUT.animation` (3s) for Recharts to complete its client-side render. If Recharts is lazy-loaded or needs a ResizeObserver, tests add a `waitForTimeout(500)` before asserting the SVG.

4. **Mermaid rendering**: Mermaid diagrams render asynchronously via a `useEffect`. Tests wait for the SVG element to appear with a dedicated timeout rather than a static sleep.

5. **AgentChatPanel conversation init**: The `initResourceConversation` function makes a real `PATCH` call to the backend. The `agent-chat-panel.spec.ts` tests that verify this behaviour require the backend to be available.

6. **`resource_updated` SSE mock**: The E2E test for live canvas refresh (E-DC-10) intercepts the SSE stream using Playwright's `page.route` to inject a synthetic `resource_updated` event rather than triggering a real LLM call.

7. **Python tests**: Run from the project root with `PYTHONPATH=/home/Daniel/workingfolder/rendara/backend pytest backend/tests/test_update_tools.py backend/tests/test_resource_context.py -v`. The existing `conftest.py` in `backend/tests/` provides the `db` fixture using an in-memory SQLite instance.

8. **`conversation_id` column migration**: `init_db()` runs idempotent `ALTER TABLE` statements to add the column. Tests that use the `db` fixture get a fresh schema with the column already present (via `SCHEMA_SQL`).
