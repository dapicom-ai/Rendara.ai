"""
Stories router — CRUD for /api/stories.
"""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

import database

router = APIRouter()


class CreateStoryBody(BaseModel):
    title: str = "Untitled Story"
    slides_json: Any = None
    auto_advance_interval: Optional[int] = None


class UpdateStoryBody(BaseModel):
    title: Optional[str] = None
    slides_json: Optional[Any] = None
    auto_advance_interval: Optional[int] = None
    conversation_id: Optional[str] = None


def _camel_story(s: dict, include_slides: bool = True) -> dict:
    result = {
        "id": s["id"],
        "title": s["title"],
        "autoAdvanceInterval": s.get("auto_advance_interval"),
        "createdAt": s.get("created_at", ""),
        "updatedAt": s.get("updated_at", ""),
        "conversationId": s.get("conversation_id"),
    }
    if include_slides:
        result["slidesJson"] = s.get("slides_json", [])
    result["slideCount"] = len(s.get("slides_json", [])) if include_slides else s.get("slide_count", 0)
    return result


@router.get("/stories")
async def list_stories():
    rows = await database.list_stories()
    return [{"id": r["id"], "title": r["title"], "slideCount": r.get("slide_count", 0), "autoAdvanceInterval": r.get("auto_advance_interval"), "createdAt": r.get("created_at", ""), "updatedAt": r.get("updated_at", "")} for r in rows]


@router.post("/stories")
async def create_story(body: CreateStoryBody):
    story_id = str(uuid.uuid4())
    story = await database.create_story(
        story_id,
        body.title,
        body.slides_json or [],
        body.auto_advance_interval,
    )
    return _camel_story(story)


@router.get("/stories/{story_id}")
async def get_story(story_id: str):
    story = await database.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return _camel_story(story)


@router.patch("/stories/{story_id}")
async def update_story(story_id: str, body: UpdateStoryBody):
    story = await database.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    updated = await database.update_story(story_id, body.title, body.slides_json, body.auto_advance_interval)
    if body.conversation_id is not None:
        await database.set_resource_conversation("story", story_id, body.conversation_id)
        updated = await database.get_story(story_id)
    return _camel_story(updated)


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str):
    deleted = await database.delete_story(story_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"deleted": story_id}
