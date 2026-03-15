"""
SQLite database layer — connection management, schema creation, query helpers.
All I/O is async via aiosqlite.
"""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

import aiosqlite

from config import app_config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema DDL
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS conversations (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at   TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS pinned_responses (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT,
    message_id      TEXT,
    title           TEXT NOT NULL DEFAULT 'Untitled',
    description     TEXT NOT NULL DEFAULT '',
    content_json    TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dashboards (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT 'Untitled Dashboard',
    layout_json     TEXT NOT NULL DEFAULT '[]',
    conversation_id TEXT DEFAULT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stories (
    id                      TEXT PRIMARY KEY,
    title                   TEXT NOT NULL DEFAULT 'Untitled Story',
    slides_json             TEXT NOT NULL DEFAULT '[]',
    auto_advance_interval   INTEGER DEFAULT NULL,
    conversation_id         TEXT DEFAULT NULL,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------
def _get_db_path() -> str:
    raw = app_config.database.path
    p = Path(raw)
    if not p.is_absolute():
        # Resolve relative to project root (parent of backend/)
        project_root = Path(__file__).parent.parent
        p = project_root / p
    p.parent.mkdir(parents=True, exist_ok=True)
    return str(p)


@asynccontextmanager
async def get_db():
    """Async context manager yielding an open aiosqlite connection."""
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = aiosqlite.Row
        yield db


async def init_db() -> None:
    """Create all tables if they don't exist. Called at startup."""
    db_path = _get_db_path()
    logger.info(f"Initialising database at {db_path}")
    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(SCHEMA_SQL)
        # Add conversation_id columns to existing tables (idempotent)
        for stmt in [
            "ALTER TABLE dashboards ADD COLUMN conversation_id TEXT DEFAULT NULL",
            "ALTER TABLE stories ADD COLUMN conversation_id TEXT DEFAULT NULL",
        ]:
            try:
                await db.execute(stmt)
            except Exception:
                pass  # Column already exists — ignore
        await db.commit()
    logger.info("Database schema initialised")


# ---------------------------------------------------------------------------
# Conversation helpers
# ---------------------------------------------------------------------------
async def create_conversation(conv_id: str, title: str) -> dict[str, Any]:
    async with get_db() as db:
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, title),
        )
        await db.commit()
        row = await (await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (conv_id,),
        )).fetchone()
        return dict(row)


async def get_conversation(conv_id: str) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        row = await (await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations "
            "WHERE id = ? AND deleted_at IS NULL",
            (conv_id,),
        )).fetchone()
        return dict(row) if row else None


async def list_conversations() -> list[dict[str, Any]]:
    async with get_db() as db:
        rows = await (await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations "
            "WHERE deleted_at IS NULL ORDER BY updated_at DESC"
        )).fetchall()
        return [dict(r) for r in rows]


async def soft_delete_conversation(conv_id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE conversations SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
            (conv_id,),
        )
        await db.commit()
        return cursor.rowcount > 0


async def update_conversation_title(conv_id: str, title: str) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE conversations SET title = ?, updated_at = datetime('now') "
            "WHERE id = ? AND deleted_at IS NULL",
            (title, conv_id),
        )
        await db.commit()
        if cursor.rowcount == 0:
            return None
        row = await (await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (conv_id,),
        )).fetchone()
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Message helpers
# ---------------------------------------------------------------------------
async def list_messages(conv_id: str) -> list[dict[str, Any]]:
    async with get_db() as db:
        rows = await (await db.execute(
            "SELECT id, conversation_id, role, content, created_at "
            "FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conv_id,),
        )).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["content"] = json.loads(d["content"])
            except (json.JSONDecodeError, TypeError):
                pass
            result.append(d)
        return result


async def persist_messages(
    conv_id: str,
    user_msg_id: str,
    user_content: Any,
    asst_msg_id: str,
    asst_content: Any,
) -> None:
    """
    Persist user + assistant messages in a single transaction.
    Called after streaming completes.
    """
    async with get_db() as db:
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
            (user_msg_id, conv_id, "user", json.dumps(user_content)),
        )
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
            (asst_msg_id, conv_id, "assistant", json.dumps(asst_content)),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            (conv_id,),
        )
        await db.commit()


# ---------------------------------------------------------------------------
# Dashboard helpers
# ---------------------------------------------------------------------------
async def create_dashboard(dash_id: str, title: str, layout_json: str = "[]") -> dict[str, Any]:
    async with get_db() as db:
        await db.execute(
            "INSERT INTO dashboards (id, title, layout_json) VALUES (?, ?, ?)",
            (dash_id, title, layout_json),
        )
        await db.commit()
        row = await (await db.execute(
            "SELECT id, title, layout_json, conversation_id, created_at, updated_at FROM dashboards WHERE id = ?",
            (dash_id,),
        )).fetchone()
        d = dict(row)
        d["layout_json"] = json.loads(d["layout_json"])
        return d


async def get_dashboard(dash_id: str) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        row = await (await db.execute(
            "SELECT id, title, layout_json, conversation_id, created_at, updated_at FROM dashboards WHERE id = ?",
            (dash_id,),
        )).fetchone()
        if not row:
            return None
        d = dict(row)
        d["layout_json"] = json.loads(d["layout_json"])
        return d


async def list_dashboards() -> list[dict[str, Any]]:
    async with get_db() as db:
        rows = await (await db.execute(
            "SELECT id, title, layout_json, created_at, updated_at FROM dashboards ORDER BY updated_at DESC"
        )).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                tiles = json.loads(d["layout_json"])
                d["tile_count"] = len(tiles)
            except Exception:
                d["tile_count"] = 0
            d.pop("layout_json", None)
            result.append(d)
        return result


async def update_dashboard(
    dash_id: str = "",
    title: Optional[str] = None,
    layout_json: Optional[str] = None,
    tiles_json: Optional[str] = None,
    *,
    id: str = "",
) -> Optional[dict[str, Any]]:
    """Update a dashboard's title and/or layout. Accepts either dash_id or id kwarg.
    tiles_json is an alias for layout_json (used by the LLM tool dispatch)."""
    _id = id or dash_id
    _layout = layout_json or tiles_json
    async with get_db() as db:
        if title is not None and _layout is not None:
            await db.execute(
                "UPDATE dashboards SET title = ?, layout_json = ?, updated_at = datetime('now') WHERE id = ?",
                (title, _layout, _id),
            )
        elif title is not None:
            await db.execute(
                "UPDATE dashboards SET title = ?, updated_at = datetime('now') WHERE id = ?",
                (title, _id),
            )
        elif _layout is not None:
            await db.execute(
                "UPDATE dashboards SET layout_json = ?, updated_at = datetime('now') WHERE id = ?",
                (_layout, _id),
            )
        await db.commit()
        return await get_dashboard(_id)


async def delete_dashboard(dash_id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM dashboards WHERE id = ?", (dash_id,))
        await db.commit()
        return cursor.rowcount > 0


async def set_resource_conversation(
    resource_type: str,
    resource_id: str,
    conversation_id: str,
) -> None:
    """Link a conversation to a dashboard or story. Creates the association lazily."""
    table = "dashboards" if resource_type == "dashboard" else "stories"
    async with get_db() as db:
        await db.execute(
            f"UPDATE {table} SET conversation_id = ?, updated_at = datetime('now') WHERE id = ?",
            (conversation_id, resource_id),
        )
        await db.commit()


# ---------------------------------------------------------------------------
# Pinned response helpers
# ---------------------------------------------------------------------------
async def create_pinned_response(
    pinned_id: str,
    conversation_id: Optional[str],
    message_id: Optional[str],
    title: str,
    description: str,
    content_json: Any,
) -> dict[str, Any]:
    async with get_db() as db:
        await db.execute(
            "INSERT INTO pinned_responses (id, conversation_id, message_id, title, description, content_json) VALUES (?, ?, ?, ?, ?, ?)",
            (pinned_id, conversation_id, message_id, title, description, json.dumps(content_json)),
        )
        await db.commit()
        row = await (await db.execute(
            "SELECT id, conversation_id, message_id, title, description, content_json, created_at, updated_at FROM pinned_responses WHERE id = ?",
            (pinned_id,),
        )).fetchone()
        d = dict(row)
        try:
            d["content_json"] = json.loads(d["content_json"])
        except Exception:
            pass
        return d


async def get_pinned_response(pinned_id: str) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        row = await (await db.execute(
            "SELECT id, conversation_id, message_id, title, description, content_json, created_at, updated_at FROM pinned_responses WHERE id = ?",
            (pinned_id,),
        )).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["content_json"] = json.loads(d["content_json"])
        except Exception:
            pass
        return d


async def list_pinned_responses() -> list[dict[str, Any]]:
    async with get_db() as db:
        rows = await (await db.execute(
            "SELECT id, conversation_id, message_id, title, description, created_at, updated_at FROM pinned_responses ORDER BY created_at DESC"
        )).fetchall()
        return [dict(r) for r in rows]


async def update_pinned_response(pinned_id: str, title: Optional[str] = None, description: Optional[str] = None) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        if title is not None:
            await db.execute("UPDATE pinned_responses SET title = ?, updated_at = datetime('now') WHERE id = ?", (title, pinned_id))
        if description is not None:
            await db.execute("UPDATE pinned_responses SET description = ?, updated_at = datetime('now') WHERE id = ?", (description, pinned_id))
        await db.commit()
        return await get_pinned_response(pinned_id)


async def delete_pinned_response(pinned_id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM pinned_responses WHERE id = ?", (pinned_id,))
        await db.commit()
        return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Story helpers
# ---------------------------------------------------------------------------
async def create_story(
    story_id: str,
    title: str,
    slides_json: Any,
    auto_advance_interval: Optional[int] = None,
) -> dict[str, Any]:
    # Normalise: if caller passes a pre-serialised JSON string, parse it to a list first
    if isinstance(slides_json, str):
        try:
            slides_json = json.loads(slides_json)
        except Exception:
            slides_json = []
    async with get_db() as db:
        await db.execute(
            "INSERT INTO stories (id, title, slides_json, auto_advance_interval) VALUES (?, ?, ?, ?)",
            (story_id, title, json.dumps(slides_json), auto_advance_interval),
        )
        await db.commit()
        row = await (await db.execute(
            "SELECT id, title, slides_json, auto_advance_interval, created_at, updated_at FROM stories WHERE id = ?",
            (story_id,),
        )).fetchone()
        d = dict(row)
        try:
            d["slides_json"] = json.loads(d["slides_json"])
        except Exception:
            pass
        return d


async def get_story(story_id: str) -> Optional[dict[str, Any]]:
    async with get_db() as db:
        row = await (await db.execute(
            "SELECT id, title, slides_json, auto_advance_interval, conversation_id, created_at, updated_at FROM stories WHERE id = ?",
            (story_id,),
        )).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["slides_json"] = json.loads(d["slides_json"])
        except Exception:
            pass
        return d


async def list_stories() -> list[dict[str, Any]]:
    async with get_db() as db:
        rows = await (await db.execute(
            "SELECT id, title, slides_json, auto_advance_interval, created_at, updated_at FROM stories ORDER BY updated_at DESC"
        )).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                slides = json.loads(d["slides_json"])
                d["slide_count"] = len(slides)
            except Exception:
                d["slide_count"] = 0
            d.pop("slides_json", None)
            result.append(d)
        return result


async def update_story(
    story_id: str = "",
    title: Optional[str] = None,
    slides_json: Optional[Any] = None,
    auto_advance_interval: Optional[int] = None,
    *,
    id: str = "",
) -> Optional[dict[str, Any]]:
    """Update a story. Accepts either story_id positional or id kwarg."""
    _id = id or story_id
    async with get_db() as db:
        if title is not None:
            await db.execute("UPDATE stories SET title = ?, updated_at = datetime('now') WHERE id = ?", (title, _id))
        if slides_json is not None:
            if isinstance(slides_json, str):
                try:
                    slides_json = json.loads(slides_json)
                except Exception:
                    slides_json = []
            await db.execute("UPDATE stories SET slides_json = ?, updated_at = datetime('now') WHERE id = ?", (json.dumps(slides_json), _id))
        if auto_advance_interval is not None:
            await db.execute("UPDATE stories SET auto_advance_interval = ?, updated_at = datetime('now') WHERE id = ?", (auto_advance_interval, _id))
        await db.commit()
        return await get_story(_id)


async def delete_story(story_id: str) -> bool:
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM stories WHERE id = ?", (story_id,))
        await db.commit()
        return cursor.rowcount > 0
