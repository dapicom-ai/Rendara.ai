# Rendara

## Project Overview
Rendara is a Data Analysis Agent application. We are building v2 from scratch on the `v2-scratch` branch.

## Tech Stack
- **Frontend**: Next.js 14+ App Router, TypeScript, Tailwind CSS
- **Chat UI**: `@assistant-ui/react` (useLocalRuntime + ChatModelAdapter pattern)
- **UI Components**: shadcn/ui + Radix UI
- **Charts**: Recharts (7 types: bar, line, area, pie, scatter, composed, kpi)
- **Diagrams**: Mermaid.js
- **Animation**: Framer Motion
- **State**: Zustand
- **Backend**: FastAPI (Python), SSE streaming
- **AI**: OpenRouter (model configurable via config.json)
- **MCP**: MCP Python SDK
- **Persistence**: SQLite (demo.db) + JSON config files
- **Deployment**: Vercel (frontend) + Railway (backend)

## assistant-ui Integration (Validated)
- Use `useLocalRuntime(adapter)` with a `ChatModelAdapter` — NOT a custom runtime hook
- Viz/Mermaid blocks modeled as **tool calls**, rendered via `makeAssistantToolUI`
- Tool call status mapping: `tool_call_start` → "running", `tool_call_result` → "complete", `tool_call_error` → "incomplete"
- Async generator `yield { content: [...] }` pattern — no imperative append/update API
- Wrap UI in `<AssistantRuntimeProvider runtime={runtime}>`

## Design System
- Background: `#0F1117`, Surface: `#1A1D27`, Surface High: `#22263A`
- Accent: `#00D4FF` (cyan), Success: `#00E5A0`, Warning: `#F59E0B`
- Text Primary: `#FFFFFF`, Text Secondary: `#8892A4`, Border: `#2D313E`
- Sidebar: `#0f2123`
- Border radius: 16px, Buttons: pill-shaped, Hover: cyan glow
- Font: Inter

## Routes
- `/` — Home (new conversation)
- `/c/[id]` — Active conversation
- `/dashboards` — Dashboards index
- `/dashboards/[id]` — Dashboard detail
- `/reports` — Reports index
- `/reports/[id]` — Report builder
- `/r/[uuid]` — Public report consumer (no sidebar)

## Stitch Design Reference
- **Stitch Project**: "App Shell - Data Analysis Agent"
- **Project ID**: `projects/5160499621024403952`
- Device: Desktop
- Theme: Dark mode, accent color `#00e1ff`, Inter font, fully rounded, saturation 2
- 16 screens (4 hidden)

## Repository
- Remote: https://github.com/Dapicom/Rendara.git
- Main branch: `main` (old version, to be replaced)
- Active branch: `v2-scratch` (fresh start)

## Auto-load Skills

### Frontend UI Work
- When building or modifying frontend UI components, automatically use `/baseline-ui` and `/frontend-design`
- When creating new pages, layouts, or views, automatically use `/frontend-design`
- After completing any UI work, run `/fixing-accessibility` as a review pass
- When adding animations or transitions, use `/fixing-motion-performance`
- When finalizing pages for production, run `/fixing-metadata`

### Chat / AI Interface Work
- When building chat or AI assistant interfaces, automatically use `/assistant-ui` and `/primitives`
- When setting up assistant-ui in the project, use `/setup`
- When implementing tool UIs or tool registration, use `/tools`
- When working with streaming responses, use `/streaming`
- When implementing runtime or state management for chat, use `/runtime`
- When adding multi-thread support, use `/thread-list`
- When adding persistence or auth for chat, use `/cloud`

### Subagent Instructions
- Frontend subagents MUST load `/baseline-ui` and `/frontend-design` skills before writing any UI code
- Chat/AI interface subagents MUST load `/assistant-ui` and `/primitives` before writing chat components
- Always run `/fixing-accessibility` after generating component code
