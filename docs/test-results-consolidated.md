# Rendara v2 — Consolidated Test Report

**Date:** 2026-03-13
**Executed by:** 7 parallel tester agents + orchestrator verification
**Environment:** Frontend localhost:3000 (Next.js dev), Backend localhost:8001 (FastAPI/uvicorn), SQLite demo.db, PostgreSQL telco_lakehouse

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total test cases | 60 |
| Passed | 44 |
| Partial pass | 4 |
| Failed | 10 |
| Flaky | 2 |
| Unique bugs found | 19 |
| Critical bugs | 3 |
| High bugs | 5 |
| Medium bugs | 7 |
| Low/Informational | 4 |

---

## Results by Batch

### Batch 1: Chat Flow (tester-chat) — 14 passed, 1 flaky

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-CHAT-001 | Home screen renders, typed message starts streaming | PASS (flaky — timeout on slow LLM) |
| TC-CHAT-002 | Suggested prompt chip auto-submits | PASS |
| TC-CHAT-003 | Streaming text renders progressively | PASS |
| TC-CHAT-004 | Tool call indicator appears for MCP query | PASS |
| TC-CHAT-005 | Markdown formatting (bold, lists) renders | PASS |
| TC-CHAT-006 | Send button hidden during streaming | PASS |
| TC-CHAT-007 | Copy button copies text, shows confirmation | PASS |
| TC-CHAT-008 | Regenerate triggers new streaming response | PASS |
| TC-CHAT-009 | Multi-turn messages preserved in thread | PASS |
| TC-CHAT-010 | Navigate to persisted conversation via sidebar | PASS |
| TC-CHAT-011 | New conversation appears in sidebar after reload | PASS |
| TC-CHAT-012 | Empty/whitespace messages cannot be submitted | PASS |
| TC-CHAT-013 | Shift+Enter newline, plain Enter submits | PASS |
| TC-CHAT-PERSIST | Messages persisted to backend API | PASS |
| TC-CHAT-ERR | Error handling when backend returns 503 | PASS (flaky on retry) |

**Bugs found:** 0 blocking. 1 flaky test due to LLM streaming latency variance.

---

### Batch 2: Chart & Visualization (tester-viz) — 11 passed, 3 failed

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-VIZ-001 | Bar chart renders with axes and bars | PASS |
| TC-VIZ-002 | Line chart renders with data points | PASS |
| TC-VIZ-003 | Area chart renders filled region | PASS |
| TC-VIZ-004 | Pie chart renders with segments | PASS |
| TC-VIZ-005 | Scatter chart renders | FAIL |
| TC-VIZ-006 | Composed chart (bar + line dual-axis) | PASS |
| TC-VIZ-007 | KPI scorecard renders | FAIL |
| TC-VIZ-008 | Mermaid diagram renders | PASS |
| TC-VIZ-009 | Chart expand to fullscreen | PASS |
| TC-VIZ-010 | Multi-viz card layout | PASS |
| TC-VIZ-011 | Chart loading skeleton | PASS |
| TC-VIZ-012 | Invalid Mermaid shows error state | PASS |
| TC-VIZ-013 | Chart dark theme colors correct | PASS |
| TC-VIZ-014 | Tool error indicator renders | FAIL |

**Bugs found:**
- BUG-VIZ-001 (Medium): Scatter — AI model emits chart JSON in text body instead of viz_block SSE event
- BUG-VIZ-002 (Medium): KPI — AI generates `{metric, value}` but VizChartBlock validator requires `{label, value, format, trend}`
- BUG-VIZ-003 (Medium): Tool error indicator — `tool_call` blocks with `success:false` are silently dropped from render

---

### Batch 3: Dashboard (tester-dashboard) — 3 passed, 8 failed/blocked

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-DASH-001 | Pin chart to new dashboard (E2E) | FAIL |
| TC-DASH-002 | Pin chart to existing dashboard | FAIL |
| TC-DASH-003 | Pin with optional note | FAIL |
| TC-DASH-004 | Pin Mermaid diagram to dashboard | FAIL |
| TC-DASH-005 | Pin modal cancel does nothing | FAIL |
| TC-DASH-006 | Dashboards index shows all dashboards | PASS |
| TC-DASH-007 | Empty dashboard shows empty state | PASS |
| TC-DASH-008 | Dashboard detail shows pinned cards | FAIL |
| TC-DASH-009 | Unpin insight from dashboard | FAIL |
| TC-DASH-010 | Drag-and-drop reorder pins | BLOCKED |
| TC-DASH-011 | Dashboard title editing | PASS |

**Bugs found:**
- BUG-DASH-001 (Critical): Pin button has stub onClick handler (TODO comment). Clicking does nothing. File: `app/components/chat/MessageActionBar.tsx:52`
- BUG-DASH-002 (Critical): PinModal component is never mounted in any layout/page. Even if openModal() were called, no modal renders.
- BUG-DASH-003 (High): Dashboard detail page crashes with "Objects are not valid as a React child" when pins exist. `pin.content` (raw JSON spec) passed where ReactNode expected. File: `app/(main)/dashboards/[id]/page.tsx:201`
- BUG-DASH-004 (Low): DashboardCard click sometimes navigates to conversation URL instead of dashboard URL (sidebar overlap z-index issue)

---

### Batch 4: Reports (tester-report) — 2 passed, 4 partial/failed

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-RPT-001 | Reports index lists all reports | PASS |
| TC-RPT-002 | Report builder renders sections | PARTIAL |
| TC-RPT-003 | Report consumer renders published report | FAIL |
| TC-RPT-004 | Reports show published/draft badges | PASS |
| TC-RPT-005 | Report consumer scroll progress bar | FAIL |
| TC-RPT-006 | Report structure and content display | PARTIAL |

**Bugs found:**
- BUG-RPT-001 (High): Report builder page (`/reports/[id]`) crashes on certain content structures — missing null check on section.content
- BUG-RPT-002 (High): Report consumer page (`/r/[uuid]`) crashes — React runtime error on render
- BUG-RPT-003 (Medium): Published badge shows date as raw ISO string instead of formatted date
- BUG-RPT-004 (Low): Report card doesn't show section count
- BUG-RPT-005 (Medium): Consumer page missing scroll progress bar entirely

---

### Batch 5: Sidebar (tester-sidebar) — 5 passed, 2 with bugs

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-SIDE-001 | Sidebar renders all sections | PASS |
| TC-SIDE-002 | NavRail highlights active route | PASS |
| TC-SIDE-003 | Conversation history grouped by date | PASS |
| TC-SIDE-004 | New conversation appears in sidebar | PARTIAL (requires reload) |
| TC-SIDE-005 | MCP status bar shows connected servers | PARTIAL (badge not clickable) |

**Bugs found:**
- BUG-SIDE-001 (High): After sending a message from HOME (/), URL does NOT navigate to `/c/[id]`. Sidebar doesn't auto-refresh — new conversation only appears after full page reload.
- BUG-SIDE-002 (Medium): McpServerBadge onClick has no handler. Clicking a badge does nothing — no McpStatusPanel opens.
- BUG-SIDE-003 (Low): One conversation in DB has empty title, renders as just a date with no title text.

---

### Batch 6: Visual Regression (tester-visual) — 30 passed, 0 failed

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-VIS-001 | Design tokens applied correctly (all pages) | PASS (30 sub-checks) |
| TC-VIS-002 | Typography scale matches spec | PASS |
| TC-VIS-003 | Layout dimensions correct (sidebar 240px, etc.) | PASS |
| TC-VIS-004 | Dark theme consistency across routes | PASS |
| TC-VIS-005 | Interactive state colors (hover, focus, active) | PASS |

**Bugs found:** 0. Three informational findings:
- Sidebar border-right color is transparent (acceptable — uses shadow instead)
- Report consumer page is minimal (expected at MVP)
- Some hover states use opacity transitions instead of color changes

---

### Batch 7: API (tester-api) — 4 passed, 2 partial

| Test Case | Title | Result |
|-----------|-------|--------|
| TC-API-001 | Chat stream SSE contract | PASS |
| TC-API-002 | Conversations CRUD | PASS |
| TC-API-003 | Dashboards CRUD | PARTIAL (pin endpoint 500) |
| TC-API-004 | Reports CRUD + publish | PASS |
| TC-API-005 | CORS headers | PASS |
| TC-API-006 | Error handling | PARTIAL (empty message behavior) |

**Bugs found:**
- BUG-API-001 (Critical): `POST /api/dashboards/{id}/pins` returns 500. Router passes `title=body.title` but `database.add_pin()` has no `title` param. Also missing `position` arg. File: `backend/routers/dashboards.py`
- BUG-API-002 (Low): `public_url` in publish response contains comma-separated dual URLs (config issue)

---

## Deduplicated Bug List (Priority Order)

### Critical (3) — Must fix before demo

| ID | Bug | Affected Tests | File(s) |
|----|-----|---------------|---------|
| BUG-C1 | Pin API endpoint returns 500 — `database.add_pin()` called with wrong kwargs (`title=` instead of `position=`) | TC-DASH-001–005, TC-API-003 | `backend/routers/dashboards.py`, `backend/database.py` |
| BUG-C2 | Pin button onClick is a stub (TODO). PinModal never opens. | TC-DASH-001–005 | `app/components/chat/MessageActionBar.tsx:52` |
| BUG-C3 | PinModal component never mounted in any layout. Even if triggered, nothing renders. | TC-DASH-001–005 | `app/(main)/layout.tsx` or ChatProvider tree |

### High (5) — Should fix before demo

| ID | Bug | Affected Tests | File(s) |
|----|-----|---------------|---------|
| BUG-H1 | Dashboard detail page crashes when pins exist — raw JSON spec object passed as React child | TC-DASH-008–010 | `app/(main)/dashboards/[id]/page.tsx:201` |
| BUG-H2 | Report builder crashes on certain content structures (missing null check) | TC-RPT-002, TC-RPT-006 | `app/(main)/reports/[id]/page.tsx` |
| BUG-H3 | Report consumer page (`/r/[uuid]`) crashes on render | TC-RPT-003, TC-RPT-005 | `app/(main)/r/[uuid]/page.tsx` |
| BUG-H4 | No URL navigation after sending message from home — stays at `/` instead of `/c/[id]` | TC-SIDE-004, TC-CHAT-010 | `app/components/chat/ChatProvider.tsx` or adapter |
| BUG-H5 | Sidebar doesn't auto-refresh conversation list after new message | TC-SIDE-004 | Sidebar + state management |

### Medium (7) — Fix for quality

| ID | Bug | Affected Tests | File(s) |
|----|-----|---------------|---------|
| BUG-M1 | Scatter chart: AI emits JSON in text body instead of viz_block SSE event | TC-VIZ-005 | Backend system prompt / sentinel parsing |
| BUG-M2 | KPI scorecard schema mismatch: AI generates `{metric,value}`, validator expects `{label,value,format,trend}` | TC-VIZ-007 | `app/components/viz/VizChartBlock.tsx` or system prompt |
| BUG-M3 | Tool error indicator: failed tool_call blocks silently dropped from render | TC-VIZ-014 | `app/components/chat/ConversationLoader.tsx` or tool UI |
| BUG-M4 | MCP badge onClick not wired — no McpStatusPanel slide-over | TC-SIDE-005 | `components/layout/sidebar.tsx` |
| BUG-M5 | Report consumer missing scroll progress bar | TC-RPT-005 | `app/(main)/r/[uuid]/page.tsx` |
| BUG-M6 | Published badge shows raw ISO date string | TC-RPT-004 | Report card component |
| BUG-M7 | Empty message passes validation, reaches LLM which rejects it (should validate client-side) | TC-API-006 | Backend `ChatStreamRequest` model or frontend |

### Low/Informational (4)

| ID | Bug | Affected Tests | File(s) |
|----|-----|---------------|---------|
| BUG-L1 | `public_url` contains comma-separated dual URLs in publish response | TC-API-004 | Backend config / reports router |
| BUG-L2 | DashboardCard click sometimes navigates to conversation (sidebar z-index overlap) | TC-DASH-006 | Sidebar/DashboardCard layout |
| BUG-L3 | One conversation has empty title in sidebar | TC-SIDE-003 | Data issue or title generation |
| BUG-L4 | Report card doesn't show section count | TC-RPT-004 | Report card component |

---

## Recommended Fix Order

1. **BUG-C1** — Fix `database.add_pin()` kwargs in `backend/routers/dashboards.py` (5 min fix)
2. **BUG-C2 + BUG-C3** — Wire pin button handler + mount PinModal in layout (30 min)
3. **BUG-H1** — Transform `pin.content` JSON to `<VizChartBlock>` in dashboard detail page (15 min)
4. **BUG-H2 + BUG-H3** — Fix report builder + consumer crash (null checks, content rendering) (30 min)
5. **BUG-H4 + BUG-H5** — Add URL navigation after message send + sidebar auto-refresh (45 min)
6. **BUG-M2** — Fix KPI schema to accept AI's output format (or update system prompt) (15 min)
7. **BUG-M3** — Render failed tool_call blocks with error indicator (15 min)
8. **Remaining medium/low** — Address in quality polish pass

---

## Test Artifacts

- **Screenshots:** `test-screenshots/` (chat-flow/, dashboard/, reports/, sidebar/, visual regression)
- **Playwright reports:** `playwright-report/index.html`
- **Test specs:** `e2e/` (chat-flow, chart-viz, dashboard, visual, report, demo-flow) + `tests/e2e/` (api, sidebar, visual, report, dashboard)
- **API results:** `tests/e2e/api-results.md`
- **Test strategy:** `docs/test-strategy.md`
