"""
Suite: Update Tools Tests — UT-DB-1 through UT-DB-14

Tests the new DB helpers and _execute_rendara_tool dispatch added in
the Dashboard & Story Rich Content wave (ANVIL).

Coverage:
    UT-DB-1   update_dashboard: title only
    UT-DB-2   update_dashboard: tiles_json only
    UT-DB-3   update_dashboard: both title + tiles_json
    UT-DB-4   update_dashboard: neither field — row unchanged
    UT-DB-5   update_dashboard: non-existent ID returns None
    UT-DB-6   update_story: title only
    UT-DB-7   update_story: slides_json only (list input)
    UT-DB-8   update_story: slides_json as JSON string (auto-parsed)
    UT-DB-9   update_story: auto_advance_interval field
    UT-DB-10  update_story: non-existent ID returns None
    UT-DB-11  set_resource_conversation: dashboard — column updated
    UT-DB-12  set_resource_conversation: story — column updated
    UT-DB-13  _execute_rendara_tool update_dashboard — success tuple
    UT-DB-14  _execute_rendara_tool update_story — success tuple

Run from project root:
    PYTHONPATH=/home/Daniel/workingfolder/rendara/backend \
    pytest backend/tests/test_update_tools.py -v
"""

import json
import os
import sys
import uuid
import pytest
import pytest_asyncio
import aiosqlite

# ---------------------------------------------------------------------------
# Environment setup (must happen before any backend import)
# ---------------------------------------------------------------------------
os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-key-for-testing")
os.environ.setdefault("DATABASE_PATH", ":memory:")

sys.path.insert(0, "/home/Daniel/workingfolder/rendara")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara/backend")

from backend.database import SCHEMA_SQL  # noqa: E402
import backend.database as db_module       # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def mem_db():
    """In-memory SQLite DB with full schema, isolated per test."""
    conn = await aiosqlite.connect(":memory:")
    await conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = aiosqlite.Row
    await conn.executescript(SCHEMA_SQL)
    await conn.commit()
    yield conn
    await conn.close()


async def _create_dash(conn, title="Test Dashboard", tiles=None):
    """Helper: insert a dashboard row and return its ID."""
    dash_id = str(uuid.uuid4())
    layout = json.dumps(tiles or [])
    await conn.execute(
        "INSERT INTO dashboards (id, title, layout_json) VALUES (?, ?, ?)",
        (dash_id, title, layout),
    )
    await conn.commit()
    return dash_id


async def _create_story(conn, title="Test Story", slides=None):
    """Helper: insert a story row and return its ID."""
    story_id = str(uuid.uuid4())
    slides_str = json.dumps(slides or [])
    await conn.execute(
        "INSERT INTO stories (id, title, slides_json) VALUES (?, ?, ?)",
        (story_id, title, slides_str),
    )
    await conn.commit()
    return story_id


# ---------------------------------------------------------------------------
# Patch db_module.get_db to use our in-memory connection
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager


def make_get_db_patch(conn):
    """Return an asynccontextmanager that always yields the given connection."""
    @asynccontextmanager
    async def _patched_get_db():
        yield conn
    return _patched_get_db


# ---------------------------------------------------------------------------
# UT-DB-1: update_dashboard — title only
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_1_update_dashboard_title_only(mem_db, monkeypatch):
    """UT-DB-1: Updating only the title leaves layout_json unchanged."""
    dash_id = await _create_dash(mem_db, title="Original Title", tiles=[{"id": "t1"}])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_dashboard(dash_id, title="New Title")

    assert result is not None
    assert result["title"] == "New Title"
    # layout_json must be unchanged — still contains the seeded tile
    assert len(result["layout_json"]) == 1
    assert result["layout_json"][0]["id"] == "t1"


# ---------------------------------------------------------------------------
# UT-DB-2: update_dashboard — tiles_json only
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_2_update_dashboard_tiles_only(mem_db, monkeypatch):
    """UT-DB-2: Updating only tiles_json leaves title unchanged."""
    dash_id = await _create_dash(mem_db, title="Stable Title", tiles=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    new_tiles = [{"id": "t-new", "type": "text", "content": "hello", "x": 0, "y": 0, "w": 50, "h": 50}]
    result = await db_module.update_dashboard(dash_id, tiles_json=json.dumps(new_tiles))

    assert result is not None
    assert result["title"] == "Stable Title"
    assert len(result["layout_json"]) == 1
    assert result["layout_json"][0]["id"] == "t-new"


# ---------------------------------------------------------------------------
# UT-DB-3: update_dashboard — both title and tiles_json
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_3_update_dashboard_both_fields(mem_db, monkeypatch):
    """UT-DB-3: Both title and tiles_json can be updated in one call."""
    dash_id = await _create_dash(mem_db, title="Old Title", tiles=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    new_tiles = [{"id": "t-both", "type": "text", "content": "both", "x": 0, "y": 0, "w": 50, "h": 50}]
    result = await db_module.update_dashboard(
        dash_id,
        title="Updated Title",
        tiles_json=json.dumps(new_tiles),
    )

    assert result is not None
    assert result["title"] == "Updated Title"
    assert len(result["layout_json"]) == 1
    assert result["layout_json"][0]["id"] == "t-both"


# ---------------------------------------------------------------------------
# UT-DB-4: update_dashboard — neither field provided
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_4_update_dashboard_no_changes(mem_db, monkeypatch):
    """UT-DB-4: Calling update_dashboard with no fields returns the unchanged row."""
    dash_id = await _create_dash(mem_db, title="Unchanged", tiles=[{"id": "orig"}])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_dashboard(dash_id)

    assert result is not None
    assert result["title"] == "Unchanged"
    assert result["layout_json"][0]["id"] == "orig"


# ---------------------------------------------------------------------------
# UT-DB-5: update_dashboard — non-existent ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_5_update_dashboard_nonexistent(mem_db, monkeypatch):
    """UT-DB-5: Non-existent dashboard ID returns None."""
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_dashboard("nonexistent-id", title="Ghost")

    assert result is None


# ---------------------------------------------------------------------------
# UT-DB-6: update_story — title only
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_6_update_story_title_only(mem_db, monkeypatch):
    """UT-DB-6: Updating story title only leaves slides_json unchanged."""
    story_id = await _create_story(
        mem_db,
        title="Original Story",
        slides=[{"id": "s1", "title": "Slide One", "content": "Content."}],
    )
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_story(story_id, title="Updated Story")

    assert result is not None
    assert result["title"] == "Updated Story"
    assert len(result["slides_json"]) == 1
    assert result["slides_json"][0]["id"] == "s1"


# ---------------------------------------------------------------------------
# UT-DB-7: update_story — slides_json as list
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_7_update_story_slides_list(mem_db, monkeypatch):
    """UT-DB-7: Passing slides_json as a Python list serialises and stores it."""
    story_id = await _create_story(mem_db, title="Story", slides=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    new_slides = [
        {"id": "s-new", "title": "New Slide", "content": "New content."},
    ]
    result = await db_module.update_story(story_id, slides_json=new_slides)

    assert result is not None
    assert len(result["slides_json"]) == 1
    assert result["slides_json"][0]["id"] == "s-new"


# ---------------------------------------------------------------------------
# UT-DB-8: update_story — slides_json as JSON string
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_8_update_story_slides_json_string(mem_db, monkeypatch):
    """UT-DB-8: Passing slides_json as a pre-serialised JSON string is auto-parsed."""
    story_id = await _create_story(mem_db, title="Story", slides=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    new_slides = [{"id": "s-str", "title": "String Slide", "content": "From string."}]
    result = await db_module.update_story(story_id, slides_json=json.dumps(new_slides))

    assert result is not None
    assert len(result["slides_json"]) == 1
    assert result["slides_json"][0]["id"] == "s-str"


# ---------------------------------------------------------------------------
# UT-DB-9: update_story — auto_advance_interval
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_9_update_story_auto_advance(mem_db, monkeypatch):
    """UT-DB-9: Updating auto_advance_interval stores the integer value."""
    story_id = await _create_story(mem_db, title="Auto Advance Story")
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_story(story_id, auto_advance_interval=5)

    assert result is not None
    assert result["auto_advance_interval"] == 5


# ---------------------------------------------------------------------------
# UT-DB-10: update_story — non-existent ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_10_update_story_nonexistent(mem_db, monkeypatch):
    """UT-DB-10: Non-existent story ID returns None."""
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    result = await db_module.update_story("ghost-story-id", title="Ghost")

    assert result is None


# ---------------------------------------------------------------------------
# UT-DB-11: set_resource_conversation — dashboard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_11_set_resource_conversation_dashboard(mem_db, monkeypatch):
    """UT-DB-11: set_resource_conversation writes conversation_id to dashboards table."""
    dash_id = await _create_dash(mem_db, title="Dashboard For Conv")
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    conv_id = str(uuid.uuid4())
    await db_module.set_resource_conversation("dashboard", dash_id, conv_id)

    # Verify by reading back
    result = await db_module.get_dashboard(dash_id)
    assert result is not None
    assert result["conversation_id"] == conv_id


# ---------------------------------------------------------------------------
# UT-DB-12: set_resource_conversation — story
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_12_set_resource_conversation_story(mem_db, monkeypatch):
    """UT-DB-12: set_resource_conversation writes conversation_id to stories table."""
    story_id = await _create_story(mem_db, title="Story For Conv")
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    conv_id = str(uuid.uuid4())
    await db_module.set_resource_conversation("story", story_id, conv_id)

    result = await db_module.get_story(story_id)
    assert result is not None
    assert result["conversation_id"] == conv_id


# ---------------------------------------------------------------------------
# UT-DB-13: _execute_rendara_tool — update_dashboard success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_13_execute_rendara_update_dashboard(mem_db, monkeypatch):
    """UT-DB-13: _execute_rendara_tool('update_dashboard', ...) returns success tuple."""
    dash_id = await _create_dash(mem_db, title="Pre-Update Dashboard", tiles=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    from backend.services import mcp_client

    new_tiles = [
        {"id": "t1", "type": "text", "content": [{"type": "text", "text": "Updated"}],
         "x": 0, "y": 0, "w": 50, "h": 50},
    ]
    success, result, duration_ms, server_name, error_code = (
        await mcp_client._execute_rendara_tool(
            "update_dashboard",
            {"dashboard_id": dash_id, "tiles": new_tiles},
        )
    )

    assert success is True
    assert error_code == ""
    assert isinstance(result, dict)
    assert result.get("dashboard_id") == dash_id
    assert result.get("updated") is True
    assert isinstance(duration_ms, int)
    assert server_name == "rendara_tools"

    # Verify the DB was actually updated
    stored = await db_module.get_dashboard(dash_id)
    assert stored is not None
    assert len(stored["layout_json"]) == 1
    assert stored["layout_json"][0]["id"] == "t1"


# ---------------------------------------------------------------------------
# UT-DB-14: _execute_rendara_tool — update_story success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_UT_DB_14_execute_rendara_update_story(mem_db, monkeypatch):
    """UT-DB-14: _execute_rendara_tool('update_story', ...) returns success tuple."""
    story_id = await _create_story(mem_db, title="Pre-Update Story", slides=[])
    monkeypatch.setattr(db_module, "get_db", make_get_db_patch(mem_db))

    from backend.services import mcp_client

    new_slides = [
        {"id": "s1", "title": "Updated Slide", "content": "Updated content."},
    ]
    success, result, duration_ms, server_name, error_code = (
        await mcp_client._execute_rendara_tool(
            "update_story",
            {"story_id": story_id, "slides": new_slides},
        )
    )

    assert success is True
    assert error_code == ""
    assert isinstance(result, dict)
    assert result.get("story_id") == story_id
    assert result.get("updated") is True
    assert isinstance(duration_ms, int)
    assert server_name == "rendara_tools"

    # Verify DB updated
    stored = await db_module.get_story(story_id)
    assert stored is not None
    assert len(stored["slides_json"]) == 1
    assert stored["slides_json"][0]["id"] == "s1"
