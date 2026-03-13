# Business Requirements Document

## Business Data Analyst AI Agent UI

-----

**Document Version:** 1.0  
**Status:** Draft  
**Date:** March 2026  
**Classification:** Confidential

-----

## Table of Contents

1. Executive Summary
1. Product Vision & Objectives
1. Stakeholder & User Personas
1. Product Architecture
1. Technical Stack
1. Functional Requirements — MVP (Phase 1)
1. Functional Requirements — MVP Complete (Phase 1.5)
1. Functional Requirements — Post MVP (Phase 2)
1. Screen Specifications
1. Component Architecture
1. Data Architecture
1. API & Integration Specifications
1. Non-Functional Requirements
1. MVP Demo Acceptance Criteria
1. Phased Delivery Roadmap
1. Open Questions & Risks

-----

## 1. Executive Summary

This document defines the requirements for a **Business Data Analyst AI Agent UI** — a next-generation, AI-powered data analysis and storytelling platform. The product enables business analysts and executives to have rich, intelligent conversations with an AI agent that queries live data sources, generates interactive visualisations, and compiles findings into shareable narrative reports.

The immediate goal is a **polished, demo-ready MVP** for a stakeholder presentation. The midterm goal is a **scalable B2B SaaS platform** serving multiple enterprise clients.

### Product Summary

|Attribute                |Value                                           |
|-------------------------|------------------------------------------------|
|Product Type             |AI-powered Data Analysis & Storytelling Platform|
|Primary Interaction Model|Conversational AI chat with inline rich content |
|Target Market            |MVP: Single client / demo. Midterm: B2B SaaS    |
|Platform                 |Responsive Web (desktop-first, tablet-ready)    |
|AI Provider              |OpenRouter (model-agnostic, configurable)       |
|Data Connectivity        |MCP (Model Context Protocol) servers            |
|Immediate Milestone      |Stakeholder demo — next week                    |

-----

## 2. Product Vision & Objectives

### Vision Statement

> *A world where any business analyst can have an intelligent conversation with their data, generate publication-quality insights in minutes, and share compelling data stories with any stakeholder — without writing a single line of SQL or building a single dashboard manually.*

### Core Value Proposition

The product sits at the intersection of three capabilities that no single existing tool combines:

1. **Conversational AI Analysis** — natural language queries against live business data via MCP
1. **Rich Inline Visualisation** — charts, diagrams and KPI cards rendered directly in the conversation thread
1. **Narrative Storytelling** — AI-generated insights compiled into shareable, publication-quality reports

### Strategic Objectives

|Objective                                 |MVP           |Midterm SaaS|
|------------------------------------------|--------------|------------|
|Validate core AI analysis experience      |✅ Primary     |—           |
|Demonstrate dual persona value proposition|✅ Primary     |—           |
|Multi-tenant B2B platform                 |❌ Out of scope|✅ Primary   |
|Enterprise authentication & permissions   |❌ Out of scope|✅ Primary   |
|Revenue generation                        |❌ Out of scope|✅ Primary   |

-----

## 3. Stakeholder & User Personas

### Primary Persona 1 — The Business Data Analyst (Builder)

|Attribute               |Detail                                                                                                               |
|------------------------|---------------------------------------------------------------------------------------------------------------------|
|Role                    |Data Analyst, Business Intelligence Analyst, Data Scientist                                                          |
|Technical Level         |Medium-high. Comfortable with SQL, familiar with BI tools                                                            |
|Primary Goal            |Explore data, generate insights, build analytical narratives                                                         |
|Key Pain Points         |Slow query cycles, context switching between tools, manual chart building, time-consuming report writing             |
|How They Use the Product|Ask natural language questions, iterate on analysis in conversation, pin best insights to dashboards, compile reports|
|Success Metric          |Time from question to shareable insight reduced from hours to minutes                                                |

### Primary Persona 2 — The Business Stakeholder / Executive (Consumer)

|Attribute               |Detail                                                                                           |
|------------------------|-------------------------------------------------------------------------------------------------|
|Role                    |C-Suite, VP, Director, Business Unit Manager                                                     |
|Technical Level         |Low. Does not write queries or build dashboards                                                  |
|Primary Goal            |Understand business performance, make decisions from data                                        |
|Key Pain Points         |Waiting for analyst reports, static PDFs, lack of context in dashboards                          |
|How They Use the Product|Receives a shared report link, reads the narrative, reviews visualisations, understands the story|
|Success Metric          |Insight consumption time and decision confidence                                                 |

### Key Relationship Between Personas

```
Analyst (Builder Mode)          Stakeholder (Consumer Mode)
        |                                   |
        | 1. Asks AI questions              |
        | 2. Iterates on analysis           |
        | 3. Pins insights to dashboard     |
        | 4. Compiles narrative report      |
        | 5. Shares public link ----------> | 6. Reads report
        |                                   | 7. Views visualisations
        |                                   | 8. Makes decisions
```

-----

## 4. Product Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ Chat Interface│  │Dashboard Views │  │ Report Consumer │  │
│  │ (assistant-ui)│  │  (Custom React)│  │  (Public Route) │  │
│  └──────────────┘  └────────────────┘  └─────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST + SSE Streaming
┌─────────────────────────────▼───────────────────────────────┐
│                  BACKEND (FastAPI / Python)                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              AI Agent Orchestration Layer                │ │
│  │  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │ │
│  │  │OpenRouter API│  │  MCP Client    │  │  Response   │ │ │
│  │  │  (LLM calls) │  │ (Tool calling) │  │  Streaming  │ │ │
│  │  └──────────────┘  └────────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼───────────────────────────┐
│   OpenRouter API    │  │         MCP Servers                 │
│  ┌───────────────┐  │  │  ┌──────────┐  ┌────────────────┐  │
│  │ Claude Sonnet │  │  │  │ Power BI │  │   Databricks   │  │
│  │ GPT-4.1       │  │  │  │   MCP    │  │   Genie MCP    │  │
│  │ Gemini 2.5    │  │  │  └──────────┘  └────────────────┘  │
│  │ + any model   │  │  │  ┌──────────────────────────────┐  │
│  └───────────────┘  │  │  │     Custom Database MCPs      │  │
└─────────────────────┘  │  └──────────────────────────────┘  │
                         └────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  PERSISTENCE (Supabase)                      │
│         Conversation History | Dashboards | Reports          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 MCP Architecture Principle

**Critical Architectural Decision:** The application is stateless with respect to business data. The AI agent never stores, caches or owns source data. All data queries are executed at request time via MCP tool calls. Results exist only in the rendered chat response.

```
User Query
    ↓
AI Agent receives query
    ↓
Agent decides which MCP tool to call
    ↓
MCP server executes query against data source
    ↓
Results returned to agent
    ↓
Agent synthesises results into mixed-format response
    ↓
Response rendered in chat (Markdown + Mermaid + Charts)
    ↓
Source data NEVER stored in application
```

### 4.3 AI Response Format Architecture

The LLM returns a single streaming response containing a mix of content types rendered sequentially:

|Content Type        |Format                 |Renderer                       |
|--------------------|-----------------------|-------------------------------|
|Narrative text      |Markdown               |react-markdown via assistant-ui|
|Data diagrams       |Mermaid syntax         |mermaid.js (dark themed)       |
|Interactive charts  |JSON viz specification |Recharts component library     |
|Process flows       |Mermaid syntax         |mermaid.js (dark themed)       |
|Tool call indicators|assistant-ui ToolCallUI|Built-in assistant-ui component|
|KPI metrics         |JSON viz specification |Custom KPIChips component      |

**Example response stream:**

```
[Markdown: "Here is the Q4 revenue analysis..."]
[ToolCall: querying Power BI MCP for revenue data]
[JSON Viz: {type: "bar", data: [...], config: {...}}]
[Markdown: "The key findings are..."]
[Mermaid: flowchart showing revenue breakdown]
[Markdown: "Recommended actions..."]
```

-----

## 5. Technical Stack

### 5.1 Complete Technology Stack

|Layer             |Technology                                  |Justification                                                                           |
|------------------|--------------------------------------------|----------------------------------------------------------------------------------------|
|Frontend Framework|Next.js 14+ (TypeScript)                    |Full-stack capability, SSR for report consumer views, API routes, React ecosystem       |
|Chat Interface    |assistant-ui                                |Purpose-built for AI chat, Generative UI for mixed content, streaming, tool call display|
|UI Components     |shadcn/ui + Radix UI                        |Headless, fully accessible, Tailwind themeable, no vendor lock-in                       |
|Styling           |Tailwind CSS                                |Single dark theme token config shared across all components                             |
|Data Visualisation|Recharts                                    |React-native, TypeScript, dark-themeable, covers core business chart types              |
|Diagram Rendering |Mermaid.js                                  |Full diagram type support, LLM selects optimal type per context                         |
|Animations        |Framer Motion                               |Micro-animations, streaming effects, transitions                                        |
|Backend Framework |FastAPI (Python)                            |Async, fast, production-proven, excellent MCP SDK support                               |
|AI Model Provider |OpenRouter                                  |Model-agnostic abstraction, access to all major LLMs, single API                        |
|MCP Integration   |MCP Python SDK                              |Reference implementation, best-in-class tool calling support                            |
|Persistence       |SQLite                                      |Lightweight, zero-config, file-based, sufficient for MVP                                |
|Deployment        |Vercel (frontend) + Railway/Render (backend)|Fast deployment, scalable, demo-ready                                                   |

### 5.2 Configuration Architecture

For MVP, all system configuration is managed via a single JSON config file. No configuration UI is required.

**config.json structure:**

```json
{
  "ai": {
    "provider": "openrouter",
    "apiKey": "sk-or-...",
    "defaultModel": "anthropic/claude-sonnet-4-5",  // configurable — any OpenRouter-supported model ID
    "maxTokens": 4096,
    "temperature": 0.3
  },
  "mcpServers": [
    {
      "name": "Power BI",
      "type": "powerbi",
      "endpoint": "https://your-powerbi-mcp.com/sse",
      "description": "Company Power BI reports and datasets"
    },
    {
      "name": "Databricks",
      "type": "databricks-genie",
      "endpoint": "https://your-databricks-mcp.com/sse",
      "description": "Databricks data warehouse queries"
    },
    {
      "name": "Sales Database",
      "type": "custom",
      "endpoint": "https://your-custom-mcp.com/sse",
      "description": "CRM and sales transaction data"
    }
  ],
  "app": {
    "name": "Rendara",
    "theme": "dark",
    "enableSharing": true
  }
}
```

-----

## 6. Functional Requirements — MVP Phase 1

*These requirements must be complete and demo-quality for the stakeholder presentation.*

### 6.1 App Shell & Navigation

|ID    |Requirement                                                                                     |Priority   |
|------|------------------------------------------------------------------------------------------------|-----------|
|NAV-01|Fixed left sidebar 240px wide with main content area filling remaining width                    |Must Have  |
|NAV-02|App logo and product name displayed at top of sidebar                                           |Must Have  |
|NAV-03|Three primary navigation sections: Conversations, Dashboards, Reports — each with icon and label|Must Have  |
|NAV-04|Active navigation item indicated by cyan left border accent and subtle cyan-tinted background   |Must Have  |
|NAV-05|Recent conversations list in sidebar showing truncated title and relative timestamp             |Must Have  |
|NAV-06|Full-width “New Conversation” pill-shaped cyan button in sidebar                                |Must Have  |
|NAV-07|User settings area at sidebar bottom                                                            |Should Have|
|NAV-08|Responsive layout scaling correctly to tablet viewport                                          |Should Have|

### 6.2 New Conversation / Home Screen

|ID     |Requirement                                                         |Priority   |
|-------|--------------------------------------------------------------------|-----------|
|HOME-01|Vertically centred content when no conversation is active           |Must Have  |
|HOME-02|AI agent avatar (32px circle, cyan gradient, "AI" monogram) with subtle cyan glow animation|Must Have  |
|HOME-03|Large headline: “What would you like to analyse today?”             |Must Have  |
|HOME-04|Full-width chat input bar with placeholder text and cyan send button|Must Have  |
|HOME-05|Row of 4 suggested prompt chips with icons and example questions    |Must Have  |
|HOME-06|Suggested chips display cyan border glow on hover                   |Should Have|
|HOME-07|Clicking a suggested prompt populates the input bar                 |Must Have  |

### 6.3 Active Conversation — Core Chat Thread

|ID     |Requirement                                                                   |Priority |
|-------|------------------------------------------------------------------------------|---------|
|CHAT-01|Scrollable message thread centred in canvas, max-width 780px                  |Must Have|
|CHAT-02|Fixed chat input bar at bottom of screen at all times                         |Must Have|
|CHAT-03|User message bubbles right-aligned, pill-shaped, surface background           |Must Have|
|CHAT-04|AI response cards left-aligned, elevated dark surface, cyan left border accent|Must Have|
|CHAT-05|Streaming text animation as AI response generates token by token              |Must Have|
|CHAT-06|Auto-scroll to latest message as response streams                             |Must Have|
|CHAT-07|Tool call indicator displayed when MCP server is being queried                |Must Have|
|CHAT-08|Tool call indicator shows MCP server name and animated cyan pulse             |Must Have|
|CHAT-09|Tool call indicator resolves to completion checkmark when query returns       |Must Have|
|CHAT-10|Conversation history persisted to SQLite across sessions                    |Must Have|
|CHAT-11|New conversation clears thread and resets to home screen                      |Must Have|

### 6.4 AI Response — Mixed Content Rendering

|ID     |Requirement                                                                                        |Priority   |
|-------|---------------------------------------------------------------------------------------------------|-----------|
|RESP-01|Markdown rendered correctly within AI response cards (headings, bold, italic, bullet lists, tables)|Must Have  |
|RESP-02|Mermaid diagrams rendered inline within AI response cards                                          |Must Have  |
|RESP-03|Mermaid diagrams styled with dark theme (charcoal background, cyan accents)                        |Must Have  |
|RESP-04|LLM selects appropriate Mermaid diagram type based on data context                                 |Must Have  |
|RESP-05|JSON viz specifications rendered as interactive Recharts components                                |Must Have  |
|RESP-06|All Recharts components styled with dark theme and cyan/teal palette                               |Must Have  |
|RESP-07|Multiple content types can appear in a single AI response card in sequence                         |Must Have  |
|RESP-08|Recommended action callout box with cyan left border rendered from Markdown blockquote             |Should Have|

### 6.5 AI Response — Action Toolbar

|ID    |Requirement                                                                     |Priority |
|------|--------------------------------------------------------------------------------|---------|
|ACT-01|Action toolbar displayed at bottom of every AI response card                    |Must Have|
|ACT-02|Toolbar contains: Pin to Dashboard, Add to Report, Copy, Regenerate icon buttons|Must Have|
|ACT-03|Toolbar buttons ghost style, grey default, cyan glow on hover                   |Must Have|
|ACT-04|Copy action copies full response text to clipboard                              |Must Have|
|ACT-05|Regenerate action resends the last user message to the AI                       |Must Have|

### 6.6 Data Visualisation — Chart Components

|ID    |Requirement                                                                            |Priority   |
|------|---------------------------------------------------------------------------------------|-----------|
|VIZ-01|Bar chart component (vertical and horizontal variants)                                 |Must Have  |
|VIZ-02|Line chart component with gradient fill                                                |Must Have  |
|VIZ-03|Area chart component                                                                   |Must Have  |
|VIZ-04|Pie and donut chart component                                                          |Must Have  |
|VIZ-05|KPI scorecard component showing metric, label, trend arrow                             |Must Have  |
|VIZ-06|KPI trend arrows: emerald for positive, amber for negative                             |Must Have  |
|VIZ-07|Scatter plot component                                                                 |Should Have|
|VIZ-08|All charts use consistent dark theme: charcoal background, cyan primary, teal secondary|Must Have  |
|VIZ-09|Chart titles bold white, axis labels cool grey, grid lines near-invisible              |Must Have  |
|VIZ-10|Expand to fullscreen button on all chart components                                    |Should Have|
|VIZ-11|Loading skeleton state for charts while MCP data is fetching                           |Must Have  |
|VIZ-12|Multi-viz card layout: 2x2 grid of chart panels in a single response card              |Must Have  |
|VIZ-13|KPI scorecard component showing 2-5 standalone metric cards with label, value, format, trend arrow, and trend direction|Must Have|

### 6.7 Pin to Dashboard

|ID    |Requirement                                                     |Priority   |
|------|----------------------------------------------------------------|-----------|
|PIN-01|Pin to Dashboard modal triggered from AI response action toolbar|Must Have  |
|PIN-02|Modal shows preview thumbnail of the response card being pinned |Must Have  |
|PIN-03|Editable insight title pre-filled with AI response headline     |Must Have  |
|PIN-04|Dropdown to select existing dashboard or create new dashboard   |Must Have  |
|PIN-05|Optional tags input with chip creation                          |Should Have|
|PIN-06|Cancel and Pin Insight action buttons                           |Must Have  |
|PIN-07|Pinned insight saved to SQLite linked to selected dashboard   |Must Have  |
|PIN-08|Success toast notification on successful pin                    |Must Have  |

-----

## 7. Functional Requirements — MVP Complete (Phase 1.5)

*Required before first external customer or investor demo.*

### 7.1 Dashboard Detail View

|ID     |Requirement                                               |Priority   |
|-------|----------------------------------------------------------|-----------|
|DASH-01|Dashboard detail screen showing all pinned insight cards  |Must Have  |
|DASH-02|Editable dashboard title with pencil icon                 |Must Have  |
|DASH-03|Masonry grid layout: full-width, half-width card sizes    |Must Have  |
|DASH-04|Drag-and-drop card reordering                             |Should Have|
|DASH-05|Three-dot menu on each card: Unpin, Move to report, Expand|Should Have|
|DASH-06|“Add to Report” action button in dashboard header         |Must Have  |
|DASH-07|“Share” button generating public link                     |Must Have  |
|DASH-08|Last updated timestamp in dashboard header                |Should Have|

### 7.2 Report Consumer View

|ID    |Requirement                                                                 |Priority   |
|------|----------------------------------------------------------------------------|-----------|
|RPT-01|Clean full-screen read-only report view for stakeholders                    |Must Have  |
|RPT-02|Left sidebar hidden in consumer view — full screen width used               |Must Have  |
|RPT-03|Slim fixed cyan progress bar showing scroll position                        |Must Have  |
|RPT-04|Minimal top navigation bar with report title, bookmark and share icons      |Must Have  |
|RPT-05|Centred reading column max-width 900px, generous padding                    |Must Have  |
|RPT-06|Report title, author and publication date in header                         |Must Have  |
|RPT-07|Alternating editorial text sections and full-width visualisation cards      |Must Have  |
|RPT-08|Visualisation cards: chart title, chart, italic caption, data source tag    |Must Have  |
|RPT-09|Premium editorial typography — large line height, generous paragraph spacing|Must Have  |
|RPT-10|Floating “Back to top” cyan circular button fixed bottom-right              |Should Have|
|RPT-11|Public shareable URL route accessible without authentication                |Must Have  |
|RPT-12|Report accessible via UUID-based public URL                                 |Must Have  |

### 7.3 Public Link Sharing

|ID      |Requirement                                                      |Priority |
|--------|-----------------------------------------------------------------|---------|
|SHARE-01|Share button generates a unique public UUID-based URL            |Must Have|
|SHARE-02|Public URL serves the Report Consumer View without authentication|Must Have|
|SHARE-03|Copy link to clipboard action with success toast                 |Must Have|
|SHARE-04|Shared reports are read-only — no editing in consumer view       |Must Have|

-----

## 8. Functional Requirements — Post MVP (Phase 2)

*Documented for architectural awareness. Not in scope for MVP.*

|ID   |Feature               |Description                                                |
|-----|----------------------|-----------------------------------------------------------|
|P2-01|Authentication        |Google SSO + email/password via Supabase Auth              |
|P2-02|Multi-tenancy         |Isolated workspaces per organisation                       |
|P2-03|Team collaboration    |Shared conversations, dashboards and reports within a team |
|P2-04|Role-based access     |Admin, Analyst, Viewer roles with permission controls      |
|P2-05|Model switcher UI     |Per-message model selection in chat input bar              |
|P2-06|MCP settings UI       |Self-service MCP server connection management screen       |
|P2-07|Dashboards Index      |Grid management view of all dashboards                     |
|P2-08|Reports Index         |Grid management view of all reports                        |
|P2-09|Report Story Builder  |Full narrative editor with drag-reorderable section blocks |
|P2-10|PDF export            |Export reports to PDF for offline distribution             |
|P2-11|Email delivery        |Send reports to stakeholders via email (Resend/SendGrid)   |
|P2-12|Advanced charts       |Plotly integration for sankey, treemap, geo maps, waterfall|
|P2-13|Enterprise SSO        |SAML / OKTA integration                                    |
|P2-14|Audit logging         |Query and access audit trail for compliance                |
|P2-15|Custom MCP UI         |In-app MCP server configuration and testing interface      |
|P2-16|Auto model routing    |Intelligent model selection based on query type            |
|P2-17|Conversation branching|Fork conversations to explore alternative analytical paths |

-----

## 9. Screen Specifications

### Screen Inventory

|Screen                |Phase       |Route            |User       |
|----------------------|------------|-----------------|-----------|
|App Shell + Navigation|MVP         |/                |Analyst    |
|New Conversation Home |MVP         |/                |Analyst    |
|Active Conversation   |MVP         |/c/[id]          |Analyst    |
|Pin to Dashboard Modal|MVP         |Overlay          |Analyst    |
|Dashboard Detail      |MVP Complete|/dashboards/[id] |Analyst    |
|Report Consumer View  |MVP Complete|/r/[uuid]        |Stakeholder|
|Dashboards Index      |Phase 2     |/dashboards      |Analyst    |
|Reports Index         |Phase 2     |/reports         |Analyst    |
|Report Story Builder  |Phase 2     |/report/[id]/edit|Analyst    |
|Settings / MCP Config |Phase 2     |/settings        |Analyst    |

### Visual Design System

|Token           |Value      |Usage                                     |
|----------------|-----------|------------------------------------------|
|Background      |#0F1117    |Page background, deep canvas              |
|Surface         |#1A1D27    |Cards, panels, elevated components        |
|Surface High    |#22263A    |Modals, dropdowns, popovers               |
|Accent Primary  |#00D4FF    |Primary actions, active states, highlights|
|Accent Secondary|#00E5A0    |Success, positive trends, emerald         |
|Warning         |#F59E0B    |Negative trends, amber alerts             |
|Text Primary    |#FFFFFF    |Headings, primary content                 |
|Text Secondary  |#8892A4    |Body text, labels, captions               |
|Border          |#2A2D3E    |Card borders, dividers                    |
|Border Radius   |16px (1rem)|All cards and containers                  |
|Sidebar Background|#0f2123   |Sidebar panel, teal-tinted dark           |
|Button Style    |Pill-shaped|All primary and secondary buttons         |
|Hover Effect    |Cyan glow  |All interactive elements                  |

-----

## 10. Component Architecture

### 10.1 Component Library Strategy

The frontend uses a **hybrid component architecture** combining three layers:

```
Layer 1: assistant-ui          →  Entire chat interface
Layer 2: shadcn/ui + Radix     →  All non-chat structural UI
Layer 3: Custom components     →  Signature experience components
```

### 10.2 assistant-ui Components (Chat Layer)

|Component             |Usage                                              |
|----------------------|---------------------------------------------------|
|`<Thread />`          |Complete conversation thread with scroll management|
|`<Composer />`        |Chat input bar with send button                    |
|`<AssistantMessage />`|AI response card shell                             |
|`<UserMessage />`     |User message bubble                                |
|`<ToolCallUI />`      |MCP tool call execution indicator                  |
|Generative UI Runtime |Mixed content type switching and rendering         |

### 10.3 Custom Signature Components

|Component                  |Description                                                    |Phase       |
|---------------------------|---------------------------------------------------------------|------------|
|`<VizCard />`              |Dark-themed Recharts wrapper with title, chart, caption, expand|MVP         |
|`<MermaidBlock />`         |Dark-themed Mermaid renderer with responsive scaling           |MVP         |
|`<KPIChips />`             |Metric number, label, trend arrow, optional sparkline          |MVP         |
|`<ToolCallIndicator />`    |Animated MCP execution pulse, tool name, completion state      |MVP         |
|`<MultiVizCard />`         |2x2 grid layout of chart panels in one response card           |MVP         |
|`<PinModal />`             |Pin to dashboard overlay with preview and destination selector |MVP         |
|`<DashboardCard />`        |Pinned insight card with drag handle and action menu           |MVP Complete|
|`<ReportVizCard />`        |Consumer view chart with caption and data source tag           |MVP Complete|
|`<MCPStatusBar />`         |Connected MCP server indicators in app header                  |MVP         |
|`<ResponseActionToolbar />`|Pin, Report, Copy, Regenerate icon button row                  |MVP         |

### 10.4 shadcn/ui Components (Structural Layer)

Buttons, inputs, dropdowns, modals, tooltips, tabs, badges, toast notifications, avatar, separator, scroll area, sheet, command palette.

-----

## 11. Data Architecture

### 11.1 Persistence Scope

The application persists only application state — never business data.

|Data Type                              |Stored |Storage                       |
|---------------------------------------|-------|------------------------------|
|Conversation thread (messages)         |✅ Yes  |SQLite                        |
|AI response content (text, viz configs)|✅ Yes  |SQLite                        |
|Pinned dashboard definitions           |✅ Yes  |SQLite                        |
|Report structure and content           |✅ Yes  |SQLite                        |
|MCP server configuration               |✅ Yes  |JSON config file              |
|Source business data                   |❌ Never|Stays in source system        |
|Raw MCP query results                  |❌ Never|Exists only in response stream|

### 11.2 SQLite Schema (MVP)

**conversations**

```
id          uuid primary key
title       text
created_at  timestamp
updated_at  timestamp
```

**messages**

```
id              uuid primary key
conversation_id uuid foreign key
role            enum (user, assistant)
content         jsonb  -- mixed content blocks array
created_at      timestamp
```

**dashboards**

```
id          uuid primary key
title       text
created_at  timestamp
updated_at  timestamp
```

**pinned_insights**

```
id              uuid primary key
dashboard_id    uuid foreign key
title           text
content         jsonb  -- response card content snapshot
position        integer
created_at      timestamp
```

**reports**

```
id          uuid primary key
title       text
public_uuid uuid unique  -- for public sharing URL
content     jsonb        -- ordered array of narrative blocks
status      enum (draft, published)
created_at  timestamp
updated_at  timestamp
```

-----

## 12. API & Integration Specifications

### 12.1 FastAPI Backend Endpoints

|Method|Endpoint                  |Description                          |
|------|--------------------------|-------------------------------------|
|POST  |/api/chat/stream          |Stream AI response for a user message|
|GET   |/api/conversations        |List all conversations               |
|GET   |/api/conversations/{id}   |Get conversation with messages       |
|POST  |/api/conversations        |Create new conversation              |
|PATCH |/api/conversations/{id}   |Update conversation title            |
|POST  |/api/dashboards           |Create dashboard                     |
|GET   |/api/dashboards/{id}      |Get dashboard with pinned insights   |
|POST  |/api/dashboards/{id}/pins |Pin insight to dashboard             |
|POST  |/api/reports              |Create report                        |
|GET   |/api/reports/public/{uuid}|Get published report by public UUID  |

### 12.2 OpenRouter Integration

```python
# FastAPI endpoint — streaming AI response
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    response = await openrouter_client.chat.completions.create(
        model=config.ai.defaultModel,
        messages=request.messages,
        tools=mcp_tools,        # MCP tools injected here
        stream=True
    )
    return StreamingResponse(
        stream_response(response),
        media_type="text/event-stream"
    )
```

### 12.3 MCP Integration Pattern

```python
# MCP tools loaded from config at startup
mcp_servers = load_mcp_config("config.json")

async def load_mcp_tools():
    tools = []
    for server in mcp_servers:
        client = MCPClient(server.endpoint)
        server_tools = await client.list_tools()
        tools.extend(server_tools)
    return tools
```

-----

## 13. Non-Functional Requirements

### 13.1 Performance

|Requirement                          |Target       |Priority   |
|-------------------------------------|-------------|-----------|
|Time to first token in AI response   |< 1.5 seconds|Must Have  |
|Chart render time after data received|< 500ms      |Must Have  |
|Mermaid diagram render time          |< 800ms      |Must Have  |
|Page load time (initial)             |< 2 seconds  |Should Have|
|Conversation history load            |< 1 second   |Should Have|

### 13.2 Visual Quality (Demo Critical)

|Requirement           |Standard                                                                    |
|----------------------|----------------------------------------------------------------------------|
|Dark theme consistency|Charcoal/cyan palette applied consistently across all screens and components|
|Animation smoothness  |60fps for all Framer Motion animations                                      |
|Streaming text        |Smooth token-by-token rendering without layout shift                        |
|Chart quality         |Premium dark-themed charts indistinguishable from custom-built BI tools     |
|Typography            |Sharp, legible at all data-dense sizes                                      |

### 13.3 Browser Support

|Browser     |Support Level         |
|------------|----------------------|
|Chrome 120+ |Full support (primary)|
|Safari 17+  |Full support          |
|Firefox 120+|Full support          |
|Edge 120+   |Full support          |

### 13.4 Responsive Breakpoints

|Breakpoint           |Layout Behaviour                           |
|---------------------|-------------------------------------------|
|Desktop (1280px+)    |Full sidebar + content canvas              |
|Tablet (768px–1279px)|Collapsible sidebar, adapted content layout|
|Mobile (<768px)      |Out of scope for MVP                       |

-----

## 14. MVP Demo Acceptance Criteria

*The following criteria define “demo-ready” for the stakeholder presentation.*

### Critical Path — Must All Pass

- [ ] User can type a natural language business question in the chat input and send it
- [ ] Tool call indicator appears and shows MCP server being queried
- [ ] AI response streams back with animated text rendering
- [ ] Response contains correctly rendered Markdown formatting
- [ ] Response contains at least one interactive Recharts visualisation styled in dark theme
- [ ] Response contains at least one Mermaid diagram styled in dark theme
- [ ] Pin to Dashboard modal opens from the response action toolbar
- [ ] Insight is successfully pinned and appears on the Dashboard Detail screen
- [ ] Dashboard Detail shows pinned insight cards in responsive grid layout (grid-cols-2)
- [ ] Report Consumer View renders the full narrative with charts at a public URL
- [ ] Public URL is accessible without any login or authentication
- [ ] All screens render correctly in Chrome at 1440px desktop width
- [ ] The dark charcoal + cyan theme is consistent across all visible screens
- [ ] No console errors visible during the demo flow

### Demo Script Flow

```
1. Open app → New Conversation home screen
2. Click a suggested prompt → Chat input populated
3. Send message → Tool call indicator fires → MCP queries
4. AI response streams → Markdown + Chart + Mermaid renders
5. Click "Pin to Dashboard" → Modal opens → Pin confirmed
6. Navigate to Dashboard → Pinned card visible
7. Click "Share" → Public link copied
8. Open public link in new tab → Report Consumer View loads
9. Stakeholder sees clean narrative + charts — zero app chrome
```

-----

## 15. Phased Delivery Roadmap

### Phase 1 — MVP Demo (This Week)

|Day|Focus          |Deliverables                                                                  |
|---|---------------|------------------------------------------------------------------------------|
|1–2|Foundation     |Next.js + FastAPI setup, shadcn/ui dark theme, assistant-ui integration       |
|3–4|Core Experience|VizCard + MermaidBlock components, Recharts dark theme, mixed content renderer|
|5  |Chat Polish    |Tool call indicator, KPI chips, pin modal, Framer Motion animations           |
|6  |Integration    |FastAPI + OpenRouter wiring, MCP JSON config, end-to-end chat flow            |
|7  |Demo Prep      |Sample data, demo script, bug fixes, final polish                             |

### Phase 1.5 — MVP Complete

Dashboard Detail View, Report Consumer View, Public link sharing, SQLite persistence fully wired.

### Phase 2 — SaaS Platform

Authentication, multi-tenancy, team workspaces, Dashboards/Reports Index screens, Report Story Builder, model switcher, MCP settings UI, advanced chart types, PDF export, email delivery.

-----

## 16. Open Questions & Risks

### Open Questions

|ID   |Question                                                                                 |Impact                                          |Owner        |
|-----|-----------------------------------------------------------------------------------------|------------------------------------------------|-------------|
|OQ-01|What specific MCP servers will be configured for the demo? What sample data is available?|High — affects demo realism                     |Product Owner|
|OQ-02|What business domain does the demo data represent? (Sales, Finance, Marketing?)          |High — affects suggested prompts and demo script|Product Owner|
|OQ-03|Will the stakeholder demo be live (real MCP queries) or use pre-recorded responses?      |High — affects reliability risk                 |Product Owner|
|OQ-04|What is the SQLite database file path for deployment?                                    |Medium                                          |Engineering  |
|OQ-05|What OpenRouter API key and default model is configured for demo?                        |High                                            |Engineering  |

### Risks

|ID  |Risk                                                             |Likelihood|Impact|Mitigation                                                                                   |
|----|-----------------------------------------------------------------|----------|------|---------------------------------------------------------------------------------------------|
|R-01|MCP server latency causes slow demo responses                    |Medium    |High  |Pre-warm MCP connections, use fastest available model, prepare fallback with cached responses|
|R-02|assistant-ui dark theme customisation takes longer than estimated|Medium    |High  |Start theme configuration on Day 1, have fallback custom chat implementation ready           |
|R-03|Recharts dark theme inconsistency across chart types             |Low       |Medium|Build shared theme config wrapper on Day 1, validate all chart types before Day 5            |
|R-04|Mixed content stream parsing edge cases                          |Medium    |High  |Thorough testing with varied LLM responses, implement graceful fallback to plain Markdown    |
|R-05|Demo MCP data not representative enough                          |Medium    |High  |Prepare 3–5 scripted questions with known good responses, test fully before demo day         |

-----

*Document prepared by: Stitch Architect AI Requirements Engineer*  
*Based on: Product Discovery Interview — 15 questions*  
*Next review: After stakeholder demo*