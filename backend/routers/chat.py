"""
Chat router — POST /api/chat/stream

The LLM stream runs in a background asyncio task so it continues to
completion (and persists messages) even if the client disconnects mid-stream.
The SSE response reads from an asyncio.Queue bridging the two.
"""

import asyncio
import json
import logging
import uuid as _uuid
from typing import AsyncGenerator, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import database
from services.stream_processor import generate_title, run_chat_stream

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatStreamRequest(BaseModel):
    conversation_id: str
    message: str
    new_conversation: bool = False
    resource_id: Optional[str] = None  # "dashboard:{uuid}" or "story:{uuid}"


async def _stream_worker(
    queue: asyncio.Queue,
    conversation_id: str,
    message: str,
    history: list,
    resource_id: Optional[str] = None,
) -> None:
    """
    Runs the full LLM stream in the background. Writes each SSE chunk to
    the queue for the client reader. Always completes — even if the client
    disconnects, the stream finishes and messages are persisted.
    """
    try:
        async for chunk in run_chat_stream(conversation_id, message, history, resource_id=resource_id):
            # Intercept _persist event — persist to DB, don't forward to client
            if chunk.startswith("data: "):
                try:
                    payload = json.loads(chunk[6:].strip())
                    if payload.get("type") == "_persist":
                        await database.persist_messages(
                            conv_id=conversation_id,
                            user_msg_id=f"umsg_{_uuid.uuid4().hex[:12]}",
                            user_content=payload.get("user_message", ""),
                            asst_msg_id=payload.get("message_id", f"amsg_{_uuid.uuid4().hex[:12]}"),
                            asst_content=payload.get("content_blocks", []),
                        )
                        continue
                except (json.JSONDecodeError, Exception):
                    pass  # malformed chunk — forward as-is

            await queue.put(chunk)
    except Exception as exc:
        logger.exception(f"Stream worker error for conversation {conversation_id}: {exc}")
        # Send error event to client if still connected
        error_chunk = f'data: {json.dumps({"type": "error", "error_code": "INTERNAL_ERROR", "error_message": "An internal error occurred."})}\n\n'
        await queue.put(error_chunk)
    finally:
        # Signal end of stream
        await queue.put(None)


async def _queue_reader(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    """Read SSE chunks from the queue until None (end signal)."""
    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        yield chunk


@router.post("/chat/stream")
async def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    """
    SSE streaming endpoint. Returns text/event-stream.

    The LLM + tool call loop runs in a background task that always completes,
    even if the client navigates away. This ensures messages are persisted
    regardless of client connection state.
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

    # Start the stream worker as a background task
    queue: asyncio.Queue = asyncio.Queue(maxsize=64)
    asyncio.create_task(
        _stream_worker(queue, request.conversation_id, request.message, history, resource_id=request.resource_id)
    )

    return StreamingResponse(
        _queue_reader(queue),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
