"""
Conversations router — CRUD endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import database

router = APIRouter()


def _camel(conv: dict) -> dict:
    """Normalize SQLite snake_case fields to camelCase for the frontend."""
    return {
        "id": conv["id"],
        "title": conv["title"],
        "createdAt": conv.get("created_at", ""),
        "updatedAt": conv.get("updated_at", ""),
    }


class UpdateConversationBody(BaseModel):
    title: Optional[str] = None


@router.get("/conversations")
async def list_conversations():
    """GET /api/conversations — all conversations, most recent first."""
    rows = await database.list_conversations()
    return [_camel(r) for r in rows]


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """GET /api/conversations/{id} — single conversation with all messages."""
    conv = await database.get_conversation(conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = await database.list_messages(conversation_id)
    return {**_camel(conv), "messages": messages}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """DELETE /api/conversations/{id} — soft delete (sets deleted_at)."""
    deleted = await database.soft_delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": conversation_id}


@router.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, body: UpdateConversationBody):
    """PATCH /api/conversations/{id} — update title."""
    if body.title is None:
        raise HTTPException(status_code=400, detail="title is required")
    updated = await database.update_conversation_title(conversation_id, body.title)
    if updated is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _camel(updated)
