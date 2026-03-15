"""
Suite 4a: Config & MCP Config Tests.

Tests config.json and mcp_servers.json loading.

SDD Section 9.5 — Config files
SDD Section 13.1 — Secrets Management
"""

import os
import sys
import json
import pytest
from pathlib import Path

os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-key-for-testing")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara/backend")

BACKEND_DIR = Path("/home/Daniel/workingfolder/rendara/backend")
CONFIG_PATH = BACKEND_DIR / "config.json"
MCP_SERVERS_PATH = BACKEND_DIR / "mcp_servers.json"


class TestConfigJson:
    """SDD Section 9.5 — config.json structure"""

    def test_config_json_exists(self):
        """config.json exists in backend/ directory."""
        assert CONFIG_PATH.exists(), f"config.json not found at {CONFIG_PATH}"

    def test_config_json_parses(self):
        """config.json parses as valid JSON."""
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert isinstance(raw, dict)

    def test_config_json_has_llm_key(self):
        """config.json has top-level 'llm' key."""
        # SDD 9.5: expected structure with llm, mcp, database keys
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert "llm" in raw, "config.json missing 'llm' key"

    def test_config_json_has_mcp_key(self):
        """config.json has top-level 'mcp' key."""
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert "mcp" in raw, "config.json missing 'mcp' key"

    def test_config_json_has_database_key(self):
        """config.json has top-level 'database' key."""
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert "database" in raw, "config.json missing 'database' key"

    def test_llm_defaults_max_tokens(self):
        """LLM config default: max_tokens: 4096."""
        # SDD 6.4: max_tokens: 4096
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert raw["llm"].get("max_tokens") == 4096

    def test_llm_defaults_temperature(self):
        """LLM config default: temperature: 0.3."""
        # SDD 6.4: temperature: 0.3
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert raw["llm"].get("temperature") == 0.3

    def test_llm_defaults_max_tool_rounds(self):
        """LLM config default: max_tool_rounds: 10."""
        # SDD 6.4: max_tool_rounds: 10
        with open(CONFIG_PATH) as f:
            raw = json.load(f)
        assert raw["llm"].get("max_tool_rounds") == 10

    def test_config_loader_loads_correctly(self):
        """AppConfig loads with correct values from config.json."""
        from backend.config import app_config
        assert app_config.llm.max_tokens == 4096
        assert app_config.llm.temperature == 0.3
        assert app_config.llm.max_tool_rounds == 10
        assert app_config.llm.request_timeout_seconds == 120
        assert app_config.mcp.tool_timeout_seconds == 30
        assert app_config.mcp.round_timeout_seconds == 60


class TestMcpServersJson:
    """SDD Section 9.5 — mcp_servers.json structure"""

    def test_mcp_servers_json_exists(self):
        """mcp_servers.json exists in backend/ directory."""
        assert MCP_SERVERS_PATH.exists(), f"mcp_servers.json not found at {MCP_SERVERS_PATH}"

    def test_mcp_servers_json_parses(self):
        """mcp_servers.json parses as valid JSON."""
        with open(MCP_SERVERS_PATH) as f:
            raw = json.load(f)
        assert isinstance(raw, list)

    def test_mcp_servers_have_required_fields(self):
        """Each server object has 'name', 'type', 'endpoint', 'description' fields."""
        # SDD 9.5: mcp_servers.json format
        with open(MCP_SERVERS_PATH) as f:
            servers = json.load(f)
        for server in servers:
            assert "name" in server, f"Server missing 'name': {server}"
            assert "type" in server, f"Server missing 'type': {server}"
            assert "endpoint" in server, f"Server missing 'endpoint': {server}"
            assert "description" in server, f"Server missing 'description': {server}"

    def test_mcp_servers_config_loader(self):
        """load_mcp_servers_config() returns list of MCPServerConfig objects."""
        from backend.config import mcp_servers_config, MCPServerConfig
        assert isinstance(mcp_servers_config, list)
        for srv in mcp_servers_config:
            assert isinstance(srv, MCPServerConfig)
            assert isinstance(srv.name, str)
            assert isinstance(srv.endpoint, str)
