"""
OpenRouter streaming client.

Sends requests to OpenRouter using the OpenAI-compatible API.
Streams SSE delta tokens. Handles tool call signals.

SDD Section 6 — AI Agent Runtime Design
"""

import json
import logging
from typing import Any, AsyncGenerator, Optional

import httpx

from config import OPENROUTER_API_KEY, app_config

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


# ---------------------------------------------------------------------------
# Response chunk types yielded by stream_completion
# ---------------------------------------------------------------------------
# {"type": "text_delta", "delta": "..."}
# {"type": "tool_call", "id": "...", "name": "...", "arguments": "..."}
# {"type": "done", "usage": {"prompt_tokens": N, "completion_tokens": N}}
# {"type": "error", "message": "..."}


async def stream_completion(
    messages: list[dict[str, Any]],
    tools: Optional[list[dict[str, Any]]] = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Stream a completion from OpenRouter.

    Yields dicts:
    - {"type": "text_delta", "delta": str}
    - {"type": "tool_call", "id": str, "name": str, "arguments": str}
    - {"type": "done", "usage": dict}
    - {"type": "error", "message": str}

    Args:
        messages: Full messages array including system prompt
        tools: Optional list of tool schemas in OpenAI function format
    """
    cfg = app_config.llm
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rendara.app",
        "X-Title": "Rendara Data Analysis Agent",
    }

    payload: dict[str, Any] = {
        "model": cfg.model,
        "messages": messages,
        "max_tokens": cfg.max_tokens,
        "temperature": cfg.temperature,
        "stream": True,
    }
    if tools:
        payload["tools"] = tools

    timeout = httpx.Timeout(
        connect=10.0,
        read=float(cfg.request_timeout_seconds),
        write=10.0,
        pool=5.0,
    )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield {
                        "type": "error",
                        "message": f"OpenRouter returned {response.status_code}: {body.decode()[:200]}",
                    }
                    return

                # Accumulate partial tool call data across chunks
                tool_calls_accumulator: dict[int, dict[str, Any]] = {}

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data:"):
                        continue

                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        # Flush any accumulated tool calls
                        for idx in sorted(tool_calls_accumulator.keys()):
                            tc = tool_calls_accumulator[idx]
                            if tc.get("name"):
                                yield {
                                    "type": "tool_call",
                                    "id": tc.get("id", f"tc_{idx}"),
                                    "name": tc["name"],
                                    "arguments": tc.get("arguments", "{}"),
                                }
                        break

                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    # Extract usage if present
                    usage = chunk.get("usage")

                    choices = chunk.get("choices", [])
                    for choice in choices:
                        delta = choice.get("delta", {})
                        finish_reason = choice.get("finish_reason")

                        # Text delta
                        content = delta.get("content")
                        if content:
                            yield {"type": "text_delta", "delta": content}

                        # Tool calls (may be split across multiple chunks)
                        tool_calls = delta.get("tool_calls", [])
                        for tc_chunk in tool_calls:
                            idx = tc_chunk.get("index", 0)
                            if idx not in tool_calls_accumulator:
                                tool_calls_accumulator[idx] = {
                                    "id": "",
                                    "name": "",
                                    "arguments": "",
                                }
                            acc = tool_calls_accumulator[idx]
                            if tc_chunk.get("id"):
                                acc["id"] = tc_chunk["id"]
                            func = tc_chunk.get("function", {})
                            if func.get("name"):
                                acc["name"] += func["name"]
                            if func.get("arguments"):
                                acc["arguments"] += func["arguments"]

                        # On finish_reason, flush tool calls for this choice
                        if finish_reason in ("tool_calls", "stop"):
                            for idx in sorted(tool_calls_accumulator.keys()):
                                tc = tool_calls_accumulator[idx]
                                if tc.get("name"):
                                    yield {
                                        "type": "tool_call",
                                        "id": tc.get("id", f"tc_{idx}"),
                                        "name": tc["name"],
                                        "arguments": tc.get("arguments", "{}"),
                                    }
                            tool_calls_accumulator = {}

                    # Emit usage on the final chunk
                    if usage:
                        yield {
                            "type": "done",
                            "usage": {
                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                "completion_tokens": usage.get("completion_tokens", 0),
                            },
                        }

    except httpx.ConnectError as exc:
        yield {
            "type": "error",
            "message": f"Cannot connect to OpenRouter: {exc}",
        }
    except httpx.ReadTimeout:
        yield {
            "type": "error",
            "message": f"OpenRouter stream timed out after {cfg.request_timeout_seconds}s",
        }
    except httpx.HTTPError as exc:
        yield {
            "type": "error",
            "message": f"OpenRouter HTTP error: {exc}",
        }
