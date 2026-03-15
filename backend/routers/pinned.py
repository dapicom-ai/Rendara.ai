"""
Pinned Responses router — CRUD for /api/pinned.
"""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

import database

router = APIRouter()


class CreatePinnedBody(BaseModel):
    title: str = "Untitled"
    description: str = ""
    content_json: Any = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None


class UpdatePinnedBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


def _camel_pinned(p: dict) -> dict:
    return {
        "id": p["id"],
        "conversationId": p.get("conversation_id"),
        "messageId": p.get("message_id"),
        "title": p["title"],
        "description": p.get("description", ""),
        "contentJson": p.get("content_json", []),
        "createdAt": p.get("created_at", ""),
        "updatedAt": p.get("updated_at", ""),
    }


@router.get("/pinned")
async def list_pinned():
    rows = await database.list_pinned_responses()
    return [{"id": r["id"], "title": r["title"], "description": r.get("description", ""), "createdAt": r.get("created_at", ""), "updatedAt": r.get("updated_at", "")} for r in rows]


@router.post("/pinned")
async def create_pinned(body: CreatePinnedBody):
    pinned_id = str(uuid.uuid4())
    pinned = await database.create_pinned_response(
        pinned_id,
        body.conversation_id,
        body.message_id,
        body.title,
        body.description,
        body.content_json or [],
    )
    return _camel_pinned(pinned)


@router.get("/pinned/{pinned_id}")
async def get_pinned(pinned_id: str):
    pinned = await database.get_pinned_response(pinned_id)
    if pinned is None:
        raise HTTPException(status_code=404, detail="Pinned response not found")
    return _camel_pinned(pinned)


@router.patch("/pinned/{pinned_id}")
async def update_pinned(pinned_id: str, body: UpdatePinnedBody):
    pinned = await database.get_pinned_response(pinned_id)
    if pinned is None:
        raise HTTPException(status_code=404, detail="Pinned response not found")
    updated = await database.update_pinned_response(pinned_id, body.title, body.description)
    return _camel_pinned(updated)


@router.delete("/pinned/{pinned_id}")
async def delete_pinned(pinned_id: str):
    deleted = await database.delete_pinned_response(pinned_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Pinned response not found")
    return {"deleted": pinned_id}
