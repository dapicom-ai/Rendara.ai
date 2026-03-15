# Rendara v2 Test Strategy Document

**Version:** 2.0
**Date:** 2026-03-13
**Scope:** E2E test strategy for Rendara v2 — updated for feature redesign
**Test Framework:** Playwright (testDir: `./e2e`, baseURL: `http://localhost:3000`)

---

## Table of Contents

1. [Overview and Route Changes](#1-overview-and-route-changes)
2. [Architecture Summary](#2-architecture-summary)
3. [Feature Areas](#3-feature-areas)
4. [Timeout Policy](#4-timeout-policy)
5. [Seeding Strategy](#5-seeding-strategy)
6. [Test File Inventory](#6-test-file-inventory)
7. [Test Case Catalog](#7-test-case-catalog)
8. [Known Implementation Gaps](#8-known-implementation-gaps)
9. [Execution Plan](#9-execution-plan)

---

## 1. Overview and Route Changes

### 1.1 Active Routes (v2)

| Route | Screen | Notes |
|---|---|---|
| `/` | Home — new conversation | Chat input, suggested prompts |
| `/c/[id]` | Active conversation | Loads persisted thread |
| `/dashboards` | Dashboards index | Agent-created, grid of cards |
| `/dashboards/[id]` | Dashboard detail | Free-canvas + collapsed AgentChatPanel |
| `/stories` | Stories index | Agent-created, grid of cards |
| `/stories/[id]` | Story viewer | Slide nav, Present mode, AgentChatPanel |
| `/pinned` | Pinned Responses | Grid of saved AI responses |

### 1.2 Removed Routes (v2)

| Route | Reason |
|---|---|
| `/reports` | Feature removed |
| `/reports/[id]` | Feature removed |
| `/r/[uuid]` | Feature removed |

---

## 2. Architecture Summary

- **Frontend:** Next.js 14+ App Router at `localhost:3000`
- **Backend:** FastAPI (Python) at `localhost:8001`, SSE streaming, SQLite (`demo.db`)
- **AI:** OpenRouter via `@assistant-ui/react` `useLocalRuntime` + `ChatModelAdapter`
- **State:** Zustand (`usePinModalStore`, `useNavigationStore`)
- **Charts:** Recharts (7 types), Diagrams: Mermaid.js
- **Playwright config:** `testDir: './e2e'`, viewport: 1440×900 desktop Chrome, retries: 1

---

## 3. Feature Areas

### 3.1 Chat (unchanged core)
- Home screen: hero title, suggested chips, textarea, send button
- Streaming: SSE via `/api/chat/stream`, Stop generation button lifecycle
- Tool calls: `viz_block`, `mermaid_block`, `create_dashboard`, `create_story`
- MessageActionBar: Copy, Regenerate, Pin (opens PinModal)
- Conversation persistence: sidebar history, `/c/[id]` loader

### 3.2 Pinned Responses (new)
- `/pinned` page: grid of saved AI response cards (title, description, date)
- EmptyState: "No pinned responses yet. Pin a response from chat to save it here."
- Delete: hover card → Trash icon → removes from list (DELETE /api/pinned/{id})
- API: `GET /api/pinned`, `POST /api/pinned`, `DELETE /api/pinned/{id}`
- **Note:** PinModal currently says "Pin to Dashboard" (posts to dashboard pins).
  The /pinned page reads from /api/pinned. These are currently separate flows.

### 3.3 Free-Canvas Dashboards (redesigned)
- `/dashboards`: grid of dashboard cards showing title + tile count
- EmptyState: "No dashboards yet. Dashboards are created by the agent."
- No "Create Dashboard" button — agent-only creation
- `/dashboards/[id]`: 16:9 canvas with tiles at absolute % positions
  - Tile types: `viz_chart`, `mermaid`, `text`, `kpi`
  - Collapsed AgentChatPanel (32px strip → 320px on expand)
  - Editable title (click h1 → input → blur/Enter → PATCH /api/dashboards/{id})
  - "Agent created" badge in header
- API: `GET /api/dashboards`, `GET /api/dashboards/{id}`, `POST /api/dashboards`, `PATCH /api/dashboards/{id}`, `DELETE /api/dashboards/{id}`

### 3.4 Stories (new)
- `/stories`: grid of story cards (title, slide count, date, 16:9 thumbnail)
- EmptyState: "Ask the agent in chat to create a story."
- No "Create Story" button — agent-only creation
- `/stories/[id]`: StoryViewer
  - Prev/Next buttons with slide counter "N / Total"
  - Keyboard: ← → navigate slides; Escape exits presentation mode
  - "Present" button → fullscreen overlay (fixed inset-0 z-50)
  - Auto-advance: countdown bar when `autoAdvanceInterval` set
  - Collapsed AgentChatPanel (same as dashboard)
  - Delete from index: hover → Trash icon
- API: `GET /api/stories`, `GET /api/stories/{id}`, `POST /api/stories`, `PATCH /api/stories/{id}`, `DELETE /api/stories/{id}`

### 3.5 Navigation (updated)
- Sidebar NavRail: Conversations (`/`), Dashboards (`/dashboards`), Stories (`/stories`), Pinned (`/pinned`)
- Reports nav item: **REMOVED**
- New Conversation button (pill-shaped, accent colour)
- Conversation history panel below NavRail

---

## 4. Timeout Policy

All tests use explicit timeouts via `expect(locator).toBeVisible({ timeout: N })`.

| Context | Timeout |
|---|---|
| Page navigation | `10_000` (10s) |
| API fetch on page load | `15_000` (15s) |
| Chat responses / SSE streaming | `60_000` (60s) |
| Tool call completion | `45_000` (45s) |
| Modal open/close | `5_000` (5s) |
| Animation transitions | `3_000` (3s) |
| Presentation mode transitions | `5_000` (5s) |

---

## 5. Seeding Strategy

Tests that require existing data seed via the backend REST API before navigating.
Teardown deletes seeded resources in `try/finally` blocks.

```typescript
// Pattern used in all feature test files:
const seeded = await createTestDashboard(request, { title: 'My Test' });
try {
  // ... test assertions ...
} finally {
  await deleteResource(request, `/api/dashboards/${seeded.id}`);
}
```

Helper functions live in `e2e/helpers/page-objects.ts`:
- `createTestDashboard(request, overrides?)`
- `createTestStory(request, overrides?)`
- `createTestPinned(request, overrides?)`
- `deleteResource(request, path)`

Fixture JSON in `e2e/fixtures/`:
- `sample-dashboard.json` — 2 text tiles
- `sample-story.json` — 3 slides
- `sample-pinned.json` — 1 viz_chart content block

---

## 6. Test File Inventory

### Active test files

| File | Coverage |
|---|---|
| `e2e/smoke-test.spec.ts` | SMOKE-1..8: all routes + nav |
| `e2e/chat-flow.spec.ts` | TC-CHAT-001..013, CHAT-PERSIST, CHAT-ERR |
| `e2e/chart-viz.spec.ts` | Chart + Mermaid rendering |
| `e2e/nav-redesign.spec.ts` | TC-NAV-001..008: sidebar links, active state |
| `e2e/pinned-responses.spec.ts` | TC-PIN-001..008, TC-PIN-API-001..002 |
| `e2e/dashboard-canvas.spec.ts` | TC-DASH-001..011, TC-DASH-API-001..002 |
| `e2e/stories.spec.ts` | TC-STORY-001..012, TC-STORY-API-001 |
| `e2e/visual-pages.spec.ts` | Screenshot captures for all pages |
| `e2e/visual.spec.ts` | Visual regression baseline |
| `e2e/demo-flow.spec.ts` | Full demo flow |
| `e2e/report.spec.ts` | REMOVED-REPORTS-001..003: confirms 404 |
| `e2e/full-flow.spec.ts` | FLOW-1..6: end-to-end demo (chat → pin → pinned page) |
| `e2e/dashboard-editing.spec.ts` | DASH-EDIT-1..6: inline title edit, AgentChatPanel, canvas |
| `e2e/story-editing.spec.ts` | STORY-EDIT-1..8: slide nav, keyboard, presentation, panel |
| `e2e/pin-from-message.spec.ts` | PIN-MSG-1..5: hover action bar, modal, save, delete |
| `e2e/llm-tool-calls.spec.ts` | LLM-TC-1..4: create_dashboard, create_story via LLM |

### Deprecated / tombstoned files

| File | Status |
|---|---|
| `e2e/dashboard.spec.ts` | Old pin-based design — superseded by `dashboard-canvas.spec.ts` |
| `e2e/reports/report-builder.spec.ts` | DEPRECATED — header updated, no active tests |
| `e2e/reports/report-lifecycle.spec.ts` | DEPRECATED — header updated, no active tests |
| `e2e/reports/report-consumer.spec.ts` | DEPRECATED — header updated, no active tests |

### Helpers and fixtures

| Path | Purpose |
|---|---|
| `e2e/helpers/page-objects.ts` | Selectors, timeout constants, API seed helpers |
| `e2e/fixtures/sample-dashboard.json` | Dashboard seed fixture |
| `e2e/fixtures/sample-story.json` | Story seed fixture |
| `e2e/fixtures/sample-pinned.json` | Pinned response seed fixture |

---

## 7. Test Case Catalog

### Navigation (TC-NAV)

| ID | Description | File |
|---|---|---|
| TC-NAV-001 | Sidebar has Conversations, Dashboards, Stories, Pinned | nav-redesign.spec.ts |
| TC-NAV-002 | Reports link absent from sidebar | nav-redesign.spec.ts |
| TC-NAV-003 | Stories link navigates to /stories | nav-redesign.spec.ts |
| TC-NAV-004 | Pinned link navigates to /pinned | nav-redesign.spec.ts |
| TC-NAV-005 | Dashboards link navigates to /dashboards | nav-redesign.spec.ts |
| TC-NAV-006 | Stories link shows active style on /stories | nav-redesign.spec.ts |
| TC-NAV-007 | Pinned link shows active style on /pinned | nav-redesign.spec.ts |
| TC-NAV-008 | /reports returns 404 (removed) | nav-redesign.spec.ts |

### Pinned Responses (TC-PIN)

| ID | Description | File |
|---|---|---|
| TC-PIN-001 | /pinned loads with "Pinned Responses" heading | pinned-responses.spec.ts |
| TC-PIN-002 | Empty state when no pinned items | pinned-responses.spec.ts |
| TC-PIN-003 | Seeded item visible on /pinned | pinned-responses.spec.ts |
| TC-PIN-004 | Delete button removes an item | pinned-responses.spec.ts |
| TC-PIN-005 | Multiple items render as a grid | pinned-responses.spec.ts |
| TC-PIN-006 | Date displayed correctly on card | pinned-responses.spec.ts |
| TC-PIN-007 | /pinned renders inside main layout with sidebar | pinned-responses.spec.ts |
| TC-PIN-008 | Pin button in chat opens the pin modal | pinned-responses.spec.ts |
| TC-PIN-API-001 | GET /api/pinned returns array | pinned-responses.spec.ts |
| TC-PIN-API-002 | POST /api/pinned creates; DELETE removes | pinned-responses.spec.ts |

### Dashboards — Canvas (TC-DASH)

| ID | Description | File |
|---|---|---|
| TC-DASH-001 | /dashboards loads with heading and agent subtitle | dashboard-canvas.spec.ts |
| TC-DASH-002 | Empty state on /dashboards | dashboard-canvas.spec.ts |
| TC-DASH-003 | Seeded dashboard appears as card | dashboard-canvas.spec.ts |
| TC-DASH-004 | Clicking card navigates to /dashboards/[id] | dashboard-canvas.spec.ts |
| TC-DASH-005 | Detail: title, back button, AgentChatPanel, badge | dashboard-canvas.spec.ts |
| TC-DASH-006 | Empty canvas message when layoutJson empty | dashboard-canvas.spec.ts |
| TC-DASH-007 | AgentChatPanel expands to 320px | dashboard-canvas.spec.ts |
| TC-DASH-008 | Inline title editing (click h1 → input → PATCH) | dashboard-canvas.spec.ts |
| TC-DASH-009 | Back button returns to /dashboards | dashboard-canvas.spec.ts |
| TC-DASH-010 | Text tiles from layoutJson rendered on canvas | dashboard-canvas.spec.ts |
| TC-DASH-011 | Not-found state for invalid dashboard ID | dashboard-canvas.spec.ts |
| TC-DASH-API-001 | GET /api/dashboards returns array | dashboard-canvas.spec.ts |
| TC-DASH-API-002 | Dashboard CRUD: POST, GET, PATCH, DELETE | dashboard-canvas.spec.ts |

### Stories (TC-STORY)

| ID | Description | File |
|---|---|---|
| TC-STORY-001 | /stories loads with "Stories" heading | stories.spec.ts |
| TC-STORY-002 | Empty state with agent prompt text | stories.spec.ts |
| TC-STORY-003 | Seeded story appears as card with slide count | stories.spec.ts |
| TC-STORY-004 | Clicking card navigates to /stories/[id] | stories.spec.ts |
| TC-STORY-005 | Detail: title, slide counter "1/3", prev/next, Present | stories.spec.ts |
| TC-STORY-006 | Next/Prev buttons navigate slides | stories.spec.ts |
| TC-STORY-007 | Arrow keys navigate slides | stories.spec.ts |
| TC-STORY-008 | Present button opens fullscreen overlay | stories.spec.ts |
| TC-STORY-009 | Escape exits presentation mode | stories.spec.ts |
| TC-STORY-010 | AgentChatPanel expands/collapses on story detail | stories.spec.ts |
| TC-STORY-011 | Delete button removes story from index | stories.spec.ts |
| TC-STORY-012 | Not-found state for invalid story ID | stories.spec.ts |
| TC-STORY-API-001 | Stories CRUD: POST, GET, PATCH, DELETE | stories.spec.ts |

### Full Flow (FLOW)

| ID | Description | File |
|---|---|---|
| FLOW-1 | Home → chat → streaming response completes | full-flow.spec.ts |
| FLOW-2 | Navigate via sidebar to all main routes | full-flow.spec.ts |
| FLOW-3 | Dashboard detail → AgentChatPanel expand/collapse | full-flow.spec.ts |
| FLOW-4 | Chat → pin response → card appears in /pinned | full-flow.spec.ts |
| FLOW-5 | Story detail → slide navigation → back to index | full-flow.spec.ts |
| FLOW-6 | Pinned page empty state when no items | full-flow.spec.ts |

### Dashboard Editing (DASH-EDIT)

| ID | Description | File |
|---|---|---|
| DASH-EDIT-1 | Inline title edit with Enter key | dashboard-editing.spec.ts |
| DASH-EDIT-2 | Inline title edit with blur | dashboard-editing.spec.ts |
| DASH-EDIT-3 | AgentChatPanel expand and collapse | dashboard-editing.spec.ts |
| DASH-EDIT-4 | Dashboard canvas renders seeded tiles | dashboard-editing.spec.ts |
| DASH-EDIT-5 | Empty dashboard shows empty state | dashboard-editing.spec.ts |
| DASH-EDIT-6 | Agent created badge is visible | dashboard-editing.spec.ts |

### Story Editing (STORY-EDIT)

| ID | Description | File |
|---|---|---|
| STORY-EDIT-1 | Navigate slides with Next/Previous buttons | story-editing.spec.ts |
| STORY-EDIT-2 | Navigate slides with keyboard arrows | story-editing.spec.ts |
| STORY-EDIT-3 | Presentation mode enter + Escape exit | story-editing.spec.ts |
| STORY-EDIT-4 | Navigate slides inside presentation mode | story-editing.spec.ts |
| STORY-EDIT-5 | AgentChatPanel toggle on story detail | story-editing.spec.ts |
| STORY-EDIT-6 | Slide renders title and content text | story-editing.spec.ts |
| STORY-EDIT-7 | Slide count badge visible in story header | story-editing.spec.ts |
| STORY-EDIT-8 | Back button navigates from story detail | story-editing.spec.ts |

### Pin From Message (PIN-MSG)

| ID | Description | File |
|---|---|---|
| PIN-MSG-1 | Hover assistant message reveals action bar | pin-from-message.spec.ts |
| PIN-MSG-2 | Pin button opens Save Response modal with auto-filled title | pin-from-message.spec.ts |
| PIN-MSG-3 | Edit fields → Save → Saved confirmation → modal closes | pin-from-message.spec.ts |
| PIN-MSG-4 | Pinned response card appears in /pinned | pin-from-message.spec.ts |
| PIN-MSG-5 | Delete button removes pinned card | pin-from-message.spec.ts |

### LLM Tool Calls (LLM-TC)

| ID | Description | File |
|---|---|---|
| LLM-TC-1 | Create dashboard via chat → DashboardPreviewCard appears | llm-tool-calls.spec.ts |
| LLM-TC-2 | Click Open Dashboard → navigates to dashboard detail | llm-tool-calls.spec.ts |
| LLM-TC-3 | Create story via chat → StoryPreviewCard appears | llm-tool-calls.spec.ts |
| LLM-TC-4 | Click Open Story → navigates to story detail | llm-tool-calls.spec.ts |

### Chat (TC-CHAT — unchanged)

TC-CHAT-001 through TC-CHAT-013, TC-CHAT-PERSIST, TC-CHAT-ERR — see `e2e/chat-flow.spec.ts`.

### Smoke Tests (SMOKE)

| ID | Description |
|---|---|
| SMOKE-1 | Home renders, message starts streaming |
| SMOKE-2 | /dashboards renders without crash |
| SMOKE-3 | /stories renders without crash |
| SMOKE-4 | /pinned renders without crash |
| SMOKE-5 | Dashboard detail renders without crash |
| SMOKE-6 | Story detail renders without crash |
| SMOKE-7 | Sidebar has Stories + Pinned; Reports absent |
| SMOKE-8 | /reports returns 404 |

---

## 8. Known Implementation Gaps

### GAP-001: PinModal posts to /api/dashboards/{id}/pins, not /api/pinned
- **Location:** `app/components/dashboards/PinModal.tsx`, `app/components/shared/PinModal.tsx`
- **Impact:** The "Pin to Dashboard" flow (from VizChartBlock or MessageActionBar) saves to dashboard pins, while `/pinned` reads from `/api/pinned`. These are decoupled.
- **Test impact:** TC-PIN-008 tests that the modal opens but notes the endpoint mismatch.

### GAP-002: Dashboard.spec.ts tests old pin-based design
- **Location:** `e2e/dashboard.spec.ts`
- **Impact:** These tests reference `/api/dashboards/{id}/pins` which may not match the new free-canvas design.
- **Resolution:** Superseded by `e2e/dashboard-canvas.spec.ts`.

### GAP-003: Old report test files contain active test code
- **Location:** `e2e/reports/report-builder.spec.ts`, `report-lifecycle.spec.ts`, `report-consumer.spec.ts`
- **Resolution:** Headers updated with DEPRECATED notice. Tests will skip if routes return 404.

### GAP-004: StoryViewer slide content rendering
- **Impact:** TC-STORY tests check slide counter and navigation but don't assert slide text content (StorySlide component internals vary by implementation).

### GAP-005: AgentChatPanel has no functional input yet
- **Location:** `app/components/layout/AgentChatPanel.tsx`
- **Impact:** The panel expands/collapses and shows "Agent Chat" heading + placeholder text, but has no actual text input or LLM conversation capability yet. Tests verify expand/collapse and placeholder content only. When input is added, new tests should verify type → submit → response within the panel.

### GAP-006: PinModal "Save Response" vs "Pin to Dashboard"
- **Location:** `app/components/dashboards/PinModal.tsx` (from MessageActionBar) vs `app/components/shared/PinModal.tsx`
- **Impact:** The MessageActionBar pin button opens `dashboards/PinModal.tsx` which posts to `/api/pinned`. The shared PinModal posts to dashboard pins. Tests (PIN-MSG) target the dashboards/PinModal variant with "Save Response" title.

---

## 9. Execution Plan

### Quick sanity (< 2 min)
```bash
npx playwright test e2e/smoke-test.spec.ts
```

### Navigation redesign
```bash
npx playwright test e2e/nav-redesign.spec.ts
```

### New feature suites
```bash
npx playwright test e2e/pinned-responses.spec.ts
npx playwright test e2e/dashboard-canvas.spec.ts
npx playwright test e2e/stories.spec.ts
```

### Chat regression
```bash
npx playwright test e2e/chat-flow.spec.ts
```

### Editing flows (dashboards + stories)
```bash
npx playwright test e2e/dashboard-editing.spec.ts e2e/story-editing.spec.ts
```

### Pin from message flow
```bash
npx playwright test e2e/pin-from-message.spec.ts
```

### Full end-to-end flow
```bash
npx playwright test e2e/full-flow.spec.ts
```

### LLM tool calls (requires running LLM, slow)
```bash
npx playwright test e2e/llm-tool-calls.spec.ts
```

### Full suite
```bash
npx playwright test
```

### Run specific TC
```bash
npx playwright test --grep "DASH-EDIT-1"
npx playwright test --grep "STORY-EDIT-3"
npx playwright test --grep "LLM-TC-1"
```

### Prerequisites
- Frontend running: `npm run dev` (port 3000)
- Backend running: `uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8001 --reload`
- SQLite DB: `demo.db` at project root (auto-created by backend)
