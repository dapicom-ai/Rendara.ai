"""
Suite 2: SSE Stream Format Tests.

Validates that the SSE stream logic produces correctly formatted events
per SDD Section 5.1 and Appendix B.

Tests the stream_processor module directly (unit tests, no actual LLM calls).

SDD Section 5.1 — SSE Event Schema
SDD Section 5.2 — Content Block Sentinels
SDD Section 8.1 — VizSpec Validation
SDD Appendix B — SSE Event Schema Reference
"""

import json
import os
import sys
import pytest
import pytest_asyncio

os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-key-for-testing")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara/backend")


from backend.services.stream_processor import (
    validate_viz_spec,
    generate_title,
    _sse,
    VIZ_START,
    VIZ_END,
    MMD_START,
    MMD_END,
    VALID_CHART_TYPES,
    _max_partial_sentinel_suffix,
    _make_state,
)


# ---------------------------------------------------------------------------
# SSE Formatting — _sse() helper
# ---------------------------------------------------------------------------

class TestSseFormatting:
    """SDD Section 5.1: Each event is transmitted as data: {JSON}\n\n"""

    def test_sse_format_text_delta(self):
        """text_delta event is formatted as data: {JSON}\n\n"""
        event = {"type": "text_delta", "delta": "Hello world"}
        result = _sse(event)
        assert result.startswith("data: ")
        assert result.endswith("\n\n")
        payload = result[len("data: "):-2]
        parsed = json.loads(payload)
        assert parsed["type"] == "text_delta"
        assert parsed["delta"] == "Hello world"

    def test_sse_format_tool_call_start(self):
        """tool_call_start event is correctly formatted."""
        event = {
            "type": "tool_call_start",
            "tool_call_id": "tc_01",
            "tool_name": "execute_query",
            "server_name": "SQL Analytics (Demo)",
            "arguments": {"sql": "SELECT * FROM sales"},
        }
        result = _sse(event)
        assert result.startswith("data: ")
        assert result.endswith("\n\n")
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "tool_call_start"
        assert parsed["tool_call_id"] == "tc_01"
        assert parsed["tool_name"] == "execute_query"
        assert parsed["server_name"] == "SQL Analytics (Demo)"
        assert "arguments" in parsed

    def test_sse_format_tool_call_result(self):
        """tool_call_result event contains all required fields."""
        event = {
            "type": "tool_call_result",
            "tool_call_id": "tc_01",
            "tool_name": "execute_query",
            "server_name": "SQL Analytics (Demo)",
            "success": True,
            "duration_ms": 143,
            "result_summary": "4 rows returned",
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "tool_call_result"
        assert parsed["success"] is True
        assert isinstance(parsed["duration_ms"], int)
        assert isinstance(parsed["result_summary"], str)

    def test_sse_format_tool_call_error(self):
        """tool_call_error event contains required fields."""
        event = {
            "type": "tool_call_error",
            "tool_call_id": "tc_01",
            "tool_name": "execute_query",
            "server_name": "SQL Analytics (Demo)",
            "error_code": "MCP_TOOL_ERROR",
            "error_message": "SQL validation failed",
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "tool_call_error"
        assert "error_code" in parsed
        assert "error_message" in parsed

    def test_sse_format_viz_block(self):
        """viz_block event contains block_id and spec."""
        spec = {
            "type": "bar",
            "title": "Revenue by Region",
            "data": [{"region": "AMER", "revenue": 1000}],
            "xKey": "region",
            "yKey": "revenue",
        }
        event = {
            "type": "viz_block",
            "block_id": "viz_01",
            "spec": spec,
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "viz_block"
        assert parsed["block_id"] == "viz_01"
        assert "spec" in parsed
        assert parsed["spec"]["type"] == "bar"

    def test_sse_format_mermaid_block(self):
        """mermaid_block event contains block_id and definition."""
        event = {
            "type": "mermaid_block",
            "block_id": "mmd_01",
            "definition": "flowchart TD\n  A --> B",
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "mermaid_block"
        assert parsed["block_id"] == "mmd_01"
        assert "definition" in parsed

    def test_sse_format_message_complete(self):
        """message_complete event contains conversation_id, message_id, usage."""
        event = {
            "type": "message_complete",
            "conversation_id": "conv_abc123",
            "message_id": "msg_xyz789",
            "usage": {"prompt_tokens": 1240, "completion_tokens": 387},
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "message_complete"
        assert parsed["conversation_id"] == "conv_abc123"
        assert parsed["message_id"] == "msg_xyz789"
        assert isinstance(parsed["usage"]["prompt_tokens"], int)
        assert isinstance(parsed["usage"]["completion_tokens"], int)

    def test_sse_format_error(self):
        """error event contains error_code, error_message, recoverable."""
        event = {
            "type": "error",
            "error_code": "OPENROUTER_UNAVAILABLE",
            "error_message": "LLM service unavailable.",
            "recoverable": True,
        }
        result = _sse(event)
        parsed = json.loads(result[len("data: "):-2])
        assert parsed["type"] == "error"
        assert "error_code" in parsed
        assert "error_message" in parsed
        assert isinstance(parsed["recoverable"], bool)


# ---------------------------------------------------------------------------
# Viz Validation (SDD Section 8.1)
# ---------------------------------------------------------------------------

class TestVizValidation:
    """SDD Section 8.1 — VizSpec validation rules"""

    def test_valid_bar_spec_passes(self):
        """Valid bar spec passes validation."""
        spec = {
            "type": "bar",
            "title": "Revenue by Region",
            "data": [{"region": "AMER", "revenue": 1000}],
            "xKey": "region",
            "yKey": "revenue",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_line_spec_passes(self):
        """Valid line spec passes validation."""
        spec = {
            "type": "line",
            "title": "Monthly Trend",
            "data": [{"month": "Jan", "sales": 500}],
            "xKey": "month",
            "yKey": "sales",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_area_spec_passes(self):
        """Valid area spec passes validation."""
        spec = {
            "type": "area",
            "title": "Growth",
            "data": [{"q": "Q1", "val": 100}],
            "xKey": "q",
            "yKey": "val",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_pie_spec_passes(self):
        """Valid pie spec passes validation."""
        spec = {
            "type": "pie",
            "title": "Market Share",
            "data": [{"segment": "Enterprise", "share": 60}],
            "xKey": "segment",
            "yKey": "share",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_scatter_spec_passes(self):
        """Valid scatter spec passes validation."""
        spec = {
            "type": "scatter",
            "title": "Deals vs Revenue",
            "data": [{"deals": 10, "revenue": 5000}],
            "xKey": "deals",
            "yKey": "revenue",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_composed_spec_passes(self):
        """Valid composed spec passes (requires y2Key)."""
        spec = {
            "type": "composed",
            "title": "Revenue and Units",
            "data": [{"month": "Jan", "revenue": 1000, "units": 50}],
            "xKey": "month",
            "yKey": "revenue",
            "y2Key": "units",
        }
        assert validate_viz_spec(spec) is True

    def test_valid_kpi_spec_passes(self):
        """Valid kpi spec passes validation."""
        spec = {
            "type": "kpi",
            "title": "KPI Dashboard",
            "data": [{"metric": "Revenue", "value": 1000}],
            "xKey": "metric",
            "yKey": "value",
        }
        # KPI is in VALID_CHART_TYPES but isValidKpiSpec uses different validation
        # Backend validate_viz_spec treats kpi as valid type
        assert validate_viz_spec(spec) is True

    def test_missing_type_fails(self):
        """Missing type field fails validation."""
        spec = {
            "title": "Chart",
            "data": [{"x": 1, "y": 2}],
            "xKey": "x",
            "yKey": "y",
        }
        assert validate_viz_spec(spec) is False

    def test_invalid_type_fails(self):
        """Invalid type value fails (e.g., 'histogram')."""
        # SDD 8.1: type must be one of the seven allowed values
        spec = {
            "type": "histogram",
            "title": "Distribution",
            "data": [{"x": 1, "y": 2}],
            "xKey": "x",
            "yKey": "y",
        }
        assert validate_viz_spec(spec) is False

    def test_empty_data_fails(self):
        """Empty data array fails validation."""
        # SDD 8.1 rule 2: data is a non-empty array
        spec = {
            "type": "bar",
            "title": "Empty Chart",
            "data": [],
            "xKey": "x",
            "yKey": "y",
        }
        assert validate_viz_spec(spec) is False

    def test_missing_xkey_in_data_fails(self):
        """xKey not present in data[0] fails validation."""
        # SDD 8.1 rule 3: xKey exists as key in data[0]
        spec = {
            "type": "bar",
            "title": "Chart",
            "data": [{"region": "AMER", "revenue": 1000}],
            "xKey": "nonexistent_key",
            "yKey": "revenue",
        }
        assert validate_viz_spec(spec) is False

    def test_missing_ykey_in_data_fails(self):
        """yKey not present in data[0] fails validation."""
        # SDD 8.1 rule 4: yKey exists as key in data[0]
        spec = {
            "type": "bar",
            "title": "Chart",
            "data": [{"region": "AMER", "revenue": 1000}],
            "xKey": "region",
            "yKey": "nonexistent_key",
        }
        assert validate_viz_spec(spec) is False

    def test_empty_title_fails(self):
        """Empty title fails validation."""
        # SDD 8.1 rule 5: title is a non-empty string
        spec = {
            "type": "bar",
            "title": "",
            "data": [{"x": 1, "y": 2}],
            "xKey": "x",
            "yKey": "y",
        }
        assert validate_viz_spec(spec) is False

    def test_composed_without_y2key_fails(self):
        """composed type without y2Key fails validation."""
        # SDD 8.1: y2Key additionally required for composed type
        spec = {
            "type": "composed",
            "title": "Composed Chart",
            "data": [{"month": "Jan", "revenue": 1000}],
            "xKey": "month",
            "yKey": "revenue",
            # y2Key is missing
        }
        assert validate_viz_spec(spec) is False

    def test_non_dict_input_fails(self):
        """Non-dict input fails validation."""
        assert validate_viz_spec(None) is False
        assert validate_viz_spec("string") is False
        assert validate_viz_spec([]) is False

    def test_valid_chart_types_set(self):
        """VALID_CHART_TYPES contains exactly the 7 specified types."""
        # SDD 8.1: bar, line, area, pie, scatter, composed, kpi
        expected = {"bar", "line", "area", "pie", "scatter", "composed", "kpi"}
        assert VALID_CHART_TYPES == expected


# ---------------------------------------------------------------------------
# Sentinel Constants
# ---------------------------------------------------------------------------

class TestSentinelConstants:
    """SDD Section 5.2 — Content Block Sentinels"""

    def test_viz_start_sentinel(self):
        """VIZ_START sentinel is <<<VIZ_START>>>."""
        assert VIZ_START == "<<<VIZ_START>>>"

    def test_viz_end_sentinel(self):
        """VIZ_END sentinel is <<<VIZ_END>>>."""
        assert VIZ_END == "<<<VIZ_END>>>"

    def test_mmd_start_sentinel(self):
        """MMD_START sentinel is <<<MMD_START>>>."""
        assert MMD_START == "<<<MMD_START>>>"

    def test_mmd_end_sentinel(self):
        """MMD_END sentinel is <<<MMD_END>>>."""
        assert MMD_END == "<<<MMD_END>>>"


# ---------------------------------------------------------------------------
# Title Generation (SDD Section 11.2)
# ---------------------------------------------------------------------------

class TestTitleGeneration:
    """SDD Section 11.2 — Conversation Title Generation"""

    def test_title_is_first_message_truncated_to_100(self):
        """Title is the first message truncated to 100 characters."""
        long_message = "A" * 150
        title = generate_title(long_message)
        assert len(title) == 100
        assert title == "A" * 100

    def test_short_message_title_unchanged(self):
        """Short messages are used as-is for title."""
        message = "Hello, what are total sales?"
        title = generate_title(message)
        assert title == message


# ---------------------------------------------------------------------------
# Partial Sentinel Detection (SDD Section 5.3)
# ---------------------------------------------------------------------------

class TestPartialSentinelDetection:
    """SDD Section 5.3 — Sentinel state machine partial match detection"""

    def test_no_partial_match_returns_zero(self):
        """Text with no sentinel prefix returns 0 (safe to emit all)."""
        result = _max_partial_sentinel_suffix("Hello world")
        assert result == 0

    def test_partial_viz_start_detected(self):
        """Text ending with partial VIZ_START prefix returns positive length."""
        # Text ending in "<<<VIZ" — should hold back 6 chars
        text = "Some text <<<VIZ"
        result = _max_partial_sentinel_suffix(text)
        assert result > 0

    def test_full_sentinel_not_partial(self):
        """Full sentinel string is already handled, so partial match of empty suffix is 0."""
        # An empty string has no partial match
        result = _max_partial_sentinel_suffix("")
        assert result == 0
