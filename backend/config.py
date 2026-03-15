"""
Config loader — reads config.json, mcp_servers.json, and required env vars.
Fails fast at startup if required values are missing.

SDD Section 9.5, Section 13.1
"""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load .env if present (local development)
load_dotenv()

# ---------------------------------------------------------------------------
# Fail-fast: required environment variables
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
if not OPENROUTER_API_KEY:
    raise RuntimeError(
        "REQUIRED: OPENROUTER_API_KEY environment variable is not set. "
        "Set it in .env (local) or as a platform env var (production)."
    )

FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# Config dataclasses
# ---------------------------------------------------------------------------
@dataclass
class LLMConfig:
    model: str
    max_tokens: int
    temperature: float
    max_tool_rounds: int
    request_timeout_seconds: int


@dataclass
class MCPConfig:
    tool_timeout_seconds: int
    round_timeout_seconds: int


@dataclass
class DatabaseConfig:
    path: str


@dataclass
class AppConfig:
    llm: LLMConfig
    mcp: MCPConfig
    database: DatabaseConfig


@dataclass
class MCPServerConfig:
    name: str
    type: str
    endpoint: str
    description: str


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def _resolve_path(p: str, base: Path) -> Path:
    """Resolve path relative to base if not absolute."""
    resolved = Path(p)
    if not resolved.is_absolute():
        resolved = base / resolved
    return resolved


def load_app_config() -> AppConfig:
    """
    Load config.json. Fails fast if file is missing or malformed.
    DATABASE_PATH env var overrides config.json database.path.
    """
    config_path_str = os.environ.get("CONFIG_PATH", "")
    if config_path_str:
        config_path = Path(config_path_str)
    else:
        # Look for config.json in backend/ directory or project root
        backend_dir = Path(__file__).parent
        project_root = backend_dir.parent
        candidate = backend_dir / "config.json"
        if not candidate.exists():
            candidate = project_root / "config.json"
        config_path = candidate

    if not config_path.exists():
        raise RuntimeError(
            f"config.json not found at {config_path}. "
            "Ensure config.json is present in the backend/ directory."
        )

    try:
        with open(config_path) as f:
            raw: dict[str, Any] = json.load(f)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"config.json parse error: {e}") from e

    llm_raw = raw.get("llm", {})
    mcp_raw = raw.get("mcp", {})
    db_raw = raw.get("database", {})

    # DATABASE_PATH env var overrides config.json
    db_path = os.environ.get("DATABASE_PATH", db_raw.get("path", "./demo.db"))

    return AppConfig(
        llm=LLMConfig(
            model=llm_raw.get("model", "anthropic/claude-sonnet-4-5"),
            max_tokens=int(llm_raw.get("max_tokens", 4096)),
            temperature=float(llm_raw.get("temperature", 0.3)),
            max_tool_rounds=int(llm_raw.get("max_tool_rounds", 10)),
            request_timeout_seconds=int(llm_raw.get("request_timeout_seconds", 120)),
        ),
        mcp=MCPConfig(
            tool_timeout_seconds=int(mcp_raw.get("tool_timeout_seconds", 30)),
            round_timeout_seconds=int(mcp_raw.get("round_timeout_seconds", 60)),
        ),
        database=DatabaseConfig(path=db_path),
    )


def load_mcp_servers_config() -> list[MCPServerConfig]:
    """
    Load mcp_servers.json. Fails fast if file is missing or malformed.
    MCP_SERVERS_PATH env var overrides default location.
    """
    servers_path_str = os.environ.get("MCP_SERVERS_PATH", "")
    if servers_path_str:
        servers_path = Path(servers_path_str)
    else:
        backend_dir = Path(__file__).parent
        project_root = backend_dir.parent
        candidate = backend_dir / "mcp_servers.json"
        if not candidate.exists():
            candidate = project_root / "mcp_servers.json"
        servers_path = candidate

    if not servers_path.exists():
        raise RuntimeError(
            f"mcp_servers.json not found at {servers_path}. "
            "Ensure mcp_servers.json is present in the backend/ directory."
        )

    try:
        with open(servers_path) as f:
            raw: list[dict[str, Any]] = json.load(f)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"mcp_servers.json parse error: {e}") from e

    return [
        MCPServerConfig(
            name=s.get("name", "Unknown"),
            type=s.get("type", "sse"),
            endpoint=s.get("endpoint", ""),
            description=s.get("description", ""),
        )
        for s in raw
    ]


# ---------------------------------------------------------------------------
# Singleton instances (loaded once at import time)
# ---------------------------------------------------------------------------
app_config: AppConfig = load_app_config()
mcp_servers_config: list[MCPServerConfig] = load_mcp_servers_config()
