"""
Chat router — POST /api/chat/stream
"""

import json
from typing import AsyncGenerator, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import database
from services.stream_processor import generate_title, run_chat_stream

router = APIRouter()


class ChatStreamRequest(BaseModel):
    conversation_id: str
    message: str
    new_conversation: bool = False
    resource_id: Optional[str] = None  # "dashboard:{uuid}" or "story:{uuid}"


async def _filtered_stream(
    conversation_id: str, message: str, history: list, resource_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Wraps run_chat_stream to:
    1. Intercept the internal _persist event (never forward to client).
    2. Use the _persist payload to save messages to SQLite.
    """
    async for chunk in run_chat_stream(conversation_id, message, history, resource_id=resource_id):
        # chunk is a raw SSE line like "data: {...}\n\n"
        if chunk.startswith("data: "):
            try:
                payload = json.loads(chunk[6:].strip())
                if payload.get("type") == "_persist":
                    # Persist messages silently — do not yield to client
                    import uuid as _uuid
                    await database.persist_messages(
                        conv_id=conversation_id,
                        user_msg_id=f"umsg_{_uuid.uuid4().hex[:12]}",
                        user_content=payload.get("user_message", ""),
                        asst_msg_id=payload.get("message_id", f"amsg_{_uuid.uuid4().hex[:12]}"),
                        asst_content=payload.get("content_blocks", []),
                    )
                    continue
            except (json.JSONDecodeError, Exception):
                pass  # malformed or non-JSON chunk — yield as-is
        yield chunk


@router.post("/chat/stream")
async def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    """
    SSE streaming endpoint. Returns text/event-stream.
    Emits: text_delta, tool_call_start, tool_call_result, tool_call_error,
           viz_block, mermaid_block, message_complete, resource_updated, error events.
    """
    # Ensure conversation exists in DB
    existing = await database.get_conversation(request.conversation_id)
    if existing is None:
        title = generate_title(request.message)
        await database.create_conversation(request.conversation_id, title)

    # Fetch message history for context
    raw_messages = await database.list_messages(request.conversation_id)
    history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in raw_messages
    ]

    return StreamingResponse(
        _filtered_stream(request.conversation_id, request.message, history, resource_id=request.resource_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
