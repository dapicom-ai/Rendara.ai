"""
Dashboards router — CRUD endpoints for free-canvas dashboards.
"""

import json
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

import database

router = APIRouter()


def _camel_dash(d: dict) -> dict:
    layout = d.get("layout_json", [])
    return {
        "id": d["id"],
        "title": d["title"],
        "layoutJson": layout,
        "tileCount": len(layout) if isinstance(layout, list) else d.get("tile_count", 0),
        "createdAt": d.get("created_at", ""),
        "updatedAt": d.get("updated_at", ""),
        "conversationId": d.get("conversation_id"),
    }


class CreateDashboardBody(BaseModel):
    title: str
    layout_json: Optional[Any] = None


class UpdateDashboardBody(BaseModel):
    title: Optional[str] = None
    layout_json: Optional[Any] = None
    conversation_id: Optional[str] = None


@router.get("/dashboards")
async def list_dashboards():
    rows = await database.list_dashboards()
    return [{"id": r["id"], "title": r["title"], "tileCount": r.get("tile_count", 0), "createdAt": r.get("created_at", ""), "updatedAt": r.get("updated_at", "")} for r in rows]


@router.get("/dashboards/{dashboard_id}")
async def get_dashboard(dashboard_id: str):
    dash = await database.get_dashboard(dashboard_id)
    if dash is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return _camel_dash(dash)


def _normalise_layout(layout_json: Any) -> str:
    """Serialise layout_json to a JSON string, handling pre-serialised strings."""
    if layout_json is None:
        return "[]"
    if isinstance(layout_json, str):
        try:
            json.loads(layout_json)  # validate it's already valid JSON
            return layout_json
        except Exception:
            return "[]"
    return json.dumps(layout_json)


@router.post("/dashboards")
async def create_dashboard(body: CreateDashboardBody):
    dash_id = str(uuid.uuid4())
    dash = await database.create_dashboard(dash_id, body.title, _normalise_layout(body.layout_json))
    return _camel_dash(dash)


@router.patch("/dashboards/{dashboard_id}")
async def update_dashboard(dashboard_id: str, body: UpdateDashboardBody):
    dash = await database.get_dashboard(dashboard_id)
    if dash is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    layout_str = _normalise_layout(body.layout_json) if body.layout_json is not None else None
    updated = await database.update_dashboard(dashboard_id, body.title, layout_str)
    if body.conversation_id is not None:
        await database.set_resource_conversation("dashboard", dashboard_id, body.conversation_id)
        updated = await database.get_dashboard(dashboard_id)
    return _camel_dash(updated)


@router.delete("/dashboards/{dashboard_id}")
async def delete_dashboard(dashboard_id: str):
    deleted = await database.delete_dashboard(dashboard_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"deleted": dashboard_id}
