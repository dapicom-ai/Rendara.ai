# UI Detail Design Document

## Business Data Analyst AI Agent UI

-----

**Document Type:** UI Detail Design Document
**Version:** 1.0 — Final
**Based On:** BRD v1.0 · SDD v1.0 · Stitch Prompt Sequence (12 screens)
**Status:** Approved for Frontend Implementation
**Date:** March 2026
**Classification:** Confidential

-----

## Table of Contents

1. UI Architecture Overview
1. Screen Inventory and Route Map
1. Full UI Component Tree
1. Screen Specifications
- 4.1  APP-SHELL — Application Shell
- 4.2  HOME — New Conversation Home
- 4.3  CONV-ACTIVE — Active Conversation (Text Response)
- 4.4  CONV-CHART — Active Conversation (Chart Response)
- 4.5  CONV-MULTI — Active Conversation (Multi-Visualisation)
- 4.6  PIN-MODAL — Pin to Dashboard Modal
- 4.7  DASH-INDEX — Dashboards Index
- 4.8  DASH-DETAIL — Dashboard Detail View
- 4.9  REPORT-INDEX — Reports Index
- 4.10 REPORT-BUILDER — Report Story Builder
- 4.11 REPORT-CONSUMER — Public Report Consumer View
- 4.12 MCP-STATUS — MCP Server Status Panel
1. Custom Component Specifications
- 5.1  assistant-ui Extension Architecture
- 5.2  VizChartBlock
- 5.3  MermaidBlock
- 5.4  ToolCallIndicator
- 5.5  MultiVizCard
- 5.6  KpiScorecardBlock
- 5.7  MessageActionBar
- 5.8  PinButton
- 5.9  ConversationInput
- 5.10 SuggestedPromptChip
- 5.11 StreamingTypingIndicator
- 5.12 McpServerBadge
- 5.13 ExpandOverlay
- 5.14 DashboardPinCard
- 5.15 ReportSectionBlock
- 5.16 PublishButton
- 5.17 ConversationListItem
- 5.18 EmptyState
1. Design Token Reference
1. Interaction and Animation Specification
1. assistant-ui Integration Contract

-----

-----

# 1. UI Architecture Overview

## 1.1 Rendering Model

All structured content blocks — charts, diagrams, tool call indicators — render **inline** inside the assistant message bubble, interleaved with text in the exact order they appeared in the SSE stream.

Each block renders at conversation-column width by default. On click, it expands into a full-screen `ExpandOverlay` for closer inspection. The user can pin from either the inline view or the expanded view. This is **Option C** as confirmed.

```
Assistant message bubble (flex column, gap-4):
  ┌─────────────────────────────────────────────┐
  │ [ToolCallIndicator — completed, 143ms]      │
  ├─────────────────────────────────────────────┤
  │ "Here's the Q4 regional breakdown:"         │  ← text_delta (markdown)
  ├─────────────────────────────────────────────┤
  │ ┌─────────────────────────────────────────┐ │
  │ │  VizChartBlock (bar chart, inline)      │ │  ← viz_block
  │ │  [click to expand] [pin ↗]             │ │
  │ └─────────────────────────────────────────┘ │
  ├─────────────────────────────────────────────┤
  │ "AMER leads at $1.84M, outperforming..."   │  ← text_delta (markdown)
  ├─────────────────────────────────────────────┤
  │ ┌─────────────────────────────────────────┐ │
  │ │  MermaidBlock (flowchart, inline)       │ │  ← mermaid_block
  │ │  [click to expand] [pin ↗]             │ │
  │ └─────────────────────────────────────────┘ │
  └─────────────────────────────────────────────┘
  [MessageActionBar: copy · regenerate · pin all]
```

## 1.2 Technology Stack

|Concern      |Package                                               |
|-------------|------------------------------------------------------|
|Framework    |Next.js 14+ App Router, TypeScript                    |
|Chat runtime |`@assistant-ui/react`                                 |
|UI primitives|`shadcn/ui` + Radix UI                                |
|Styling      |Tailwind CSS (dark theme tokens)                      |
|Charts       |`recharts`                                            |
|Diagrams     |`mermaid`                                             |
|Animation    |`framer-motion`                                       |
|Icons        |`lucide-react`                                        |
|Global state |`zustand`                                             |
|HTTP client  |`fetch` (native, SSE via EventSource / ReadableStream)|

## 1.3 Layout Zones

Three persistent zones on all authenticated screens:

```
+--------------------+----------------------------------------------+
|   LEFT SIDEBAR     |   MAIN CONTENT AREA                          |
|   w-60 (240px)     |   flex-1 min-w-0                             |
|   fixed, dark      |                                              |
|                    |   Renders one of:                            |
|  AppLogo           |   - HomeScreen                               |
|  NavRail           |   - ConversationView                         |
|  ConvHistoryList   |   - DashboardIndexView                       |
|  McpStatusBar      |   - DashboardDetailView                      |
|                    |   - ReportIndexView                          |
|                    |   - ReportBuilderView                        |
|                    |   - PublicReportView (no sidebar)            |
+--------------------+----------------------------------------------+
```

The public report consumer (`/r/[uuid]`) renders without the sidebar — full-width, no navigation.

## 1.4 Conversation Column Width

The chat conversation column is centered in the main content area with a max-width:

- `max-w-3xl` (768px) — conversation thread (message bubbles)
- `max-w-5xl` (1024px) — dashboard and report grid views

Charts and diagrams fill 100% of the message bubble width. The bubble itself is constrained to `max-w-3xl`. No right panel. No canvas.

-----

-----

# 2. Screen Inventory and Route Map

|Screen ID      |Screen Name                      |Route               |Auth    |
|---------------|---------------------------------|--------------------|--------|
|APP-SHELL      |Application Shell                |wraps all below     |No      |
|HOME           |New Conversation Home            |`/`                 |No (MVP)|
|CONV-ACTIVE    |Active Conversation              |`/c/[id]`           |No (MVP)|
|CONV-CHART     |Conversation — Chart Response    |`/c/[id]` (state)   |No (MVP)|
|CONV-MULTI     |Conversation — Multi-Viz Response|`/c/[id]` (state)   |No (MVP)|
|PIN-MODAL      |Pin to Dashboard Modal           |overlay on `/c/[id]`|No (MVP)|
|DASH-INDEX     |Dashboards Index                 |`/dashboards`       |No (MVP)|
|DASH-DETAIL    |Dashboard Detail View            |`/dashboards/[id]`  |No (MVP)|
|REPORT-INDEX   |Reports Index                    |`/reports`          |No (MVP)|
|REPORT-BUILDER |Report Story Builder             |`/reports/[id]`     |No (MVP)|
|REPORT-CONSUMER|Public Report Consumer           |`/r/[uuid]`         |Public  |
|MCP-STATUS     |MCP Server Status Panel          |overlay (sidebar)   |No (MVP)|

CONV-CHART and CONV-MULTI are not separate routes — they are visual states of CONV-ACTIVE driven by the content of the SSE stream. They are specified separately because they introduce distinct components (VizChartBlock, MultiVizCard) and interaction patterns (expand overlay, pin).

-----

-----

# 3. Full UI Component Tree

The complete named component hierarchy for the entire application. Every component listed here has a specification in Section 5 or is a stock shadcn/ui primitive.

```
<App>
  <AppShell>                              # APP-SHELL
    <Sidebar>
      <AppLogo />
      <NavRail>
        <NavItem icon="MessageSquare" label="Conversations" href="/" />
        <NavItem icon="LayoutDashboard" label="Dashboards" href="/dashboards" />
        <NavItem icon="FileText" label="Reports" href="/reports" />
      </NavRail>
      <ConversationHistoryPanel>          # CONV-HISTORY (drawer within sidebar)
        <ConversationListItem />          # × N (one per saved conversation)
      </ConversationHistoryPanel>
      <McpStatusBar>                      # bottom of sidebar
        <McpServerBadge />                # × N (one per configured MCP server)
      </McpStatusBar>
    </Sidebar>

    <MainContent>

      ── Route: / ──────────────────────────────────────────────
      <HomeScreen>                        # HOME
        <HomeHero>
          <HomeTitle />
          <HomeSubtitle />
        </HomeHero>
        <SuggestedPromptsGrid>
          <SuggestedPromptChip />         # × 4 (pre-validated demo prompts)
        </SuggestedPromptsGrid>
        <ConversationInput                # shared across HOME + CONV-ACTIVE
          placeholder="Ask anything about your data..."
          onSubmit={handleNewConversation}
        />
      </HomeScreen>

      ── Route: /c/[id] ────────────────────────────────────────
      <ConversationView>                  # CONV-ACTIVE / CONV-CHART / CONV-MULTI
        <ConversationHeader>
          <ConversationTitle />
          <ConversationHeaderActions>
            <IconButton icon="Share2" label="Share" />
            <IconButton icon="MoreHorizontal" label="More" />
          </ConversationHeaderActions>
        </ConversationHeader>

        <ThreadPrimitive.Root>            # assistant-ui root
          <MessageList>
            <MessagePrimitive.Root>       # assistant-ui — one per message

              ── User message ──────────────────────────────────
              <UserMessage>
                <UserMessageBubble>
                  <UserMessageText />
                </UserMessageBubble>
              </UserMessage>

              ── Assistant message ──────────────────────────────
              <AssistantMessage>
                <AssistantAvatar />
                <AssistantMessageBubble>

                  # Content blocks render in stream order:
                  <ToolCallIndicator />        # tool_call_start/result/error
                  <MarkdownTextBlock />        # text_delta (assembled)
                  <VizChartBlock />            # viz_block → inline chart
                  <MermaidBlock />             # mermaid_block → inline diagram
                  <MultiVizCard />             # grouped viz blocks (CONV-MULTI)
                  <KpiScorecardBlock />        # kpi type viz blocks

                </AssistantMessageBubble>
                <MessageActionBar>
                  <CopyButton />
                  <RegenerateButton />
                  <PinButton />               # opens PIN-MODAL
                </MessageActionBar>
              </AssistantMessage>

            </MessagePrimitive.Root>
          </MessageList>

          <StreamingTypingIndicator />    # visible while streaming

        </ThreadPrimitive.Root>

        <ConversationInputArea>
          <ConversationInput
            placeholder="Follow up..."
            onSubmit={handleSendMessage}
          />
        </ConversationInputArea>

        # Overlays (portalled, conditionally rendered):
        <ExpandOverlay />               # full-screen chart/diagram expand
        <PinModal />                    # PIN-MODAL
        <McpStatusPanel />              # MCP-STATUS slide-over
      </ConversationView>

      ── Route: /dashboards ────────────────────────────────────
      <DashboardIndexView>              # DASH-INDEX
        <PageHeader title="Dashboards">
          <Button>New Dashboard</Button>
        </PageHeader>
        <DashboardGrid>
          <DashboardCard />             # × N
        </DashboardGrid>
        <EmptyState />                  # when no dashboards
      </DashboardIndexView>

      ── Route: /dashboards/[id] ───────────────────────────────
      <DashboardDetailView>             # DASH-DETAIL
        <PageHeader>
          <DashboardTitle (editable) />
          <DashboardHeaderActions>
            <Button icon="Plus">Add from conversation</Button>
          </DashboardHeaderActions>
        </PageHeader>
        <DashboardPinGrid>
          <DashboardPinCard />          # × N (each pinned block)
        </DashboardPinGrid>
        <EmptyState />                  # when no pins
      </DashboardDetailView>

      ── Route: /reports ───────────────────────────────────────
      <ReportIndexView>                 # REPORT-INDEX
        <PageHeader title="Reports">
          <Button>New Report</Button>
        </PageHeader>
        <ReportGrid>
          <ReportCard />                # × N
        </ReportGrid>
        <EmptyState />
      </ReportIndexView>

      ── Route: /reports/[id] ──────────────────────────────────
      <ReportBuilderView>               # REPORT-BUILDER
        <ReportBuilderHeader>
          <ReportTitle (editable) />
          <PublishButton />
        </ReportBuilderHeader>
        <ReportCanvas>
          <ReportSectionBlock />        # × N (heading, text, viz, mermaid)
          <AddSectionButton />
        </ReportCanvas>
        <ReportBuilderSidebar>
          <PinnedInsightsPicker />      # pick from pinned blocks to insert
        </ReportBuilderSidebar>
      </ReportBuilderView>

    </MainContent>
  </AppShell>

  ── Route: /r/[uuid] (no AppShell, no Sidebar) ──────────────
  <PublicReportView>                    # REPORT-CONSUMER
    <PublicReportHeader>
      <ReportTitle />
      <PublishedAt />
    </PublicReportHeader>
    <PublicReportBody>
      <ReportSectionBlock />            # × N (read-only render)
    </PublicReportBody>
    <PublicReportFooter>
      <PoweredByBadge />
    </PublicReportFooter>
  </PublicReportView>

</App>
```

-----

-----

# 4. Screen Specifications

-----

## 4.1 APP-SHELL — Application Shell

**Stitch reference:** STEP 2 — App Shell & Navigation  
**Route:** Wraps all authenticated routes

### Layout

```
+--w-60-fixed-sidebar--+--flex-1-main-content--------------------+
| bg-[#0f2123]         | bg-[#0F1117]                            |
|                      |                                         |
| AppLogo              |  <router-outlet />                      |
|  "Rendara"          |                                         |
|  cyan wordmark       |                                         |
|                      |                                         |
| NavRail              |                                         |
|  Conversations ←     |                                         |
|  Dashboards          |                                         |
|  Reports             |                                         |
|                      |                                         |
| ──────────────────── |                                         |
| ConvHistoryPanel     |                                         |
|  (scrollable list)   |                                         |
|                      |                                         |
| ──────────────────── |                                         |
| McpStatusBar         |                                         |
|  ● SQL Analytics     |                                         |
+----------------------+-----------------------------------------+
```

### Components

|Component                 |Props / Behaviour                                                                        |
|--------------------------|-----------------------------------------------------------------------------------------|
|`AppLogo`                 |Text “Rendara” in `font-mono`, accent `#00D4FF`. Links to `/`                           |
|`NavRail`                 |Vertical stack of `NavItem`. Active item: left border `#00D4FF`, bg `surface-hover`      |
|`NavItem`                 |`icon: LucideIcon`, `label: string`, `href: string`, `active: boolean`                   |
|`ConversationHistoryPanel`|Scrollable list of `ConversationListItem`. Grouped by Today / Yesterday / Older          |
|`McpStatusBar`            |Bottom of sidebar. Row of `McpServerBadge` per server. Clickable → opens `McpStatusPanel`|

### State

- Active nav item derived from current route
- Conversation list loaded from `GET /api/conversations` on mount, refreshed after each `message_complete` event

-----

## 4.2 HOME — New Conversation Home

**Stitch reference:** STEP 3 — New Conversation Home Screen  
**Route:** `/`

### Layout

```
+--------------------------------------------------+
|  (sidebar present, see APP-SHELL)                |
|                                                  |
|            [vertical center of viewport]         |
|                                                  |
|              [AssistantAvatar 32px]               |
|                                                  |
|   Rendara                                        |
|   (large cyan wordmark, 48px)                    |
|                                                  |
|   "What would you like to explore today?"        |
|   (subtitle, text-gray-400, 18px)                |
|                                                  |
|   ┌──────────────────────────────────────────┐   |
|   │  Ask anything about your data...   [→]  │   |
|   └──────────────────────────────────────────┘   |
|   ConversationInput (full-width up to max-w-2xl) |
|                                                  |
|   ┌──────────┐ ┌──────────┐ ┌──────────┐        |
|   │ Chip 1   │ │ Chip 2   │ │ Chip 3   │        |
|   └──────────┘ └──────────┘ └──────────┘        |
|   ┌──────────┐                                   |
|   │ Chip 4   │                                   |
|   └──────────┘                                   |
|   SuggestedPromptsGrid (flex-wrap)               |
|                                                  |
+--------------------------------------------------+
```

### Components

|Component             |Props / Behaviour                                                                                                    |
|----------------------|---------------------------------------------------------------------------------------------------------------------|
|`AssistantAvatar`     |32px circle, cyan gradient bg, “AI” monogram. Centered above HomeTitle. Subtle pulsing glow animation via framer-motion.|
|`HomeHero`            |Centred layout div. `HomeTitle` + `HomeSubtitle` stacked                                                             |
|`HomeTitle`           |”Rendara” — `text-5xl font-bold text-[#00D4FF] font-mono`                                                           |
|`HomeSubtitle`        |“What would you like to explore today?” — `text-lg text-gray-400`                                                    |
|`ConversationInput`   |Full spec in §5.9. `onSubmit` → `POST /api/chat/stream` with `new_conversation: true`, then navigate to `/c/[new_id]`|
|`SuggestedPromptsGrid`|`flex flex-wrap gap-2`. Renders 4 `SuggestedPromptChip`                                                              |
|`SuggestedPromptChip` |Full spec in §5.10. Pre-populated with the 4 demo prompts from Appendix E.9 of SDD                                   |

### Pre-populated suggested prompts (from SDD Appendix E.10.5)

1. “What were total sales by region last quarter, ranked highest to lowest?”
1. “Which products are our top 5 revenue generators this year?”
1. “How does this month’s revenue compare to the same month last year?”
1. “Show me the breakdown of sales by customer segment and region”

### Interactions

- Clicking a `SuggestedPromptChip` populates `ConversationInput` and auto-submits
- Submit → create new conversation → navigate to `/c/[id]` → stream begins

-----

## 4.3 CONV-ACTIVE — Active Conversation (Text Response)

**Stitch reference:** STEP 4 — Active Conversation Screen  
**Route:** `/c/[id]`

### Layout

```
+--------------------------------------------------+
|  ConversationHeader                              |
|  "Q4 Sales Analysis"        [Share] [...]        |
+--------------------------------------------------+
|  (scrollable MessageList, flex-col, gap-6)       |
|                                                  |
|  USER MESSAGE (right-aligned)                    |
|  ┌──────────────────────────────────┐            |
|  │ What were total sales by region? │            |
|  └──────────────────────────────────┘            |
|                                        [avatar]  |
|                                                  |
|  ASSISTANT MESSAGE (left-aligned)                |
|  [avatar]                                        |
|  ┌──────────────────────────────────────┐        |
|  │ Here is the regional breakdown for  │        |
|  │ Q4 2024. AMER led with $1.84M...    │        |
|  └──────────────────────────────────────┘        |
|  [copy] [regenerate] [pin]  ← MessageActionBar   |
|                                                  |
|  StreamingTypingIndicator (while streaming)      |
|                                                  |
+--------------------------------------------------+
|  ConversationInputArea (sticky bottom)           |
|  ┌──────────────────────────────────────────┐   |
|  │  Follow up on your data...         [→]   │   |
|  └──────────────────────────────────────────┘   |
+--------------------------------------------------+
```

### Components

|Component                 |Props / Behaviour                                                                       |
|--------------------------|----------------------------------------------------------------------------------------|
|`ConversationHeader`      |`title: string`. Sticky top, `bg-[#0F1117]/80 backdrop-blur`. Edit title inline on click|
|`ConversationTitle`       |Editable `<span>` via `contentEditable`. On blur → `PATCH /api/conversations/[id]`      |
|`UserMessageBubble`       |Right-aligned. `bg-[#1A1D27]` rounded-2xl. `max-w-[75%]`                                |
|`AssistantAvatar`         |32px circle, cyan gradient, “AI” monogram. Left-aligned                                 |
|`AssistantMessageBubble`  |Left-aligned, no background (transparent against #0F1117). `max-w-3xl`                  |
|`MarkdownTextBlock`       |Renders markdown via `react-markdown` + `rehype-highlight`. Full spec §5                |
|`StreamingTypingIndicator`|Full spec §5.11. Visible during `STREAMING` state                                       |
|`MessageActionBar`        |Full spec §5.7. Appears below each completed assistant message                          |
|`ConversationInputArea`   |Sticky bottom wrapper. Contains `ConversationInput`                                     |

### Scroll behaviour

- MessageList auto-scrolls to bottom during streaming (`scrollIntoView` on each `text_delta`)
- User can scroll up freely; auto-scroll resumes when user scrolls back to bottom
- Input area is `sticky bottom-0` with `backdrop-blur`

-----

## 4.4 CONV-CHART — Active Conversation (Chart Response)

**Stitch reference:** STEP 5 — Conversation with Chart Response  
**Route:** `/c/[id]` (visual state of CONV-ACTIVE)

This screen state is identical to CONV-ACTIVE with the addition of `VizChartBlock` and `ToolCallIndicator` inside the assistant message bubble.

### Message bubble content (in stream order)

```
AssistantMessageBubble:
  ┌─────────────────────────────────────────────┐
  │ ToolCallIndicator                           │
  │ ✓ SQL Analytics (Demo) · execute_query      │
  │   "4 rows returned · 143ms"                 │
  ├─────────────────────────────────────────────┤
  │ MarkdownTextBlock                           │
  │ "Here's the Q4 2024 regional breakdown:"    │
  ├─────────────────────────────────────────────┤
  │ VizChartBlock                               │
  │ ┌─────────────────────────────────────────┐ │
  │ │  [bar chart — Q4 2024 Revenue by Region]│ │
  │ │  h-64 inline, full bubble width         │ │
  │ │                           [↗ expand]    │ │
  │ │                           [pin ↗]       │ │
  │ └─────────────────────────────────────────┘ │
  ├─────────────────────────────────────────────┤
  │ MarkdownTextBlock                           │
  │ "AMER leads at **$1.84M**, outperforming..."│
  └─────────────────────────────────────────────┘
  MessageActionBar: [copy] [regenerate] [pin all]
```

### Components added vs CONV-ACTIVE

|Component          |Notes                                                                                                         |
|-------------------|--------------------------------------------------------------------------------------------------------------|
|`ToolCallIndicator`|Full spec §5.4. Rendered once per tool call in the message. Shows server name, tool name, status, duration    |
|`VizChartBlock`    |Full spec §5.2. `h-64` inline. Expand button top-right. Pin button below expand button                        |
|`ExpandOverlay`    |Full spec §5.13. Portalled fullscreen overlay. Triggered by expand button on any VizChartBlock or MermaidBlock|

### Expand interaction

- Click `[↗ expand]` on `VizChartBlock` → `ExpandOverlay` opens with full-width chart (`h-[70vh]`)
- `ExpandOverlay` has: close button (top-right × ), chart title, `PinButton`, optional caption
- Backdrop click closes overlay
- ESC key closes overlay
- Chart re-renders at full overlay dimensions (Recharts `ResponsiveContainer` handles this automatically)

-----

## 4.5 CONV-MULTI — Active Conversation (Multi-Visualisation Response)

**Stitch reference:** STEP 6 — Multi-Visualisation Response  
**Route:** `/c/[id]` (visual state)

When the LLM produces multiple viz blocks in a single response, they render in a `MultiVizCard` — a 2-column grid within the message bubble.

### Message bubble content

```
AssistantMessageBubble:
  ┌─────────────────────────────────────────────┐
  │ ToolCallIndicator (completed)               │
  ├─────────────────────────────────────────────┤
  │ MarkdownTextBlock                           │
  │ "Here's a full picture of Q4 performance:" │
  ├─────────────────────────────────────────────┤
  │ MultiVizCard                                │
  │ ┌───────────────┬─────────────────────────┐ │
  │ │ VizChartBlock │ VizChartBlock           │ │
  │ │ (bar, h-48)   │ (line, h-48)            │ │
  │ │ [↗] [pin]     │ [↗] [pin]               │ │
  │ ├───────────────┴─────────────────────────┤ │
  │ │ VizChartBlock (pie, h-48, full width)   │ │
  │ │ [↗] [pin]                               │ │
  │ └─────────────────────────────────────────┘ │
  ├─────────────────────────────────────────────┤
  │ MarkdownTextBlock (analysis narrative)      │
  └─────────────────────────────────────────────┘
  MessageActionBar: [copy] [regenerate] [pin all]
```

### MultiVizCard layout rules

- 2 charts: `grid-cols-2`, each `h-48`
- 3 charts: `grid-cols-2`, first two in row 1, third spans full width in row 2
- 4 charts: `grid-cols-2 grid-rows-2`, each `h-48`
- More than 4: scroll horizontally within `MultiVizCard` (rare — system prompt limits to 3)

### Components added vs CONV-CHART

|Component     |Notes                                                          |
|--------------|---------------------------------------------------------------|
|`MultiVizCard`|Full spec §5.5. Grid wrapper for multiple `VizChartBlock` items|

-----

## 4.6 PIN-MODAL — Pin to Dashboard Modal

**Stitch reference:** STEP 7 — Pin to Dashboard Modal  
**Route:** Overlay on `/c/[id]`

Triggered by `PinButton` on any `VizChartBlock`, `MermaidBlock`, or `MessageActionBar`.

### Layout

```
+-- Modal overlay (centered, max-w-md) -----------+
|                                           [×]   |
|  Pin to Dashboard                               |
|                                                 |
|  ┌─── Content preview ───────────────────────┐  |
|  │  [thumbnail of the chart or diagram]      │  |
|  └───────────────────────────────────────────┘  |
|                                                 |
|  Select dashboard                               |
|  ┌─────────────────────────────────────────┐   |
|  │  Q4 Performance          [select]       │   |
|  │  Executive Summary       [select]       │   |
|  │  + Create new dashboard                 │   |
|  └─────────────────────────────────────────┘   |
|                                                 |
|  Add a note (optional)                          |
|  ┌─────────────────────────────────────────┐   |
|  │  Strong AMER performance...             │   |
|  └─────────────────────────────────────────┘   |
|                                                 |
|  [Cancel]                    [Pin to Dashboard] |
+--------------------------------------------------+
```

### Components

|Component                |Props / Behaviour                                                                             |
|-------------------------|----------------------------------------------------------------------------------------------|
|`PinModal`               |`blockContent: ContentBlock`, `blockType: string`. Controlled by `usePinModal()` Zustand slice|
|`ContentPreviewThumbnail`|Renders a small (h-32) non-interactive preview of the block being pinned                      |
|`DashboardSelectList`    |Lists all dashboards from `GET /api/dashboards`. Radio selection                              |
|`CreateDashboardInline`  |Inline text input to create a new dashboard and immediately select it                         |
|`PinNoteInput`           |Optional textarea for the analyst annotation (max 200 chars)                                  |

### Interactions

- “Pin to Dashboard” → `POST /api/dashboards/[id]/pins` → success toast → modal closes
- “Create new dashboard” → `POST /api/dashboards` → new dashboard appears in list, auto-selected
- Cancel → modal closes, no action

-----

## 4.7 DASH-INDEX — Dashboards Index

**Stitch reference:** STEP 8 — Dashboards Index Screen  
**Route:** `/dashboards`

### Layout

```
+--------------------------------------------------+
|  Dashboards                    [+ New Dashboard] |
|  ──────────────────────────────────────────────  |
|                                                  |
|  ┌──────────────┐ ┌──────────────┐              |
|  │ DashboardCard│ │ DashboardCard│              |
|  │              │ │              │              |
|  │ [chart mini] │ │ [chart mini] │              |
|  │ Q4 Perf.     │ │ Exec Summary │              |
|  │ 4 pins       │ │ 7 pins       │              |
|  │ 2h ago       │ │ yesterday    │              |
|  └──────────────┘ └──────────────┘              |
|                                                  |
|  EmptyState (when no dashboards)                 |
+--------------------------------------------------+
```

### Components

|Component               |Props / Behaviour                                                                                                                                               |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`DashboardCard`         |`id`, `title`, `pinCount`, `updatedAt`. `grid-cols-2 lg:grid-cols-3`. Hover: slight lift with `framer-motion whileHover`. Click → navigate to `/dashboards/[id]`|
|`DashboardCardThumbnail`|Non-interactive mini chart preview (first pinned viz, if any). `h-32 rounded-lg overflow-hidden pointer-events-none`                                            |
|`EmptyState`            |Full spec §5.18. Variant: `dashboards`                                                                                                                          |

-----

## 4.8 DASH-DETAIL — Dashboard Detail View

**Stitch reference:** STEP 9 — Dashboard Detail View  
**Route:** `/dashboards/[id]`

### Layout

```
+--------------------------------------------------+
|  ← Back   [Dashboard Title — editable]  [+ Add] |
|  ──────────────────────────────────────────────  |
|                                                  |
|  ┌──────────────────────┐ ┌────────────────────┐ |
|  │  DashboardPinCard    │ │  DashboardPinCard  │ |
|  │                      │ │                    │ |
|  │  [chart, h-48]       │ │  [diagram, h-48]   │ |
|  │  "Q4 Revenue by      │ │  "Sales flow"      │ |
|  │   Region"            │ │                    │ |
|  │  note: "Strong AMER" │ │                    │ |
|  │  [↗] [unpin] [drag]  │ │  [↗] [unpin] [=]  │ |
|  └──────────────────────┘ └────────────────────┘ |
|                                                  |
|  EmptyState (when no pins)                       |
+--------------------------------------------------+
```

### Components

|Component         |Props / Behaviour                                                                |
|------------------|---------------------------------------------------------------------------------|
|`DashboardTitle`  |Editable inline. `contentEditable`, blur → PATCH                                 |
|`DashboardPinCard`|Full spec §5.14. Drag-to-reorder via `framer-motion` drag                        |
|`DragHandle`      |`=` icon on each card. Activates drag reorder mode                               |
|`UnpinButton`     |Trash icon. Click → confirm popover → `DELETE /api/dashboards/[id]/pins/[pin_id]`|
|`EmptyState`      |Variant: `dashboard-detail` — “Pin insights from your conversations”             |

### Reorder behaviour

- Drag-and-drop via `framer-motion` layout animations
- On drop: `PATCH /api/dashboards/[id]/pins/reorder` with new `pin_ids` array

-----

## 4.9 REPORT-INDEX — Reports Index

**Stitch reference:** STEP 10 — Reports Index Screen  
**Route:** `/reports`

### Layout

```
+--------------------------------------------------+
|  Reports                          [+ New Report] |
|  ──────────────────────────────────────────────  |
|                                                  |
|  ┌──────────────┐ ┌──────────────┐              |
|  │  ReportCard  │ │  ReportCard  │              |
|  │              │ │              │              |
|  │ Q4 Sales     │ │ Exec Brief   │              |
|  │ Report       │ │              │              |
|  │ 3 sections   │ │ 2 sections   │              |
|  │ Published ✓  │ │ Draft        │              |
|  └──────────────┘ └──────────────┘              |
|                                                  |
|  EmptyState (when no reports)                    |
+--------------------------------------------------+
```

### Components

|Component       |Props / Behaviour                                                                             |
|----------------|----------------------------------------------------------------------------------------------|
|`ReportCard`    |`id`, `title`, `sectionCount`, `isPublished`, `updatedAt`. Hover lift. Click → `/reports/[id]`|
|`PublishedBadge`|Small `#00D4FF` pill “Published”. Shown when `public_uuid` is set                             |
|`DraftBadge`    |Small gray pill “Draft”                                                                       |
|`EmptyState`    |Variant: `reports` — “Build your first data story”                                            |

-----

## 4.10 REPORT-BUILDER — Report Story Builder

**Stitch reference:** STEP 11 — Report Story Builder  
**Route:** `/reports/[id]`

### Layout

```
+--------------------------------------------------+
|  ← Back   [Report Title — editable]  [Publish ↗]|
|  ──────────────────────────────────────────────  |
|                                                  |
|  ┌── ReportCanvas (max-w-3xl centered) ────────┐ |
|  │                                             │ |
|  │  ReportSectionBlock (heading)               │ |
|  │  "Q4 2024 Sales Performance"                │ |
|  │                                             │ |
|  │  ReportSectionBlock (text)                  │ |
|  │  "Regional performance improved..."         │ |
|  │                                             │ |
|  │  ReportSectionBlock (viz_chart)             │ |
|  │  [bar chart inline, h-64]                   │ |
|  │  [↗ expand]                                 │ |
|  │                                             │ |
|  │  [+ Add Section] button                     │ |
|  └─────────────────────────────────────────────┘ |
|                                                  |
+--------------------------------------------------+
```

### Components

|Component             |Props / Behaviour                                                             |
|----------------------|------------------------------------------------------------------------------|
|`ReportTitle`         |Editable inline, blur → `PUT /api/reports/[id]`                               |
|`PublishButton`       |Full spec §5.15                                                               |
|`ReportCanvas`        |Scrollable `max-w-3xl mx-auto` column of `ReportSectionBlock` items           |
|`ReportSectionBlock`  |Full spec §5.14. Editable in builder context                                  |
|`AddSectionButton`    |`+ Add Section` — opens section type picker: Heading / Text / Insert from Pins|
|`PinnedInsightsPicker`|Slide-over panel listing all pins. Drag or click to insert into canvas        |
|`ExpandOverlay`       |Same component as in conversation view — charts expand inline                 |

-----

## 4.11 REPORT-CONSUMER — Public Report Consumer View

**Stitch reference:** STEP 12 — Report Consumer View  
**Route:** `/r/[uuid]` — no AppShell, no sidebar, full-width

### Layout

```
+--------------------------------------------------+
|  PublicReportHeader                              |
|  Rendara logo (small, left)    Published: date  |
|  ──────────────────────────────────────────────  |
|                                                  |
|  PublicReportBody (max-w-3xl mx-auto)            |
|                                                  |
|  ReportSectionBlock (heading, read-only)         |
|  "Q4 2024 Sales Performance Report"              |
|                                                  |
|  ReportSectionBlock (text, read-only)            |
|  "Regional performance improved..."             |
|                                                  |
|  ReportSectionBlock (viz_chart, read-only)       |
|  [bar chart, inline, h-64]                       |
|  [↗ expand]   ← expand still works in consumer  |
|                                                  |
|  ReportSectionBlock (mermaid, read-only)         |
|  [diagram, inline]                               |
|  [↗ expand]                                      |
|                                                  |
|  PublicReportFooter                              |
|  "Powered by Rendara" (subtle, centered)        |
+--------------------------------------------------+
```

### Components

|Component           |Props / Behaviour                                                                                |
|--------------------|-------------------------------------------------------------------------------------------------|
|`PublicReportHeader`|`AppLogo` (small variant) left. `PublishedAt` right. No navigation.                              |
|`PublicReportBody`  |Read-only render of `ReportSectionBlock` items. Data loaded from `GET /api/reports/public/[uuid]`|
|`ReportSectionBlock`|`readOnly: true` prop — no edit controls, no drag handles                                        |
|`ExpandOverlay`     |Same component as conversation view — charts still expand                                        |
|`PublicReportFooter`|`text-gray-600 text-sm text-center`. “Powered by Rendara”                                       |

### Data loading

- SSR via Next.js `generateStaticParams` not used (content changes too frequently)
- Client-side: `useEffect` → `GET /api/reports/public/[uuid]` on mount
- Loading state: skeleton placeholders for each section
- 404: custom “Report not found” empty state

-----

## 4.12 MCP-STATUS — MCP Server Status Panel

**Stitch reference:** Referenced in STEP 2 (App Shell) and STEP 4 (Active Conversation)  
**Route:** Slide-over panel triggered from `McpStatusBar` in sidebar

### Layout

```
+-- Slide-over panel (right edge of sidebar, w-72) --+
|                                              [×]   |
|  MCP Servers                                       |
|  ─────────────────────────────────────────────     |
|                                                    |
|  ● SQL Analytics (Demo)      Connected             |
|    3 tools available                               |
|    get_semantic_model_schema                       |
|    generate_query                                  |
|    execute_query                                   |
|    Last used: 2 min ago                            |
|                                                    |
|  ○ Power BI                  Disconnected          |
|    Not configured                                  |
|                                                    |
+----------------------------------------------------+
```

### Components

|Component        |Props / Behaviour                                                                   |
|-----------------|------------------------------------------------------------------------------------|
|`McpStatusPanel` |Slide-over from left sidebar. `framer-motion` slide-in. `McpServerDetail` per server|
|`McpServerDetail`|`name`, `status: connected/disconnected/error`, `tools: string[]`, `lastUsedAt`     |
|`McpServerBadge` |Compact version used in `McpStatusBar`. Coloured dot + server name                  |

-----

-----

# 5. Custom Component Specifications

Every component listed here is custom-built on top of assistant-ui primitives and shadcn/ui. Stock shadcn components (Button, Dialog, Textarea, etc.) are used directly without specification.

-----

## 5.1 assistant-ui Extension Architecture

assistant-ui exposes three extension points used by this application:

### 5.1.1 Generative UI Content Block Map

`viz_block` and `mermaid_block` are modeled as tool calls and rendered via `makeAssistantToolUI`:

```typescript
// app/components/chat/tool-uis.tsx
import { makeAssistantToolUI } from "@assistant-ui/react";
import { VizChartBlock } from "./VizChartBlock";
import { MermaidBlock } from "./MermaidBlock";
import { ToolCallIndicator } from "./ToolCallIndicator";

// Viz blocks rendered as tool call UIs
export const VizChartToolUI = makeAssistantToolUI({
  toolName: "viz_block",
  render: ({ args, result, status }) => (
    <VizChartBlock spec={result} status={status} />
  ),
});

export const MermaidToolUI = makeAssistantToolUI({
  toolName: "mermaid_block",
  render: ({ args, result, status }) => (
    <MermaidBlock definition={result} status={status} />
  ),
});

// Tool call indicators use assistant-ui's built-in status mapping:
// tool_call_start  → status.type = "running"
// tool_call_result → status.type = "complete"
// tool_call_error  → status.type = "incomplete"
```

### 5.1.2 Custom SSE Adapter

assistant-ui’s `useEdgeRuntime` is replaced with a custom adapter using `useLocalRuntime` + `ChatModelAdapter` that consumes the FastAPI SSE stream:

```typescript
// app/lib/rendara-adapter.ts
import { ChatModelAdapter, useLocalRuntime } from "@assistant-ui/react";

const rendaraAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // Consumes FastAPI SSE stream at /api/chat/stream
    // Parses SSE events and accumulates content array
    // Each yield replaces the entire content state — assistant-ui diffs internally
    // viz_block → modeled as tool call with toolName "viz_block"
    // mermaid_block → modeled as tool call with toolName "mermaid_block"
    // tool_call_start/result/error → mapped to tool call status
    // text_delta → accumulated into text content parts
    // message_complete → final yield
    yield { content: [...accumulatedContent] };
  },
};

export function useRendaraRuntime() {
  return useLocalRuntime(rendaraAdapter);
}
```

### 5.1.3 Thread Runtime Hooks Used

|Hook|Used By|Purpose|
|---|---|---|
|`useLocalRuntime`|App root|Create runtime from ChatModelAdapter|
|`AssistantRuntimeProvider`|App root|Provide runtime to component tree|
|`makeAssistantToolUI`|VizChartBlock, MermaidBlock|Register custom tool call renderers|
|`MessagePrimitive.Parts`|AssistantMessage|Render content parts with custom components|

-----

## 5.2 VizChartBlock

**Renders inline Recharts charts from viz_block SSE events. Supports click-to-expand (Option C).**

### Props

```typescript
interface VizChartBlockProps {
  spec: {
    type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'composed';
    title: string;
    data: Record<string, string | number>[];
    xKey: string;
    yKey: string;
    y2Key?: string;  // composed only
  };
  blockId: string;
  inlineHeight?: number;   // default: 256 (h-64)
  showPinButton?: boolean; // default: true
  readOnly?: boolean;      // true in PublicReportView
}
```

### Visual Anatomy

```
┌─ VizChartBlock ─────────────────────────────────────────────┐
│  Chart Title (text-sm text-gray-400 mb-2)                   │
│  ┌─ chart area (ResponsiveContainer h-64) ─────────────────┐│
│  │                                                          ││
│  │  [Recharts BarChart / LineChart / etc.]                  ││
│  │  - XAxis: text-xs text-gray-500                          ││
│  │  - YAxis: text-xs text-gray-500                          ││
│  │  - Grid: stroke="#2A2D3E"                                ││
│  │  - Bar/Line fill: accent colours (see §6)                ││
│  │  - Tooltip: custom ChartTooltip component                ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                              [↗] [pin ↗]     │
└──────────────────────────────────────────────────────────────┘
```

### Recharts Colour Palette (dark theme)

|Series index|Colour                 |
|------------|-----------------------|
|0 (primary) |`#00D4FF` (accent cyan)|
|1           |`#7C3AED` (violet)     |
|2           |`#10B981` (emerald)    |
|3           |`#F59E0B` (amber)      |
|4           |`#EF4444` (red)        |

### Sub-components

|Sub-component   |Description                                                                                                                           |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------|
|`ChartTooltip`  |Custom Recharts tooltip. `bg-[#1A1D27] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm`. Formats numbers with `Intl.NumberFormat`|
|`ExpandButton`  |`↗` icon button, top-right corner of chart area. `onClick → openExpand(blockId, spec)`                                                |
|`ChartPinButton`|Bookmark icon, bottom-right. `onClick → openPinModal(blockId, 'viz_chart', spec)`                                                     |

### Expand behaviour

- `ExpandButton` click → dispatches to `useExpandStore` (Zustand)
- `ExpandOverlay` (§5.13) responds and renders the same spec at `h-[70vh]`
- Chart re-renders at new dimensions via `ResponsiveContainer width="100%" height="100%"`

### Chart type dispatch

```typescript
function renderChart(spec: VizSpec) {
  switch (spec.type) {
    case 'bar':      return <BarChartRenderer spec={spec} />;
    case 'line':     return <LineChartRenderer spec={spec} />;
    case 'area':     return <AreaChartRenderer spec={spec} />;
    case 'pie':      return <PieChartRenderer spec={spec} />;
    case 'scatter':  return <ScatterChartRenderer spec={spec} />;
    case 'composed': return <ComposedChartRenderer spec={spec} />;
  }
}
```

### Loading / error states

|State                            |Render                                                           |
|---------------------------------|-----------------------------------------------------------------|
|Streaming (partial spec)         |Skeleton placeholder `h-64 animate-pulse bg-[#1A1D27] rounded-xl`|
|Invalid spec (skipped by backend)|Nothing rendered (DR-07 — skip and continue)                     |
|Recharts render error            |ErrorBoundary → `"Chart unavailable"` text in `text-gray-500`    |

-----

## 5.3 MermaidBlock

**Renders Mermaid.js diagrams inline from mermaid_block SSE events.**

### Props

```typescript
interface MermaidBlockProps {
  definition: string;
  blockId: string;
  showPinButton?: boolean; // default: true
  readOnly?: boolean;
}
```

### Visual Anatomy

```
┌─ MermaidBlock ──────────────────────────────────────────────┐
│  ┌─ diagram area (w-full, min-h-[200px]) ─────────────────┐ │
│  │                                                         │ │
│  │  [rendered SVG from mermaid.render()]                   │ │
│  │  dark theme (see §8.3 of SDD)                           │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                               [↗] [pin ↗]    │
└──────────────────────────────────────────────────────────────┘
```

### Rendering approach

```typescript
useEffect(() => {
  if (!definition) return;
  const id = `mermaid-${blockId}`;
  mermaid.render(id, definition).then(({ svg }) => {
    containerRef.current.innerHTML = svg;
  }).catch(() => {
    // mermaid renders its own error SVG — no custom error needed
  });
}, [definition, blockId]);
```

### Expand behaviour

Identical to `VizChartBlock` expand. `ExpandOverlay` renders the SVG at full overlay width. Mermaid re-renders at new dimensions.

-----

## 5.4 ToolCallIndicator

**Inline indicator within the assistant message bubble showing MCP tool call status.**

### Props

```typescript
interface ToolCallIndicatorProps {
  toolCallId: string;
  toolName: string;
  serverName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  durationMs?: number;
  resultSummary?: string;
  errorMessage?: string;
}
```

### Visual States

```
PENDING / RUNNING:
┌─────────────────────────────────────────────────┐
│  ⟳  SQL Analytics (Demo) · execute_query        │
│     Querying data...                             │
└─────────────────────────────────────────────────┘
bg-[#1A1D27], border-l-2 border-[#00D4FF]
spinning Loader2 icon (animate-spin)

COMPLETE:
┌─────────────────────────────────────────────────┐
│  ✓  SQL Analytics (Demo) · execute_query        │
│     4 rows returned · 143ms                     │
└─────────────────────────────────────────────────┘
border-l-2 border-[#10B981] (green)
CheckCircle2 icon

ERROR:
┌─────────────────────────────────────────────────┐
│  ✕  SQL Analytics (Demo) · execute_query        │
│     SQL validation failed: DML detected         │
└─────────────────────────────────────────────────┘
border-l-2 border-[#EF4444] (red)
XCircle icon
```

### Style

- Container: `rounded-lg px-3 py-2 text-sm font-mono`
- Server name: `text-gray-400`
- Tool name: `text-[#00D4FF]`
- Status line: `text-xs text-gray-500 mt-0.5`
- Transitions: `framer-motion` animate status icon swap (not layout)

### State transitions

- `tool_call_start` event → renders in `running` state
- `tool_call_result` event → transitions to `complete` (icon swap animation, ~200ms)
- `tool_call_error` event → transitions to `error`
- The `tool_call_id` is the key that links start → result/error to the same component instance

-----

## 5.5 MultiVizCard

**Grid wrapper for multiple VizChartBlock items in a single assistant message.**

### Props

```typescript
interface MultiVizCardProps {
  children: React.ReactNode; // VizChartBlock instances
  count: number;
}
```

### Layout logic

```typescript
function getGridClass(count: number): string {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-2';  // third spans full width
  return 'grid-cols-2';                   // 4+ in 2x2
}
```

For 3-chart layout, the third child receives `col-span-2` automatically:

```typescript
React.Children.map(children, (child, i) => (
  <div className={count === 3 && i === 2 ? 'col-span-2' : ''}>
    {child}
  </div>
))
```

### Style

- `grid gap-3 p-3 bg-[#1A1D27] rounded-xl`
- Each child `VizChartBlock` uses `inlineHeight={192}` (h-48) when inside `MultiVizCard`

-----

## 5.6 KpiScorecardBlock

**Renders a row of KPI metric cards when the LLM produces a `type: "kpi"` viz spec.**

The system prompt instructs the LLM to use `type: "kpi"` when returning 2–5 standalone metric values (not time-series). This is the scorecard pattern seen in BI tools.

### Extended viz spec for KPI type

```json
{
  "type": "kpi",
  "title": "Q4 2024 Key Metrics",
  "data": [
    { "label": "Total Revenue", "value": 4664361, "format": "currency", "trend": "+12%", "trendDirection": "up" },
    { "label": "Orders", "value": 8420, "format": "number", "trend": "+8%", "trendDirection": "up" },
    { "label": "Avg Order Value", "value": 553.96, "format": "currency", "trend": "-3%", "trendDirection": "down" }
  ]
}
```

### Visual Anatomy

```
┌─ KpiScorecardBlock ──────────────────────────────────────┐
│  Q4 2024 Key Metrics                                     │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ Total Revenue  │ │ Orders         │ │ Avg Order    │ │
│  │ $4.66M         │ │ 8,420          │ │ Value        │ │
│  │ ↑ +12%         │ │ ↑ +8%          │ │ $553.96      │ │
│  │                │ │                │ │ ↓ -3%        │ │
│  └────────────────┘ └────────────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Style

- Grid: `grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3`
- Each card: `bg-[#1A1D27] rounded-xl p-4`
- Label: `text-xs text-gray-400 uppercase tracking-wide`
- Value: `text-2xl font-bold text-white mt-1`
- Trend up: `text-[#10B981] text-sm` with `TrendingUp` icon
- Trend down: `text-[#EF4444] text-sm` with `TrendingDown` icon

-----

## 5.7 MessageActionBar

**Action row below each completed assistant message.**

### Props

```typescript
interface MessageActionBarProps {
  messageId: string;
  hasVizBlocks: boolean;    // shows "pin all" if true
  onCopy: () => void;
  onRegenerate: () => void;
  onPinAll: () => void;     // opens PIN-MODAL for first viz block
}
```

### Visual Anatomy

```
[copy ⎘]  [regenerate ↺]  [pin all ↗]
```

- `text-gray-500 hover:text-gray-300`
- `text-xs` with icon (16px) + label
- Rendered below the message bubble with `mt-2 flex gap-3`
- “pin all” button only shown when `hasVizBlocks: true`

### Copy behaviour

- `onCopy`: copies all text content from the message to clipboard
- Success: button briefly shows `✓ Copied` for 1500ms (Framer Motion text swap)

### Regenerate behaviour

- `onRegenerate`: calls `DELETE /api/messages/[id]` then re-submits the last user message
- Shows loading spinner on button during regeneration

-----

## 5.8 PinButton

**Standalone pin button that appears on VizChartBlock and MermaidBlock.**

### Props

```typescript
interface PinButtonProps {
  blockId: string;
  blockType: 'viz_chart' | 'mermaid' | 'text';
  blockContent: unknown;  // the spec or definition
  size?: 'sm' | 'md';    // default: sm
}
```

### Visual

- `Bookmark` icon (Lucide), 16px
- `text-gray-500 hover:text-[#00D4FF] transition-colors`
- Tooltip: “Pin to dashboard”
- Click → opens `PinModal` with pre-populated `blockContent`

-----

## 5.9 ConversationInput

**The primary text input used on HOME and in CONV-ACTIVE.**

### Props

```typescript
interface ConversationInputProps {
  placeholder: string;
  onSubmit: (message: string) => void;
  disabled?: boolean;        // true while streaming
  initialValue?: string;     // used when SuggestedPromptChip populates it
  autoFocus?: boolean;
}
```

### Visual Anatomy

```
┌─────────────────────────────────────────── [→] ─┐
│  Ask anything about your data...                 │
└──────────────────────────────────────────────────┘
```

- Container: `bg-[#1A1D27] border border-[#2A2D3E] rounded-2xl`
- Focus ring: `focus-within:border-[#00D4FF] focus-within:ring-1 focus-within:ring-[#00D4FF]/30`
- Textarea: auto-resize, min 1 row, max 6 rows (`react-textarea-autosize`)
- Submit button: `bg-[#00D4FF] text-[#0F1117] rounded-xl p-2` — ArrowUp icon (Lucide)
- Submit button disabled (gray) while `disabled: true`
- `Enter` submits. `Shift+Enter` adds newline.
- Disabled state: `opacity-50 cursor-not-allowed` while streaming

-----

## 5.10 SuggestedPromptChip

**Clickable prompt suggestion chips on the HOME screen.**

### Props

```typescript
interface SuggestedPromptChipProps {
  label: string;         // truncated display text (max ~40 chars visible)
  fullPrompt: string;    // full prompt text submitted on click
  onClick: (prompt: string) => void;
}
```

### Visual

- `bg-[#1A1D27] border border-[#2A2D3E] rounded-full px-4 py-2 text-sm text-gray-300`
- Hover: `border-[#00D4FF]/50 text-white bg-[#1A1D27]`
- `Sparkles` icon (Lucide, 14px) prepended, `text-[#00D4FF]`
- Click: populates `ConversationInput` and auto-submits

-----

## 5.11 StreamingTypingIndicator

**Animated dots shown while the assistant is streaming a response.**

### Props

```typescript
interface StreamingTypingIndicatorProps {
  visible: boolean;
}
```

### Visual

Three dots animating in sequence (wave pattern):

```
  ●  ●  ●
```

- Each dot: `w-2 h-2 rounded-full bg-[#00D4FF]`
- Animation: `framer-motion` staggered `scaleY` bounce, 600ms cycle
- Positioned below the last message in the thread
- Fades in/out with `AnimatePresence`

### Visibility logic

- Visible: `STREAMING` state (text_delta events arriving) OR `TOOL_CALLING` state
- Hidden: `IDLE`, `COMPLETE`, `ERROR` states

-----

## 5.12 McpServerBadge

**Compact server status indicator in the sidebar McpStatusBar.**

### Props

```typescript
interface McpServerBadgeProps {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  onClick: () => void;  // opens McpStatusPanel
}
```

### Visual

```
  ●  SQL Analytics
```

- Dot: 8px circle. Green `#10B981` (connected), gray `#6B7280` (disconnected), red `#EF4444` (error)
- Label: `text-xs text-gray-400 truncate max-w-[150px]`
- Hover: `text-gray-200`
- Entire row clickable → `McpStatusPanel` slide-over

-----

## 5.13 ExpandOverlay

**Full-screen overlay for expanded chart or diagram view (Option C core component).**

### Props

```typescript
interface ExpandOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  blockType: 'viz_chart' | 'mermaid';
  blockContent: VizSpec | string;  // spec or mermaid definition
  title: string;
  blockId: string;
  showPinButton?: boolean;
}
```

### Visual Anatomy

```
┌─── ExpandOverlay (fixed inset-0, z-50) ──────────────────┐
│  backdrop: bg-black/80 backdrop-blur-sm                   │
│                                                           │
│  ┌─ content panel (max-w-5xl mx-auto, mt-16) ──────────┐ │
│  │  bg-[#1A1D27] rounded-2xl p-8                       │ │
│  │                                                     │ │
│  │  [Chart Title]                    [pin ↗]  [× close]│ │
│  │                                                     │ │
│  │  ┌─ chart/diagram area (w-full h-[70vh]) ─────────┐ │ │
│  │  │                                                │ │ │
│  │  │  VizChartBlock or MermaidBlock                 │ │ │
│  │  │  rendered at full overlay dimensions           │ │ │
│  │  │                                                │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Behaviour

- Opens via `useExpandStore.open(blockId, blockType, blockContent, title)`
- `framer-motion` scale + fade in: `initial={{ opacity: 0, scale: 0.95 }}, animate={{ opacity: 1, scale: 1 }}`
- Backdrop click → close
- `Escape` key → close (global keydown listener while open)
- `PinButton` in overlay: same behaviour as inline pin button
- Portal: rendered via `ReactDOM.createPortal` at `document.body`
- Scroll lock on body while open (`overflow-hidden` on `<html>`)

-----

## 5.14 DashboardPinCard

**Displays a pinned insight block on the Dashboard Detail view. Also used (read-only) in Report sections.**

### Props

```typescript
interface DashboardPinCardProps {
  pin: {
    id: string;
    blockType: 'viz_chart' | 'mermaid' | 'text';
    blockContent: unknown;
    note?: string;
    position: number;
  };
  onUnpin?: () => void;       // undefined in read-only contexts
  draggable?: boolean;        // default: true in DASH-DETAIL
  readOnly?: boolean;         // true in REPORT-CONSUMER
}
```

### Visual Anatomy

```
┌─ DashboardPinCard ───────────────────────────────────┐
│  ┌─ content area ─────────────────────────────────┐  │
│  │  VizChartBlock (h-48, showPinButton=false)     │  │
│  │  or MermaidBlock                               │  │
│  │                            [↗ expand]          │  │
│  └────────────────────────────────────────────────┘  │
│  "Strong AMER performance — share with leadership"   │
│  (note text, text-xs text-gray-400 mt-2 italic)      │
│                              [= drag]  [unpin 🗑]    │
└──────────────────────────────────────────────────────┘
```

- Container: `bg-[#1A1D27] border border-[#2A2D3E] rounded-xl overflow-hidden`
- Note: shown only if non-empty
- Drag handle: `GripVertical` icon (Lucide). Activates `framer-motion` drag
- Unpin: `Trash2` icon. Click → `AlertDialog` confirmation → DELETE API call

-----

## 5.15 ReportSectionBlock

**A single content block in the Report Builder canvas or Public Report Consumer.**

### Props

```typescript
interface ReportSectionBlockProps {
  section: {
    id: string;
    type: 'heading' | 'text' | 'viz_chart' | 'mermaid';
    level?: 1 | 2 | 3;           // heading only
    text?: string;                // heading or text
    markdown?: string;            // text blocks
    spec?: VizSpec;               // viz_chart
    definition?: string;          // mermaid
  };
  readOnly: boolean;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}
```

### Heading block

- `type: 'heading'`, `level: 1|2|3`
- Editable `contentEditable` span in builder mode
- `text-3xl font-bold text-white` (h1), `text-2xl font-semibold` (h2), `text-xl font-medium` (h3)

### Text block

- `type: 'text'`
- Rich text via `contentEditable` in builder, `react-markdown` in consumer
- `text-gray-300 leading-relaxed`

### Viz chart block

- `type: 'viz_chart'`
- `VizChartBlock` with `readOnly={readOnly}` and `inlineHeight={256}`
- In builder: `showPinButton=false` (already pinned), show delete/reorder controls
- In consumer: `showPinButton=false`, `readOnly=true`

### Mermaid block

- `type: 'mermaid'`
- `MermaidBlock` with `readOnly={readOnly}`

### Builder mode controls

```
[↑ move up]  [↓ move down]  [delete 🗑]
```

Shown on hover in builder mode. Hidden in consumer mode.

-----

## 5.16 PublishButton

**Publishes a report and displays the shareable link.**

### Props

```typescript
interface PublishButtonProps {
  reportId: string;
  isPublished: boolean;
  publicUrl?: string;
}
```

### States

|State                |Visual                                                                                        |
|---------------------|----------------------------------------------------------------------------------------------|
|Draft (not published)|`[↗ Publish]` — primary button, `bg-[#00D4FF] text-[#0F1117]`                                 |
|Publishing (loading) |`[⟳ Publishing...]` — disabled, spinner                                                       |
|Published            |`[✓ Published]` + copy-link icon — `bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30`|

### Publish flow

1. Click `[↗ Publish]`
1. `POST /api/reports/[id]/publish` → receives `{ public_url }`
1. Button transitions to Published state
1. `Popover` opens showing the public URL with a copy button
1. Copy button: copies URL to clipboard, shows `✓ Copied` for 1500ms

-----

## 5.17 ConversationListItem

**A single conversation in the sidebar history panel.**

### Props

```typescript
interface ConversationListItemProps {
  id: string;
  title: string;
  updatedAt: string;
  isActive: boolean;
}
```

### Visual

```
  Q4 Sales Analysis                    2h ago
```

- Full-width row, `px-3 py-2 rounded-lg cursor-pointer`
- Active: `bg-[#1A1D27] text-white border-l-2 border-[#00D4FF]`
- Inactive hover: `hover:bg-[#1A1D27]/50 text-gray-400 hover:text-gray-200`
- Title: `text-sm truncate`
- Time: `text-xs text-gray-500 ml-auto shrink-0`
- Click → navigate to `/c/[id]`

### Grouping

Conversations grouped with `text-xs text-gray-600 uppercase tracking-wide px-3 py-1` labels:

- “Today”
- “Yesterday”
- “Last 7 days”
- “Older”

-----

## 5.18 EmptyState

**Contextual empty state shown when a list has no items.**

### Props

```typescript
interface EmptyStateProps {
  variant: 'conversations' | 'dashboards' | 'dashboard-detail' |
           'reports' | 'report-builder';
  onAction?: () => void;
}
```

### Variants

|Variant           |Icon             |Title                 |Subtitle                                                  |CTA                  |
|------------------|-----------------|----------------------|----------------------------------------------------------|---------------------|
|`conversations`   |`MessageSquare`  |“Start a conversation”|“Ask anything about your data”                            |—                    |
|`dashboards`      |`LayoutDashboard`|“No dashboards yet”   |“Pin insights from your conversations to build dashboards”|“New Dashboard”      |
|`dashboard-detail`|`Pin`            |“Nothing pinned yet”  |“Pin charts and insights from your conversations”         |“Go to Conversations”|
|`reports`         |`FileText`       |“No reports yet”      |“Build a data story from your pinned insights”            |“New Report”         |
|`report-builder`  |`PlusCircle`     |“Start building”      |“Add sections or insert from your pinned insights”        |“Add Section”        |

### Visual

- Centred in the content area
- Icon: 48px, `text-gray-600`
- Title: `text-xl font-semibold text-gray-400 mt-4`
- Subtitle: `text-sm text-gray-500 mt-2 max-w-xs text-center`
- CTA: shadcn `Button` variant `outline` if provided

-----

-----

# 6. Design Token Reference

All tokens are implemented as Tailwind CSS custom properties in `tailwind.config.ts` and as CSS custom properties in `app/globals.css`.

## 6.1 Colour Tokens

|Token Name      |Hex        |Tailwind Class             |Usage                                                  |
|----------------|-----------|---------------------------|-------------------------------------------------------|
|`background`    |`#0F1117`  |`bg-background`            |App background, sidebar                                |
|`surface`       |`#1A1D27`  |`bg-surface`               |Cards, message bubbles, inputs                         |
|`surface-hover` |`#22263A`  |`bg-surface-hover`         |Hover state for surface elements                       |
|`border`        |`#2A2D3E`  |`border-border`            |All borders, dividers                                  |
|`accent`        |`#00D4FF`  |`text-accent` / `bg-accent`|Primary accent, CTAs, active nav, chart primary series |
|`accent-muted`  |`#00D4FF1A`|`bg-accent-muted`          |Accent at 10% opacity — hover states, subtle highlights|
|`text-primary`  |`#E8EAED`  |`text-primary`             |Primary body text                                      |
|`text-secondary`|`#9AA0B0`  |`text-secondary`           |Secondary labels, metadata                             |
|`text-muted`    |`#6B7280`  |`text-muted`               |Placeholder text, group labels                         |
|`success`       |`#10B981`  |`text-success`             |Tool call complete, trend up, published badge          |
|`error`         |`#EF4444`  |`text-error`               |Tool call error, trend down                            |
|`warning`       |`#F59E0B`  |`text-warning`             |Chart series 3                                         |
|`violet`        |`#7C3AED`  |`text-violet`              |Chart series 1                                         |

## 6.2 Tailwind Config Extension

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:    '#0F1117',
        surface:       '#1A1D27',
        'surface-hover': '#22263A',
        border:        '#2A2D3E',
        accent:        '#00D4FF',
        'accent-muted':'#00D4FF1A',
        success:       '#10B981',
        error:         '#EF4444',
        warning:       '#F59E0B',
        violet:        '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      maxWidth: {
        'conversation': '768px',   // max-w-3xl equivalent, named for clarity
        'content':      '1024px',  // max-w-5xl equivalent
      },
    },
  },
};
export default config;
```

## 6.3 Typography Scale

|Element                     |Class                  |Size|Weight|
|----------------------------|-----------------------|----|------|
|Page title                  |`text-3xl font-bold`   |30px|700   |
|Section heading             |`text-xl font-semibold`|20px|600   |
|Card title                  |`text-base font-medium`|16px|500   |
|Body text                   |`text-sm`              |14px|400   |
|Caption / label             |`text-xs`              |12px|400   |
|Monospace (tool names, code)|`font-mono text-sm`    |14px|400   |

## 6.4 Spacing and Radius

|Token         |Value |Used For                                     |
|--------------|------|---------------------------------------------|
|`rounded-lg`  |8px   |Buttons, tool indicators, small cards        |
|`rounded-xl`  |16px  |Charts, KPI cards, input field               |
|`rounded-2xl` |16px  |Message bubbles, modals, overlays            |
|`rounded-full`|999px |Prompt chips, badges, avatar                 |
|`gap-3`       |12px  |Grid gaps, flex gaps within cards            |
|`gap-6`       |24px  |Message list gap                             |
|`p-4`         |16px  |Standard card padding                        |
|`p-8`         |32px  |Overlay panel padding                        |
|`px-3 py-2`   |12/8px|Compact component padding (chips, indicators)|

## 6.5 Elevation / Shadow

Dark themes use border-based depth rather than shadows:

|Level  |Style                                |Elements                     |
|-------|-------------------------------------|-----------------------------|
|Level 0|No border                            |Background regions           |
|Level 1|`border border-border`               |Cards, inputs, panels        |
|Level 2|`border border-border` + `bg-surface`|Modals, overlays             |
|Level 3|`border border-accent/30`            |Focused inputs, active states|

No `box-shadow` values are used. Depth is conveyed through background colour contrast.

-----

-----

# 7. Interaction and Animation Specification

All animations use `framer-motion`. No CSS transitions for layout changes.

## 7.1 Page Transitions

Route changes animate with a fade + slight vertical slide:

```typescript
// app/components/PageTransition.tsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15 } },
};
```

## 7.2 Message Appearance

Each new message (user or assistant) animates in:

```typescript
const messageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
```

## 7.3 Content Block Appearance (inline)

`VizChartBlock` and `MermaidBlock` animate in when first rendered inside a streaming message:

```typescript
const blockVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};
```

## 7.4 ToolCallIndicator Status Transition

When `tool_call_result` or `tool_call_error` arrives, the status icon swaps:

```typescript
// Icon AnimatePresence key-swap
<AnimatePresence mode="wait">
  <motion.div
    key={status}  // key change triggers exit + enter
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.15 }}
  >
    {statusIcon}
  </motion.div>
</AnimatePresence>
```

## 7.5 ExpandOverlay Open / Close

```typescript
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

const panelVariants = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
};
```

## 7.6 PinModal Open / Close

```typescript
const modalVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};
```

## 7.7 Sidebar ConversationListItem Hover

```typescript
// framer-motion whileHover on each list item
whileHover={{ x: 2, transition: { duration: 0.1 } }}
```

## 7.8 DashboardCard Hover Lift

```typescript
whileHover={{
  y: -3,
  boxShadow: '0 8px 24px rgba(0, 212, 255, 0.08)',
  transition: { duration: 0.2 }
}}
```

## 7.9 StreamingTypingIndicator Animation

```typescript
const dotVariants = {
  animate: {
    scaleY: [1, 1.8, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Three dots with staggered delay:
// dot 0: delay 0s
// dot 1: delay 0.15s
// dot 2: delay 0.3s
```

## 7.10 SuggestedPromptChip Tap

```typescript
whileTap={{ scale: 0.97 }}
```

## 7.11 Toast Notifications

shadcn/ui `Sonner` toast provider. Used for:

|Event           |Toast type                       |Message                                  |
|----------------|---------------------------------|-----------------------------------------|
|Pin saved       |Success                          |“Pinned to [Dashboard Name]”             |
|Report published|Success                          |“Report published — link copied”         |
|API error       |Error                            |“Something went wrong. Please try again.”|
|Copy success    |None (inline button state change)|—                                        |

Toast config: `position="bottom-right"`, dark theme, 3000ms duration.

-----

-----

# 8. assistant-ui Integration Contract

This section defines exactly how assistant-ui is configured and extended. It is the contract between the chat runtime and the custom components.

## 8.1 Runtime Configuration

```typescript
// app/providers/AssistantProvider.tsx

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useRendaraRuntime } from '@/lib/useRendaraRuntime';

export function AssistantProvider({
  conversationId,
  children,
}: {
  conversationId: string;
  children: React.ReactNode;
}) {
  const runtime = useRendaraRuntime(conversationId);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

## 8.2 Custom SSE Runtime Hook

```typescript
// app/lib/useRendaraRuntime.ts

import { useLocalRuntime, type ChatModelAdapter } from '@assistant-ui/react';

const RendaraAdapter: ChatModelAdapter = {
  async run({ messages, abortSignal, onUpdate }) {
    const lastUserMessage = messages[messages.length - 1];
    const conversationId = /* from context */;

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: lastUserMessage.content,
      }),
      signal: abortSignal,
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    const contentBlocks: ContentBlock[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n').filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6));

        switch (event.type) {
          case 'text_delta':
            textBuffer += event.delta;
            onUpdate({
              content: [
                ...contentBlocks,
                { type: 'text', text: textBuffer },
              ],
            });
            break;

          case 'viz_block':
            // Flush text buffer as a completed block
            if (textBuffer) {
              contentBlocks.push({ type: 'text', text: textBuffer });
              textBuffer = '';
            }
            contentBlocks.push({
              type: 'viz_block',
              blockId: event.block_id,
              spec: event.spec,
            });
            onUpdate({ content: [...contentBlocks] });
            break;

          case 'mermaid_block':
            if (textBuffer) {
              contentBlocks.push({ type: 'text', text: textBuffer });
              textBuffer = '';
            }
            contentBlocks.push({
              type: 'mermaid_block',
              blockId: event.block_id,
              definition: event.definition,
            });
            onUpdate({ content: [...contentBlocks] });
            break;

          case 'tool_call_start':
            contentBlocks.push({
              type: 'tool_call',
              toolCallId: event.tool_call_id,
              toolName: event.tool_name,
              serverName: event.server_name,
              status: 'running',
            });
            onUpdate({ content: [...contentBlocks] });
            break;

          case 'tool_call_result':
          case 'tool_call_error': {
            const idx = contentBlocks.findIndex(
              b => b.type === 'tool_call' && b.toolCallId === event.tool_call_id
            );
            if (idx >= 0) {
              contentBlocks[idx] = {
                ...contentBlocks[idx],
                status: event.type === 'tool_call_result' ? 'complete' : 'error',
                durationMs: event.duration_ms,
                resultSummary: event.result_summary,
                errorMessage: event.error_message,
              };
              onUpdate({ content: [...contentBlocks] });
            }
            break;
          }

          case 'message_complete':
            // Final flush of any remaining text
            if (textBuffer) {
              contentBlocks.push({ type: 'text', text: textBuffer });
            }
            onUpdate({ content: contentBlocks });
            break;

          case 'error':
            throw new Error(event.error_message);
        }
      }
    }
  },
};

export function useRendaraRuntime(conversationId: string) {
  return useLocalRuntime(RendaraAdapter);
}
```

## 8.3 Content Part Renderer Registration

```typescript
// app/components/chat/MessageRenderer.tsx

import {
  ContentPartPrimitive,
  useContentPart,
} from '@assistant-ui/react';
import { VizChartBlock } from './VizChartBlock';
import { MermaidBlock } from './MermaidBlock';
import { ToolCallIndicator } from './ToolCallIndicator';

export function MessageContentRenderer() {
  const part = useContentPart();

  switch (part.type) {
    case 'text':
      return <MarkdownTextBlock text={part.text} />;
    case 'viz_block':
      return <VizChartBlock spec={part.spec} blockId={part.blockId} />;
    case 'mermaid_block':
      return <MermaidBlock definition={part.definition} blockId={part.blockId} />;
    case 'tool_call':
      return (
        <ToolCallIndicator
          toolCallId={part.toolCallId}
          toolName={part.toolName}
          serverName={part.serverName}
          status={part.status}
          durationMs={part.durationMs}
          resultSummary={part.resultSummary}
          errorMessage={part.errorMessage}
        />
      );
    default:
      return null;
  }
}
```

## 8.4 Thread Primitive Structure

```tsx
// app/components/chat/ConversationView.tsx

<ThreadPrimitive.Root>
  <ThreadPrimitive.Viewport>
    <ThreadPrimitive.Messages
      components={{
        UserMessage: UserMessageComponent,
        AssistantMessage: AssistantMessageComponent,
      }}
    />
    <ThreadPrimitive.If running>
      <StreamingTypingIndicator visible />
    </ThreadPrimitive.If>
  </ThreadPrimitive.Viewport>

  <ThreadPrimitive.Composer>
    <ConversationInput
      placeholder="Follow up on your data..."
      onSubmit={handleSubmit}
      disabled={isStreaming}
    />
  </ThreadPrimitive.Composer>
</ThreadPrimitive.Root>
```

## 8.5 Global State Stores (Zustand)

Three Zustand stores support cross-component state:

### `useExpandStore`

```typescript
interface ExpandStore {
  isOpen: boolean;
  blockId: string | null;
  blockType: 'viz_chart' | 'mermaid' | null;
  blockContent: unknown;
  title: string;
  open: (blockId: string, blockType: string, content: unknown, title: string) => void;
  close: () => void;
}
```

### `usePinStore`

```typescript
interface PinStore {
  isOpen: boolean;
  blockId: string | null;
  blockType: string | null;
  blockContent: unknown;
  openPin: (blockId: string, blockType: string, content: unknown) => void;
  closePin: () => void;
}
```

### `useMcpStore`

```typescript
interface McpStore {
  servers: McpServerStatus[];
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  updateServerStatus: (name: string, status: McpServerStatus) => void;
}
```

## 8.6 Component File Structure

```
app/
├── (shell)/                          # Route group with AppShell layout
│   ├── layout.tsx                    # AppShell (sidebar + main content)
│   ├── page.tsx                      # HOME screen
│   ├── c/
│   │   └── [id]/
│   │       └── page.tsx              # CONV-ACTIVE / CONV-CHART / CONV-MULTI
│   ├── dashboards/
│   │   ├── page.tsx                  # DASH-INDEX
│   │   └── [id]/
│   │       └── page.tsx              # DASH-DETAIL
│   └── reports/
│       ├── page.tsx                  # REPORT-INDEX
│       └── [id]/
│           └── page.tsx              # REPORT-BUILDER
├── r/
│   └── [uuid]/
│       └── page.tsx                  # REPORT-CONSUMER (no AppShell)
├── components/
│   ├── shell/
│   │   ├── AppLogo.tsx
│   │   ├── NavRail.tsx
│   │   ├── NavItem.tsx
│   │   ├── ConversationHistoryPanel.tsx
│   │   ├── ConversationListItem.tsx
│   │   ├── McpStatusBar.tsx
│   │   ├── McpServerBadge.tsx
│   │   └── McpStatusPanel.tsx
│   ├── chat/
│   │   ├── ConversationHeader.tsx
│   │   ├── ConversationInput.tsx
│   │   ├── ConversationView.tsx
│   │   ├── MessageContentRenderer.tsx
│   │   ├── UserMessage.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── MarkdownTextBlock.tsx
│   │   ├── StreamingTypingIndicator.tsx
│   │   ├── MessageActionBar.tsx
│   │   ├── SuggestedPromptChip.tsx
│   │   ├── SuggestedPromptsGrid.tsx
│   │   └── HomeHero.tsx
│   ├── viz/
│   │   ├── VizChartBlock.tsx
│   │   ├── VizChartBlock.types.ts
│   │   ├── BarChartRenderer.tsx
│   │   ├── LineChartRenderer.tsx
│   │   ├── AreaChartRenderer.tsx
│   │   ├── PieChartRenderer.tsx
│   │   ├── ScatterChartRenderer.tsx
│   │   ├── ComposedChartRenderer.tsx
│   │   ├── KpiScorecardBlock.tsx
│   │   ├── ChartTooltip.tsx
│   │   └── MultiVizCard.tsx
│   ├── mermaid/
│   │   └── MermaidBlock.tsx
│   ├── tools/
│   │   └── ToolCallIndicator.tsx
│   ├── overlays/
│   │   ├── ExpandOverlay.tsx
│   │   └── PinModal.tsx
│   ├── dashboard/
│   │   ├── DashboardCard.tsx
│   │   ├── DashboardPinCard.tsx
│   │   ├── DashboardPinGrid.tsx
│   │   └── DashboardCardThumbnail.tsx
│   ├── report/
│   │   ├── ReportCard.tsx
│   │   ├── ReportCanvas.tsx
│   │   ├── ReportSectionBlock.tsx
│   │   ├── PublishButton.tsx
│   │   ├── AddSectionButton.tsx
│   │   └── PinnedInsightsPicker.tsx
│   └── shared/
│       ├── EmptyState.tsx
│       ├── PinButton.tsx
│       ├── ExpandButton.tsx
│       ├── PageHeader.tsx
│       └── PageTransition.tsx
├── lib/
│   ├── useRendaraRuntime.ts
│   ├── api.ts                        # typed fetch wrappers for all REST endpoints
│   └── format.ts                     # Intl.NumberFormat helpers
├── stores/
│   ├── useExpandStore.ts
│   ├── usePinStore.ts
│   └── useMcpStore.ts
└── providers/
    ├── AssistantProvider.tsx
    └── ToastProvider.tsx
```