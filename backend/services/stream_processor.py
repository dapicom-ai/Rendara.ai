"""
SSE event assembly, sentinel parsing, and viz validation.

Processes the OpenRouter stream and emits typed SSE events to the frontend.
Handles the tool call loop (multi-round, max_tool_rounds hard stop).

SDD Section 5.2 — Content Block Sentinels
SDD Section 5.3 — Backend Stream Processing Logic
SDD Section 6.2 — Tool Calling Model
SDD Section 8.1 — JSON Viz Specification Schema / Validation
SDD Section 12.3 — Structured Logging
"""

import json
import logging
import time
import uuid
from typing import Any, AsyncGenerator, Optional

from config import app_config
from prompts.system_prompt import build_system_prompt
from services import mcp_client, openrouter
import database

logger = logging.getLogger(__name__)

# Sentinels
VIZ_START = "<<<VIZ_START>>>"
VIZ_END = "<<<VIZ_END>>>"
MMD_START = "<<<MMD_START>>>"
MMD_END = "<<<MMD_END>>>"

VALID_CHART_TYPES = {"bar", "line", "area", "pie", "scatter", "composed", "kpi"}


def _sse(event: dict[str, Any]) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(event)}\n\n"


# ---------------------------------------------------------------------------
# Viz validation (SDD Section 8.1)
# ---------------------------------------------------------------------------
def validate_viz_spec(spec: dict[str, Any]) -> bool:
    """
    Validate a viz spec before emitting a viz_block event.
    Returns True if valid, False if it should be silently skipped (DR-07).
    """
    if not isinstance(spec, dict):
        return False
    chart_type = spec.get("type")
    if chart_type not in VALID_CHART_TYPES:
        return False
    title = spec.get("title")
    if not isinstance(title, str) or not title.strip():
        return False
    data = spec.get("data")
    if not isinstance(data, list) or len(data) == 0:
        return False
    first_row = data[0]
    if not isinstance(first_row, dict):
        return False
    x_key = spec.get("xKey")
    y_key = spec.get("yKey")
    if x_key not in first_row:
        return False
    if y_key not in first_row:
        return False
    if chart_type == "composed":
        y2_key = spec.get("y2Key")
        if not y2_key or y2_key not in first_row:
            return False
    return True


# ---------------------------------------------------------------------------
# Context assembly (SDD Section 6.3 / 11.1)
# ---------------------------------------------------------------------------
def assemble_messages(
    history: list[dict[str, Any]],
    user_message: str,
    resource_context: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Build the messages array for OpenRouter.
    Sliding window: last 10 messages. Text content only (no viz data).
    System prompt is dynamically generated based on connected MCP servers.
    If resource_context is provided, it is injected as an additional system message
    after the main system prompt so the LLM knows which resource it is editing.
    """
    system_prompt = build_system_prompt(mcp_client.connected_servers)
    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    if resource_context:
        messages.append({"role": "system", "content": resource_context})

    # Sliding window: last 10
    recent = history[-10:] if len(history) > 10 else history
    for msg in recent:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        # Extract text-only content from assistant messages
        if role == "assistant" and isinstance(content, list):
            text_parts = [
                block.get("text", "")
                for block in content
                if isinstance(block, dict) and block.get("type") == "text"
            ]
            text_content = "\n".join(text_parts).strip()
            if text_content:
                messages.append({"role": role, "content": text_content})
        elif role == "user" and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content})
        elif isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages


# ---------------------------------------------------------------------------
# Title generation (SDD Section 11.2)
# ---------------------------------------------------------------------------
def generate_title(first_message: str) -> str:
    return first_message[:100]


# ---------------------------------------------------------------------------
# Main streaming orchestrator
# ---------------------------------------------------------------------------
async def run_chat_stream(
    conversation_id: str,
    user_message: str,
    history: list[dict[str, Any]],
    resource_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Full chat stream orchestrator. Yields SSE-formatted strings.

    Implements:
    1. Context assembly
    2. Multi-round LLM + tool call loop (max_tool_rounds)
    3. Sentinel parsing for viz_block and mermaid_block
    4. text_delta emission
    5. tool_call_start / tool_call_result / tool_call_error emission
    6. message_complete emission
    7. Structured logging

    SDD Section 5.3
    """
    stream_start_ms = int(time.monotonic() * 1000)
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    tool_rounds = 0
    max_tool_rounds = app_config.llm.max_tool_rounds

    logger.info(json.dumps({
        "timestamp": _iso_now(),
        "level": "INFO",
        "event": "chat_stream_start",
        "conversation_id": conversation_id,
        "message_id": message_id,
    }))

    # Build resource context injection (when editing a dashboard or story)
    resource_context: Optional[str] = None
    if resource_id:
        try:
            resource_type, resource_uuid = resource_id.split(":", 1)
            if resource_type == "dashboard":
                resource = await database.get_dashboard(resource_uuid)
                if resource:
                    current_data = json.dumps(resource["layout_json"], indent=2)
                    resource_context = (
                        f"You are editing an existing dashboard. Current state:\n"
                        f"ID: {resource_uuid}\n"
                        f"Title: {resource['title']}\n"
                        f"Current tiles: {current_data}\n\n"
                        f"Use update_dashboard to apply changes.\n"
                        f"Do not create a new dashboard unless explicitly asked.\n"
                        f"Always pass the FULL tiles array — partial updates are not supported.\n"
                        f"Re-use data already retrieved in this conversation. Do not re-query unless needed."
                    )
            elif resource_type == "story":
                resource = await database.get_story(resource_uuid)
                if resource:
                    current_data = json.dumps(resource["slides_json"], indent=2)
                    resource_context = (
                        f"You are editing an existing story. Current state:\n"
                        f"ID: {resource_uuid}\n"
                        f"Title: {resource['title']}\n"
                        f"Current slides: {current_data}\n\n"
                        f"Use update_story to apply changes.\n"
                        f"Do not create a new story unless explicitly asked.\n"
                        f"Always pass the FULL slides array — partial updates are not supported.\n"
                        f"Re-use data already retrieved in this conversation. Do not re-query unless needed."
                    )
        except Exception as exc:
            logger.warning(json.dumps({
                "event": "resource_context_error",
                "resource_id": resource_id,
                "error": str(exc),
            }))

    # Assemble initial messages
    messages = assemble_messages(history, user_message, resource_context=resource_context)
    tools = mcp_client.get_tools_for_openrouter()

    # Accumulated content blocks for the assistant message (for persistence)
    content_blocks: list[dict[str, Any]] = []
    # Running text accumulator (flushed when we switch to a different block type)
    current_text = ""
    # Sentinel state machine
    sentinel_buffer = ""
    in_viz_block = False
    in_mmd_block = False
    viz_counter = 0
    mmd_counter = 0
    # Token usage (accumulated from the final LLM response)
    final_usage: dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0}

    try:
        while True:
            # Hard stop on tool rounds
            if tool_rounds >= max_tool_rounds:
                logger.warning(json.dumps({
                    "event": "max_tool_rounds_reached",
                    "conversation_id": conversation_id,
                    "max_tool_rounds": max_tool_rounds,
                }))
                fallback = (
                    "I wasn't able to retrieve the data for that question — "
                    "the research took more steps than expected. "
                    "Could you try rephrasing your question, or ask for something more specific?"
                )
                yield _sse({"type": "text_delta", "delta": fallback})
                content_blocks.append({"type": "text", "text": fallback})
                current_text = ""
                break

            # Collect tool calls from this LLM turn
            turn_tool_calls: list[dict[str, Any]] = []
            got_done = False

            async for chunk in openrouter.stream_completion(messages, tools if tools else None):
                ctype = chunk["type"]

                if ctype == "error":
                    # Fatal stream error
                    logger.error(json.dumps({
                        "event": "openrouter_error",
                        "conversation_id": conversation_id,
                        "message": chunk["message"],
                    }))
                    # Flush any accumulated text
                    if current_text:
                        content_blocks.append({"type": "text", "text": current_text})
                        current_text = ""
                    yield _sse({
                        "type": "error",
                        "error_code": "OPENROUTER_UNAVAILABLE",
                        "error_message": chunk["message"],
                        "recoverable": True,
                    })
                    return

                elif ctype == "text_delta":
                    delta: str = chunk["delta"]
                    # Feed into sentinel state machine
                    async for sse_event in _process_text_delta(
                        delta,
                        sentinel_buffer_ref=_Ref(sentinel_buffer),
                        current_text_ref=_Ref(current_text),
                        in_viz_ref=_Ref(in_viz_block),
                        in_mmd_ref=_Ref(in_mmd_block),
                        viz_counter_ref=_Ref(viz_counter),
                        mmd_counter_ref=_Ref(mmd_counter),
                        content_blocks=content_blocks,
                    ):
                        # Update mutable refs
                        sentinel_buffer = sse_event["_state"]["sentinel_buffer"]
                        current_text = sse_event["_state"]["current_text"]
                        in_viz_block = sse_event["_state"]["in_viz"]
                        in_mmd_block = sse_event["_state"]["in_mmd"]
                        viz_counter = sse_event["_state"]["viz_counter"]
                        mmd_counter = sse_event["_state"]["mmd_counter"]
                        if sse_event.get("_emit"):
                            yield sse_event["_emit"]

                elif ctype == "tool_call":
                    turn_tool_calls.append(chunk)

                elif ctype == "done":
                    usage = chunk.get("usage", {})
                    final_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
                    final_usage["completion_tokens"] += usage.get("completion_tokens", 0)
                    got_done = True

            # After this LLM turn completes:
            # If there are tool calls, execute them and loop
            if turn_tool_calls:
                tool_rounds += 1

                # Build the assistant message with tool_calls for the messages array
                asst_tool_calls_for_messages = []
                tool_result_messages = []

                for tc in turn_tool_calls:
                    tc_id = tc.get("id") or f"tc_{uuid.uuid4().hex[:8]}"
                    tc_name = tc["name"]
                    tc_args_str = tc.get("arguments", "{}")

                    # Parse arguments
                    try:
                        tc_args = json.loads(tc_args_str)
                    except json.JSONDecodeError:
                        tc_args = {}

                    # Find server name for this tool
                    entry = mcp_client.tool_registry.get(tc_name, {})
                    server_name = entry.get("server_name", "unknown")

                    logger.info(json.dumps({
                        "timestamp": _iso_now(),
                        "level": "INFO",
                        "event": "tool_call_start",
                        "conversation_id": conversation_id,
                        "tool_call_id": tc_id,
                        "tool_name": tc_name,
                        "server_name": server_name,
                    }))

                    # Emit tool_call_start SSE
                    yield _sse({
                        "type": "tool_call_start",
                        "tool_call_id": tc_id,
                        "tool_name": tc_name,
                        "server_name": server_name,
                        "arguments": tc_args,
                    })

                    # Execute the tool
                    call_start_ms = int(time.monotonic() * 1000)
                    success, result, duration_ms, srv_name, error_code = (
                        await mcp_client.execute_tool(tc_name, tc_args, tc_id)
                    )

                    # Always add to assistant tool_calls list
                    asst_tool_calls_for_messages.append({
                        "id": tc_id,
                        "type": "function",
                        "function": {
                            "name": tc_name,
                            "arguments": tc_args_str,
                        },
                    })

                    if success:
                        # Build result summary
                        if isinstance(result, dict) and "row_count" in result:
                            result_summary = f"{result['row_count']} rows returned"
                        elif isinstance(result, list):
                            result_summary = f"{len(result)} items returned"
                        else:
                            result_summary = "Tool completed successfully"

                        logger.info(json.dumps({
                            "timestamp": _iso_now(),
                            "level": "INFO",
                            "event": "tool_call_complete",
                            "conversation_id": conversation_id,
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "duration_ms": duration_ms,
                            "result_summary": result_summary,
                        }))

                        result_event: dict[str, Any] = {
                            "type": "tool_call_result",
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "server_name": srv_name,
                            "success": True,
                            "duration_ms": duration_ms,
                            "result_summary": result_summary,
                        }
                        if isinstance(result, dict):
                            result_event["tool_result"] = result
                        yield _sse(result_event)

                        # Emit resource_updated for update_dashboard / update_story
                        if tc_name == "update_dashboard" and isinstance(result, dict):
                            yield _sse({
                                "type": "resource_updated",
                                "resource_type": "dashboard",
                                "resource_id": result.get("dashboard_id", ""),
                            })
                        elif tc_name == "update_story" and isinstance(result, dict):
                            yield _sse({
                                "type": "resource_updated",
                                "resource_type": "story",
                                "resource_id": result.get("story_id", ""),
                            })

                        # Record in content blocks
                        tool_call_block: dict[str, Any] = {
                            "type": "tool_call",
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "server_name": srv_name,
                            "success": True,
                            "duration_ms": duration_ms,
                            "error_code": None,
                            "error_message": None,
                        }
                        if isinstance(result, dict):
                            tool_call_block["tool_result"] = result
                        content_blocks.append(tool_call_block)

                        result_str = json.dumps(result) if not isinstance(result, str) else result
                        tool_result_messages.append({
                            "role": "tool",
                            "tool_call_id": tc_id,
                            "content": result_str,
                        })

                    else:
                        logger.warning(json.dumps({
                            "timestamp": _iso_now(),
                            "level": "WARNING",
                            "event": "tool_call_error",
                            "conversation_id": conversation_id,
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "error_code": error_code,
                            "error_message": result,
                        }))

                        yield _sse({
                            "type": "tool_call_error",
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "server_name": srv_name,
                            "error_code": error_code,
                            "error_message": str(result),
                        })

                        content_blocks.append({
                            "type": "tool_call",
                            "tool_call_id": tc_id,
                            "tool_name": tc_name,
                            "server_name": srv_name,
                            "success": False,
                            "duration_ms": duration_ms,
                            "error_code": error_code,
                            "error_message": str(result),
                        })

                        tool_result_messages.append({
                            "role": "tool",
                            "tool_call_id": tc_id,
                            "content": str(result),
                        })

                # Insert assistant message FIRST, then tool results (correct API order)
                if asst_tool_calls_for_messages:
                    messages.append({
                        "role": "assistant",
                        "tool_calls": asst_tool_calls_for_messages,
                        "content": None,
                    })
                messages.extend(tool_result_messages)

                # Continue the loop for the next LLM round
                continue

            else:
                # No tool calls — LLM is done with this turn
                break

        # Flush any remaining text
        if current_text.strip():
            content_blocks.append({"type": "text", "text": current_text})
            current_text = ""

        # Flush any lingering sentinel buffer as text (shouldn't happen normally)
        if sentinel_buffer.strip():
            yield _sse({"type": "text_delta", "delta": sentinel_buffer})
            content_blocks.append({"type": "text", "text": sentinel_buffer})

        # Calculate total duration
        total_duration_ms = int(time.monotonic() * 1000) - stream_start_ms

        logger.info(json.dumps({
            "timestamp": _iso_now(),
            "level": "INFO",
            "event": "chat_stream_complete",
            "conversation_id": conversation_id,
            "message_id": message_id,
            "tool_rounds": tool_rounds,
            "total_duration_ms": total_duration_ms,
            "prompt_tokens": final_usage["prompt_tokens"],
            "completion_tokens": final_usage["completion_tokens"],
        }))

        # Persist messages BEFORE signalling completion to the client.
        # This ensures the DB write happens even if the client disconnects
        # immediately after receiving message_complete.
        yield _sse({
            "type": "_persist",
            "message_id": message_id,
            "user_message": user_message,
            "content_blocks": content_blocks,
        })

        yield _sse({
            "type": "message_complete",
            "conversation_id": conversation_id,
            "message_id": message_id,
            "usage": final_usage,
        })

    except Exception as exc:
        logger.exception(json.dumps({
            "timestamp": _iso_now(),
            "level": "ERROR",
            "event": "stream_internal_error",
            "conversation_id": conversation_id,
            "error": str(exc),
        }))
        yield _sse({
            "type": "error",
            "error_code": "INTERNAL_ERROR",
            "error_message": "An internal error occurred. Please try again.",
            "recoverable": True,
        })


# ---------------------------------------------------------------------------
# Sentinel state machine — processes a single text delta
# ---------------------------------------------------------------------------
class _Ref:
    """Simple mutable reference wrapper."""
    def __init__(self, value: Any):
        self.value = value


async def _process_text_delta(
    delta: str,
    sentinel_buffer_ref: "_Ref",
    current_text_ref: "_Ref",
    in_viz_ref: "_Ref",
    in_mmd_ref: "_Ref",
    viz_counter_ref: "_Ref",
    mmd_counter_ref: "_Ref",
    content_blocks: list[dict[str, Any]],
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Process a text delta through the sentinel state machine.

    Yields dicts with:
    - "_state": updated state
    - "_emit": optional SSE string to emit (may be absent)

    Handles:
    - Text outside sentinels -> emit text_delta immediately
    - <<<VIZ_START>>> -> start buffering viz JSON
    - <<<VIZ_END>>> -> validate and emit viz_block (or skip)
    - <<<MMD_START>>> -> start buffering mermaid definition
    - <<<MMD_END>>> -> emit mermaid_block
    """
    sentinel_buffer = sentinel_buffer_ref.value
    current_text = current_text_ref.value
    in_viz = in_viz_ref.value
    in_mmd = in_mmd_ref.value
    viz_counter = viz_counter_ref.value
    mmd_counter = mmd_counter_ref.value

    # Accumulate into sentinel_buffer; process character by character
    # but work on the full delta for efficiency
    sentinel_buffer += delta

    while True:
        if in_viz:
            end_idx = sentinel_buffer.find(VIZ_END)
            if end_idx != -1:
                viz_content = sentinel_buffer[:end_idx]
                sentinel_buffer = sentinel_buffer[end_idx + len(VIZ_END):]
                in_viz = False
                # Validate and emit
                viz_counter += 1
                block_id = f"viz_{viz_counter:02d}"
                try:
                    spec = json.loads(viz_content.strip())
                    if validate_viz_spec(spec):
                        event = {
                            "type": "viz_block",
                            "block_id": block_id,
                            "spec": spec,
                        }
                        content_blocks.append({
                            "type": "viz_chart",
                            "spec": spec,
                        })
                        yield {
                            "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                            "_emit": _sse(event),
                        }
                    else:
                        logger.warning(json.dumps({
                            "event": "viz_block_invalid",
                            "reason": "validation_failed",
                            "spec_type": spec.get("type") if isinstance(spec, dict) else "unknown",
                        }))
                        yield {
                            "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                        }
                except json.JSONDecodeError as e:
                    logger.warning(json.dumps({
                        "event": "viz_block_invalid",
                        "reason": f"json_parse_error: {e}",
                    }))
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                    }
                continue
            else:
                # Still buffering viz content — no emit
                yield {
                    "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                }
                break

        elif in_mmd:
            end_idx = sentinel_buffer.find(MMD_END)
            if end_idx != -1:
                mmd_content = sentinel_buffer[:end_idx].strip()
                sentinel_buffer = sentinel_buffer[end_idx + len(MMD_END):]
                in_mmd = False
                mmd_counter += 1
                block_id = f"mmd_{mmd_counter:02d}"
                if mmd_content:
                    event = {
                        "type": "mermaid_block",
                        "block_id": block_id,
                        "definition": mmd_content,
                    }
                    content_blocks.append({
                        "type": "mermaid",
                        "definition": mmd_content,
                    })
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                        "_emit": _sse(event),
                    }
                else:
                    # Empty mermaid block — skip (SDD Section 6.5)
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                    }
                continue
            else:
                yield {
                    "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                }
                break

        else:
            # Not inside a sentinel block
            # Check if any sentinel starts appear in the buffer
            viz_start_idx = sentinel_buffer.find(VIZ_START)
            mmd_start_idx = sentinel_buffer.find(MMD_START)

            # Also handle partial sentinel matches at end of buffer
            # (don't emit text that might be the start of a sentinel)
            partial_match_len = _max_partial_sentinel_suffix(sentinel_buffer)

            if viz_start_idx != -1 and (mmd_start_idx == -1 or viz_start_idx <= mmd_start_idx):
                # Emit text before the sentinel
                text_before = sentinel_buffer[:viz_start_idx]
                if text_before:
                    current_text += text_before
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                        "_emit": _sse({"type": "text_delta", "delta": text_before}),
                    }
                sentinel_buffer = sentinel_buffer[viz_start_idx + len(VIZ_START):]
                in_viz = True
                # Flush text block
                if current_text.strip():
                    content_blocks.append({"type": "text", "text": current_text})
                current_text = ""
                continue

            elif mmd_start_idx != -1:
                # Emit text before the sentinel
                text_before = sentinel_buffer[:mmd_start_idx]
                if text_before:
                    current_text += text_before
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                        "_emit": _sse({"type": "text_delta", "delta": text_before}),
                    }
                sentinel_buffer = sentinel_buffer[mmd_start_idx + len(MMD_START):]
                in_mmd = True
                # Flush text block
                if current_text.strip():
                    content_blocks.append({"type": "text", "text": current_text})
                current_text = ""
                continue

            else:
                # No sentinel found — emit safe portion (hold back potential partial)
                safe_len = len(sentinel_buffer) - partial_match_len
                if safe_len > 0:
                    safe_text = sentinel_buffer[:safe_len]
                    sentinel_buffer = sentinel_buffer[safe_len:]
                    current_text += safe_text
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                        "_emit": _sse({"type": "text_delta", "delta": safe_text}),
                    }
                else:
                    yield {
                        "_state": _make_state(sentinel_buffer, current_text, in_viz, in_mmd, viz_counter, mmd_counter),
                    }
                break


def _make_state(
    sentinel_buffer: str,
    current_text: str,
    in_viz: bool,
    in_mmd: bool,
    viz_counter: int,
    mmd_counter: int,
) -> dict[str, Any]:
    return {
        "sentinel_buffer": sentinel_buffer,
        "current_text": current_text,
        "in_viz": in_viz,
        "in_mmd": in_mmd,
        "viz_counter": viz_counter,
        "mmd_counter": mmd_counter,
    }


def _max_partial_sentinel_suffix(text: str) -> int:
    """
    Return the length of the longest suffix of `text` that is a prefix
    of any sentinel string. Used to avoid emitting text that could be
    the start of a sentinel split across chunks.
    """
    sentinels = [VIZ_START, VIZ_END, MMD_START, MMD_END]
    max_len = 0
    for sentinel in sentinels:
        for length in range(1, min(len(sentinel), len(text)) + 1):
            if sentinel.startswith(text[-length:]):
                if length > max_len:
                    max_len = length
    return max_len


def _iso_now() -> str:
    import datetime
    return datetime.datetime.utcnow().isoformat() + "Z"
