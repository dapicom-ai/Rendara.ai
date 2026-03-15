"""
MCP connection manager and tool registry.

Connections are established at FastAPI startup (not per-request).
Tool schemas are aggregated into a global tool_registry dict.

SDD Section 7.1 — MCP Connection Lifecycle
SDD Section 7.2 — Tool Discovery and Registration
SDD Section 7.4 — MCP Error Taxonomy
"""

import asyncio
import json
import logging
import time
from typing import Any, Optional

import httpx
from mcp.client.sse import sse_client
from mcp import ClientSession

from config import app_config, mcp_servers_config, MCPServerConfig
import database

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global tool registry
# Registry entries: {tool_name: {schema, server_name, server_config}}
# ---------------------------------------------------------------------------
tool_registry: dict[str, dict[str, Any]] = {}

# Track which servers connected successfully
connected_servers: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# MCP over SSE — SDK-based client
# Uses the official MCP Python SDK (mcp>=1.0.0) sse_client + ClientSession.
# ---------------------------------------------------------------------------

async def _list_tools_for_server(server: MCPServerConfig) -> list[dict[str, Any]]:
    """
    Connect to an MCP SSE server and retrieve its tool list.
    Returns list of tool schema dicts compatible with OpenRouter tool format.
    """
    async with sse_client(server.endpoint, timeout=10.0) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.list_tools()
            return [
                {
                    "name": tool.name,
                    "description": tool.description or "",
                    "inputSchema": tool.inputSchema if hasattr(tool, "inputSchema") else {},
                }
                for tool in result.tools
            ]


async def _call_tool_on_server(
    server_config: dict[str, Any],
    tool_name: str,
    arguments: dict[str, Any],
    timeout: float,
) -> Any:
    """
    Execute a tool call on the specified MCP SSE server.
    Returns the parsed result content.
    """
    from mcp.types import TextContent

    async with sse_client(server_config["endpoint"], timeout=timeout, sse_read_timeout=timeout) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)

    texts = [c.text for c in result.content if isinstance(c, TextContent)]
    if result.isError:
        raise ValueError("\n".join(texts) or "Tool returned an error")

    if texts:
        combined = "\n".join(texts)
        try:
            return json.loads(combined)
        except json.JSONDecodeError:
            return combined
    return [c.model_dump() for c in result.content]


# ---------------------------------------------------------------------------
# Startup: connect to all MCP servers and build tool registry
# ---------------------------------------------------------------------------
async def load_mcp_tools() -> None:
    """
    Called at FastAPI startup. Connects to all configured MCP servers,
    retrieves tool schemas, and populates the global tool_registry.

    SDD Section 7.1
    """
    global tool_registry, connected_servers
    tool_registry = {}
    connected_servers = []

    for server in mcp_servers_config:
        try:
            tools = await asyncio.wait_for(
                _list_tools_for_server(server),
                timeout=10.0,
            )
            tool_names = []
            for tool_schema in tools:
                name = tool_schema.get("name", "")
                if not name:
                    continue
                if name in tool_registry:
                    logger.warning(
                        json.dumps({
                            "event": "mcp_tool_name_conflict",
                            "tool_name": name,
                            "overwritten_by": server.name,
                        })
                    )
                tool_registry[name] = {
                    "schema": tool_schema,
                    "server_name": server.name,
                    "server_config": {
                        "name": server.name,
                        "endpoint": server.endpoint,
                        "type": server.type,
                    },
                }
                tool_names.append(name)

            connected_servers.append({
                "name": server.name,
                "description": server.description,
                "tools": tool_names,
            })
            logger.info(
                json.dumps({
                    "event": "mcp_connect_success",
                    "server": server.name,
                    "tools_count": len(tool_names),
                    "tools": tool_names,
                })
            )
        except asyncio.TimeoutError:
            logger.warning(
                json.dumps({
                    "event": "mcp_connect_failure",
                    "server": server.name,
                    "reason": "connection timeout (10s)",
                })
            )
        except Exception as exc:
            logger.warning(
                json.dumps({
                    "event": "mcp_connect_failure",
                    "server": server.name,
                    "reason": str(exc),
                })
            )

    # Register built-in Rendara tools (create_dashboard, create_story, update_dashboard, update_story)
    _RENDARA_TOOLS = [
        {
            "name": "create_dashboard",
            "description": (
                "Create a free-canvas dashboard with tiles. Use when the user asks to "
                "create, build, or make a dashboard. Tiles are positioned absolutely on a "
                "16:9 canvas using x/y/w/h as percentages (0-100)."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "tiles": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id":    {"type": "string"},
                                "type":  {"type": "string", "enum": ["text", "viz_chart", "mermaid"]},
                                "title": {"type": "string"},
                                "content": {
                                    "type": "array",
                                    "description": "Ordered content blocks for this tile",
                                    "items": {
                                        "oneOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type": {"const": "text"},
                                                    "text": {"type": "string", "description": "Markdown text"},
                                                },
                                                "required": ["type", "text"],
                                            },
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type": {"const": "viz_chart"},
                                                    "spec": {
                                                        "type": "object",
                                                        "description": "VizSpec — same schema as chat charts. type: bar|line|area|pie|scatter|composed|kpi",
                                                        "properties": {
                                                            "type":  {"type": "string"},
                                                            "title": {"type": "string"},
                                                            "data":  {"type": "array"},
                                                            "xKey":  {"type": "string"},
                                                            "yKey":  {"type": "string"},
                                                        },
                                                        "required": ["type", "title", "data"],
                                                    },
                                                },
                                                "required": ["type", "spec"],
                                            },
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type":       {"const": "mermaid"},
                                                    "definition": {"type": "string", "description": "Valid Mermaid diagram definition"},
                                                },
                                                "required": ["type", "definition"],
                                            },
                                        ]
                                    },
                                },
                                "x": {"type": "number"},
                                "y": {"type": "number"},
                                "w": {"type": "number"},
                                "h": {"type": "number"},
                            },
                            "required": ["id", "type", "content", "x", "y", "w", "h"],
                        },
                    },
                },
                "required": ["title", "tiles"],
            },
        },
        {
            "name": "create_story",
            "description": (
                "Create a slide-deck story. Use when the user asks to create a story, "
                "presentation, or slide deck."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "slides": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id":      {"type": "string"},
                                "title":   {"type": "string", "description": "Slide heading"},
                                "content": {"type": "string", "description": "Slide narrative in markdown"},
                                "visualizations": {
                                    "type": "array",
                                    "description": "Optional ordered charts/diagrams rendered below content",
                                    "items": {
                                        "oneOf": [
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type": {"const": "viz_chart"},
                                                    "spec": {"type": "object", "description": "VizSpec — same schema as chat charts"},
                                                },
                                                "required": ["type", "spec"],
                                            },
                                            {
                                                "type": "object",
                                                "properties": {
                                                    "type":       {"const": "mermaid"},
                                                    "definition": {"type": "string"},
                                                },
                                                "required": ["type", "definition"],
                                            },
                                        ]
                                    },
                                },
                                "notes": {"type": "string"},
                            },
                            "required": ["id", "title", "content"],
                        },
                    },
                    "auto_advance_interval": {"type": "integer"},
                },
                "required": ["title", "slides"],
            },
        },
        {
            "name": "update_dashboard",
            "description": (
                "Update an existing dashboard's title or tiles. Use when the user asks to "
                "edit, change, add to, or modify a dashboard they are currently viewing. "
                "Pass the full updated tiles array."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "dashboard_id": {"type": "string", "description": "ID of the dashboard to update"},
                    "title":        {"type": "string", "description": "New title (omit to keep existing)"},
                    "tiles":        {"type": "array",  "description": "Full replacement tiles array (same schema as create_dashboard). Required if changing layout or content."},
                },
                "required": ["dashboard_id"],
            },
        },
        {
            "name": "update_story",
            "description": (
                "Update an existing story's title or slides. Use when the user asks to "
                "edit, change, add to, or modify a story they are currently viewing. "
                "Pass the full updated slides array."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "story_id": {"type": "string", "description": "ID of the story to update"},
                    "title":    {"type": "string", "description": "New title (omit to keep existing)"},
                    "slides":   {"type": "array",  "description": "Full replacement slides array (same schema as create_story)."},
                    "auto_advance_interval": {"type": "integer"},
                },
                "required": ["story_id"],
            },
        },
    ]
    rendara_tool_names = []
    for tool_schema in _RENDARA_TOOLS:
        name = tool_schema["name"]
        tool_registry[name] = {
            "schema": tool_schema,
            "server_name": "rendara_tools",
            "server_config": None,  # sentinel: handled by _execute_rendara_tool
        }
        rendara_tool_names.append(name)

    connected_servers.append({
        "name": "rendara_tools",
        "description": "Built-in Rendara tools for creating dashboards and stories",
        "tools": rendara_tool_names,
    })
    logger.info(json.dumps({"event": "rendara_tools_registered", "tools": rendara_tool_names}))

    logger.info(
        json.dumps({
            "event": "mcp_registry_ready",
            "total_tools": len(tool_registry),
            "connected_servers": len(connected_servers),
        })
    )


def get_tools_for_openrouter() -> list[dict[str, Any]]:
    """
    Return tool schemas in OpenAI-compatible format for injection into
    every OpenRouter request.

    SDD Section 7.2
    """
    tools = []
    for name, entry in tool_registry.items():
        schema = entry["schema"]
        tools.append({
            "type": "function",
            "function": {
                "name": schema.get("name", name),
                "description": schema.get("description", ""),
                "parameters": schema.get("inputSchema", {"type": "object", "properties": {}}),
            },
        })
    return tools


# ---------------------------------------------------------------------------
# Built-in Rendara tool execution
# ---------------------------------------------------------------------------
async def _execute_rendara_tool(
    tool_name: str,
    arguments: dict[str, Any],
) -> tuple[bool, Any, int, str, str]:
    import uuid as _uuid
    start_ms = int(time.monotonic() * 1000)
    try:
        if tool_name == "create_dashboard":
            dash_id = str(_uuid.uuid4())
            tiles = arguments.get("tiles", [])
            dash = await database.create_dashboard(
                dash_id,
                arguments.get("title", "Untitled Dashboard"),
                json.dumps(tiles),
            )
            duration_ms = int(time.monotonic() * 1000) - start_ms
            return (True, {"dashboard_id": dash["id"], "title": dash["title"]}, duration_ms, "rendara_tools", "")

        elif tool_name == "create_story":
            story_id = str(_uuid.uuid4())
            story = await database.create_story(
                story_id,
                arguments.get("title", "Untitled Story"),
                arguments.get("slides", []),
                arguments.get("auto_advance_interval"),
            )
            duration_ms = int(time.monotonic() * 1000) - start_ms
            return (True, {"story_id": story["id"], "title": story["title"], "slide_count": len(story.get("slides_json", []))}, duration_ms, "rendara_tools", "")

        elif tool_name == "update_dashboard":
            await database.update_dashboard(
                id=arguments["dashboard_id"],
                title=arguments.get("title"),
                tiles_json=json.dumps(arguments["tiles"]) if "tiles" in arguments else None,
            )
            duration_ms = int(time.monotonic() * 1000) - start_ms
            return (True, {"dashboard_id": arguments["dashboard_id"], "updated": True}, duration_ms, "rendara_tools", "")

        elif tool_name == "update_story":
            await database.update_story(
                id=arguments["story_id"],
                title=arguments.get("title"),
                slides_json=json.dumps(arguments["slides"]) if "slides" in arguments else None,
                auto_advance_interval=arguments.get("auto_advance_interval"),
            )
            duration_ms = int(time.monotonic() * 1000) - start_ms
            return (True, {"story_id": arguments["story_id"], "updated": True}, duration_ms, "rendara_tools", "")

        else:
            return (False, f"Unknown rendara tool: {tool_name}", 0, "rendara_tools", "TOOL_NOT_FOUND")

    except Exception as exc:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        return (False, str(exc), duration_ms, "rendara_tools", "MCP_TOOL_ERROR")


# ---------------------------------------------------------------------------
# Tool call execution
# ---------------------------------------------------------------------------
async def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    tool_call_id: str,
) -> tuple[bool, Any, int, str, str]:
    """
    Execute a tool call via MCP.

    Returns:
        (success, result, duration_ms, server_name, error_code)
        - success: True if tool call succeeded
        - result: tool result (parsed) or error message string
        - duration_ms: execution time in milliseconds
        - server_name: display name of the MCP server
        - error_code: one of MCP_UNREACHABLE|MCP_TIMEOUT|MCP_TOOL_ERROR|TOOL_NOT_FOUND
                      (empty string on success)

    SDD Section 7.3, 7.4
    """
    tool_timeout = float(app_config.mcp.tool_timeout_seconds)

    # Check registry
    if tool_name not in tool_registry:
        return (
            False,
            "Tool not available",
            0,
            "unknown",
            "TOOL_NOT_FOUND",
        )

    entry = tool_registry[tool_name]
    server_name = entry["server_name"]
    server_config = entry["server_config"]

    # Built-in tools (server_config is None) — dispatch by server_name
    if server_config is None:
        if server_name == "rendara_tools":
            return await _execute_rendara_tool(tool_name, arguments)
        return (False, "Tool not available", 0, server_name, "TOOL_NOT_FOUND")

    start_ms = int(time.monotonic() * 1000)

    try:
        result = await asyncio.wait_for(
            _call_tool_on_server(server_config, tool_name, arguments, tool_timeout),
            timeout=tool_timeout,
        )
        duration_ms = int(time.monotonic() * 1000) - start_ms
        return (True, result, duration_ms, server_name, "")

    except asyncio.TimeoutError:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        return (
            False,
            f"Query timed out after {int(tool_timeout)} seconds",
            duration_ms,
            server_name,
            "MCP_TIMEOUT",
        )
    except (httpx.ConnectError, httpx.RemoteProtocolError, httpx.NetworkError):
        duration_ms = int(time.monotonic() * 1000) - start_ms
        return (
            False,
            f"MCP server '{server_name}' is unreachable",
            duration_ms,
            server_name,
            "MCP_UNREACHABLE",
        )
    except Exception as exc:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        return (
            False,
            str(exc),
            duration_ms,
            server_name,
            "MCP_TOOL_ERROR",
        )
