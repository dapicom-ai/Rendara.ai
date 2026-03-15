# Rendara — AI Data Analysis Agent

Rendara is a conversational data analysis agent. Connect it to any MCP-compatible data source, ask questions in plain English, and get back charts, KPI scorecards, flow diagrams, and narrative — all in real time. Save any result to a **Dashboard** or compose it into a slide-based **Story**.

![Rendara home screen](docs/screenshots/01-home.png)

---

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
   - [1. Clone the repository](#1-clone-the-repository)
   - [2. Install frontend dependencies](#2-install-frontend-dependencies)
   - [3. Install backend dependencies](#3-install-backend-dependencies)
   - [4. Configure environment variables](#4-configure-environment-variables)
3. [Running Rendara](#running-rendara)
4. [Connecting a Data Source (MCP)](#connecting-a-data-source-mcp)
   - [How MCP works in Rendara](#how-mcp-works-in-rendara)
   - [Adding a Power BI Remote MCP server](#adding-a-power-bi-remote-mcp-server)
   - [Adding a custom SQL MCP server](#adding-a-custom-sql-mcp-server)
   - [Multiple MCP servers](#multiple-mcp-servers)
   - [Configuring the AI model](#configuring-the-ai-model)
5. [Features](#features)
   - [Conversational chat with live data](#conversational-chat-with-live-data)
   - [Dashboards](#dashboards)
   - [Stories](#stories)
   - [Pinned responses](#pinned-responses)
6. [Project structure](#project-structure)

---

## Requirements

| Component | Version |
|-----------|---------|
| Node.js | 18 + |
| Python | 3.11 + |
| npm | 9 + |

You also need an [OpenRouter](https://openrouter.ai) API key (free tier works). OpenRouter gives access to Claude, GPT-4o, Gemini, and hundreds of other models from a single key.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Dapicom/Rendara.git
cd rendara
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

If you plan to use the bundled LangGraph SQL MCP server (see [Adding a custom SQL MCP server](#adding-a-custom-sql-mcp-server)), also install:

```bash
pip install langchain-community psycopg2-binary sqlalchemy
```

### 4. Configure environment variables

Create a file called `.env.local` in the project root:

```bash
# URL where the FastAPI backend will be running
NEXT_PUBLIC_BACKEND_URL=http://localhost:9002
```

The backend reads its configuration from `backend/config.json` (already present in the repo). No separate `.env` file is needed for the backend — the API key is passed on the command line when you start it.

---

## Running Rendara

Rendara has two processes. Open two terminal tabs and run one in each.

**Terminal 1 — Backend (FastAPI)**

```bash
env PYTHONPATH=/path/to/rendara/backend \
    FRONTEND_URL="http://localhost:9001" \
    OPENROUTER_API_KEY=your_key_here \
    uvicorn main:app --app-dir backend --host 0.0.0.0 --port 9002 --reload
```

Replace `/path/to/rendara` with the actual absolute path to your clone.

**Terminal 2 — Frontend (Next.js)**

```bash
npm run dev -- -p 9001
# or for a production build:
npm run build && npm run start -- -p 9001
```

Open **http://localhost:9001** in your browser.

> The backend starts on port 9002 and the frontend on 9001 to avoid conflicts with other common local services. You can change both — keep `NEXT_PUBLIC_BACKEND_URL` and `FRONTEND_URL` consistent with whatever ports you choose.

On first start the backend automatically creates a local SQLite database at `backend/demo.db` that stores all conversations, dashboards, stories, and pinned items.

---

## Connecting a Data Source (MCP)

Rendara talks to data through **MCP servers** (Model Context Protocol). At startup the backend reads `backend/mcp_servers.json`, connects to each listed server via SSE, and discovers its tools. The AI then uses those tools automatically whenever you ask a data question.

### How MCP works in Rendara

```
You (browser)
    │  natural language question
    ▼
Rendara Frontend  (Next.js :9001)
    │  SSE stream
    ▼
Rendara Backend  (FastAPI :9002)
    │  JSON-RPC 2.0  POST /message
    ▼
MCP Server  ──►  Your data source (SQL DB, Power BI, REST API…)
    │  structured results
    ▼
OpenRouter LLM  ──►  charts · KPIs · diagrams · narrative
```

The backend supports **multiple MCP servers** simultaneously. Each server exposes a set of tools (functions the AI can call). Rendara discovers them at startup, and the LLM picks the right tools automatically based on your question.

---

### Adding a Power BI Remote MCP server

Microsoft publishes an official Power BI Remote MCP server. Once running, it exposes three tools that Rendara uses natively:

| Tool | What Rendara uses it for |
|------|--------------------------|
| `get_semantic_model_schema` | Understanding available tables, measures, and relationships |
| `generate_query` | Translating a plain-English question into DAX or SQL |
| `execute_query` | Running the query and receiving structured tabular results |

**Step 1 — Start the Power BI MCP server**

Follow the [Microsoft Power BI MCP documentation](https://learn.microsoft.com/power-bi/developer/embedded/mcp-server) to install and authenticate the server. It listens on `http://localhost:8001/sse` by default.

**Step 2 — Register it in Rendara**

Edit `backend/mcp_servers.json`:

```json
[
  {
    "name": "Power BI",
    "type": "sse",
    "endpoint": "http://localhost:8001/sse",
    "description": "Power BI semantic models via the official Remote MCP server"
  }
]
```

`description` is injected into the LLM system prompt so the AI knows what this data source contains — write a sentence or two about the datasets it exposes.

**Step 3 — Restart the Rendara backend**

```bash
env PYTHONPATH=/path/to/rendara/backend \
    FRONTEND_URL="http://localhost:9001" \
    OPENROUTER_API_KEY=your_key_here \
    uvicorn main:app --app-dir backend --host 0.0.0.0 --port 9002 --reload
```

A successful connection logs:

```
{"event": "mcp_connect_success", "server": "Power BI", "tools_count": 3}
```

The server name will appear under **MCP SERVERS** in Rendara's sidebar. Ask *"What data do you have?"* to trigger a schema discovery call.

---

### Adding a custom SQL MCP server

The repository ships with `mcp_sql_server/` — a LangGraph-powered MCP server that works with any PostgreSQL database. It exposes the same three-tool interface (`get_semantic_model_schema`, `generate_query`, `execute_query`) as the Power BI server.

The `generate_query` tool uses a **LangGraph ReAct agent** backed by `SQLDatabaseToolkit`. It inspects your live schema, writes a query, validates it, and returns the SQL — the AI never writes raw SQL itself.

**1. Configure the database connection**

Edit both files to point to your database:

```python
# mcp_sql_server/server.py
PG_DSN = "postgresql://user:password@localhost:5432/your_database"

# mcp_sql_server/agent.py
DB_URI = "postgresql+psycopg2://user:password@localhost:5432/your_database"
```

**2. Add a semantic metadata file** (optional but recommended)

Copy `mcp_sql_server/demo_semantic_meta.json` as a template. The `entities` array gives each table a plain-English `display_name` and `description` that the agent uses to write better queries. The `metrics` array defines common KPI formulas. The `ai_instructions` field gives the agent star-schema join hints.

```json
{
  "models": [{
    "model_id": "my_model",
    "model_name": "My Database",
    "entities": [
      {
        "table_name": "orders",
        "display_name": "Orders",
        "description": "One row per customer order",
        "columns": [
          { "column_name": "order_id",     "description": "Primary key" },
          { "column_name": "customer_id",  "description": "FK to customers" },
          { "column_name": "order_date",   "description": "Date the order was placed" },
          { "column_name": "total_amount", "description": "Order value in USD" }
        ]
      }
    ],
    "metrics": [
      { "name": "Average Order Value", "expression": "SUM(total_amount) / COUNT(order_id)" }
    ],
    "ai_instructions": "Always filter by date range. Cast to ::numeric before dividing."
  }]
}
```

Update `semantic_meta.py` to reference your file name and set `model_id` to match.

**3. Start the MCP server**

```bash
cd mcp_sql_server
OPENROUTER_API_KEY=your_key_here MCP_PORT=8001 python3 server.py
```

You should see: `Serving on http://0.0.0.0:8001`

**4. Register it in `backend/mcp_servers.json`**

```json
[
  {
    "name": "My Database",
    "type": "sse",
    "endpoint": "http://localhost:8001/sse",
    "description": "Description of what data this source contains"
  }
]
```

---

### Multiple MCP servers

List as many servers as you like — Rendara connects to all of them at startup and the LLM picks the right tools for each question:

```json
[
  {
    "name": "Power BI",
    "type": "sse",
    "endpoint": "http://localhost:8001/sse",
    "description": "Executive Power BI semantic models — revenue, churn, campaigns"
  },
  {
    "name": "Operations DB",
    "type": "sse",
    "endpoint": "http://localhost:8002/sse",
    "description": "Live PostgreSQL operational database — orders, inventory, logistics"
  }
]
```

---

### Configuring the AI model

`backend/config.json` controls the LLM and tool-call behaviour:

```json
{
  "llm": {
    "model": "anthropic/claude-sonnet-4-5",
    "max_tokens": 4096,
    "temperature": 0.3,
    "max_tool_rounds": 10,
    "request_timeout_seconds": 120
  },
  "mcp": {
    "tool_timeout_seconds": 120,
    "round_timeout_seconds": 180
  }
}
```

| Setting | Description |
|---------|-------------|
| `model` | Any [OpenRouter model ID](https://openrouter.ai/models) — e.g. `openai/gpt-4o`, `google/gemini-2.0-flash-001` |
| `max_tool_rounds` | Maximum sequential tool-call cycles before the agent gives up |
| `temperature` | Lower = more precise and deterministic |
| `tool_timeout_seconds` | How long to wait for a single MCP tool call |

---

## Features

### Conversational chat with live data

Ask anything in plain English. Rendara calls your connected data source, then streams the answer as a mix of narrative text, charts, KPI scorecards, and Mermaid flow diagrams. The three-dot typing indicator pulses during every step — including tool calls.

![Chat with charts and KPIs](docs/screenshots/02-chat-with-charts.png)

**Supported visualisation types**

| Type | Best for |
|------|----------|
| Bar chart | Category comparisons, ranked lists |
| Line chart | Time series, trends over time |
| Area chart | Cumulative values, stacked series |
| Pie / donut chart | Share and composition |
| Scatter chart | Correlation, outlier detection |
| Composed chart | Mixed bar + line on one axis |
| KPI scorecard | Headline metrics with trend arrows |
| Mermaid diagram | Flow charts, sequence diagrams, ERDs |

Expand any visualisation to full screen with the **↗** icon in the top-right corner of the block. All content zooms to fit its container — no horizontal scrollbars.

Each assistant message shows a **bookmark icon** you can click to pin the response for later.

---

### Dashboards

Dashboards are agent-generated free-form canvas layouts. Each tile holds a chart, KPI scorecard, Mermaid diagram, or text block.

![Dashboards index](docs/screenshots/03-dashboards-index.png)

**Creating a dashboard**

Ask Rendara in chat:

- *"Build me a dashboard"*
- *"Create a dashboard showing revenue, churn, and top customers"*
- *"Turn this analysis into a dashboard"*

The agent generates a tile layout and saves it automatically. Navigate to **Dashboards** in the sidebar to open it.

**Dashboard canvas**

![Dashboard detail](docs/screenshots/04-dashboard-detail.png)

Each tile is independently sized and positioned on the canvas. Content zooms to fit — charts and Mermaid diagrams fill their tiles without scrollbars. Click **↗** on any tile to expand it to full screen.

**Agent Chat panel**

![Dashboard agent panel](docs/screenshots/05-dashboard-agent-panel.png)

Every dashboard has a collapsible **Agent Chat** panel on the right. Type instructions to modify the dashboard without leaving the view:

- *"Add a pie chart for regional breakdown"*
- *"Change the title to Q3 Revenue Overview"*
- *"Remove the bottom-right tile"*

---

### Stories

Stories are slide-based presentations generated from your data. Each slide is a full-screen canvas with charts, text, and diagrams.

**Creating a story**

Ask Rendara in chat:

- *"Create a story from my data"*
- *"Turn this analysis into a 5-slide presentation"*
- *"Build a story showing the churn trend"*

**Story viewer**

![Story viewer](docs/screenshots/06-story-viewer.png)

The viewer shows the current slide with a **slide counter** (e.g. 1 / 4) and **‹ ›** navigation buttons. The **Present** button enters full-screen mode.

**Presentation mode**

![Presentation mode](docs/screenshots/07-story-presentation.png)

Full-screen presentation mode shows slides without any chrome. Navigate with:

- **← →** keyboard arrow keys
- On-screen **‹ ›** buttons
- **✕** to exit back to the viewer

---

### Pinned responses

Any assistant message can be pinned for quick reference. Pins are saved to the local database and persist across sessions.

**Pinning a message**

Hover over any assistant message and click the **bookmark icon**. A modal lets you set a title and optional description.

![Pin modal](docs/screenshots/08-pin-modal.png)

**Pinned page**

![Pinned responses](docs/screenshots/09-pinned-page.png)

Open **Pinned** in the sidebar to see all saved items. Each card shows the title, description, and the original content. Click to open the source conversation.

---

## Project structure

```
rendara/
├── app/                        # Next.js App Router pages and components
│   ├── (main)/                 # Authenticated layout (sidebar + main content)
│   │   ├── page.tsx            # Home — new conversation hero
│   │   ├── c/[id]/             # Active conversation view
│   │   ├── dashboards/         # Dashboard index + canvas detail
│   │   ├── stories/            # Story index + slide viewer
│   │   └── pinned/             # Pinned responses collection
│   ├── components/
│   │   ├── chat/               # Chat UI — messages, input, tool call indicators
│   │   ├── viz/                # Chart, KPI scorecard, and Mermaid renderers
│   │   ├── dashboards/         # Dashboard canvas, tile, and pin modal
│   │   └── layout/             # Sidebar and navigation shell
│   └── stores/                 # Zustand state (expand overlay, pin modal)
├── backend/
│   ├── main.py                 # FastAPI app entry point + lifespan
│   ├── config.json             # LLM + MCP settings  ← edit this
│   ├── mcp_servers.json        # MCP server registry  ← edit this to add data sources
│   ├── routers/                # API routes (chat, conversations, dashboards, stories…)
│   ├── services/
│   │   ├── mcp_client.py       # MCP SSE client — connects, discovers tools, proxies calls
│   │   └── stream_processor.py # SSE streaming pipeline — tool rounds, text delta, viz blocks
│   └── prompts/
│       └── system_prompt.py    # LLM system prompt — tool usage rules, output format
└── mcp_sql_server/             # Optional bundled LangGraph SQL MCP server
    ├── server.py               # FastMCP entry point (default port 8001)
    ├── agent.py                # LangGraph ReAct agent + SQLDatabaseToolkit
    ├── safety.py               # SELECT-only guard + row-limit enforcement
    ├── semantic_meta.py        # Static schema loader + live column type enrichment
    └── demo_semantic_meta.json     # Example semantic model (swap in your own)
```
