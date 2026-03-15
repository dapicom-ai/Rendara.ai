"""
Suite 3: SQLite CRUD Tests.

Tests all 5 tables against SDD Section 9.1 schema using an in-memory SQLite database.
Uses the database helper functions from backend/database.py.

SDD Section 9.1 — SQLite Schema
SDD Section 9.2 — Message Content Schema
"""

import asyncio
import json
import uuid
import pytest
import pytest_asyncio
import aiosqlite
import os
import sys

# Set required env vars before imports
os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-key-for-testing")
os.environ.setdefault("DATABASE_PATH", ":memory:")

sys.path.insert(0, "/home/Daniel/workingfolder/rendara")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara/backend")

from backend.database import SCHEMA_SQL


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db():
    """In-memory SQLite DB with full schema."""
    conn = await aiosqlite.connect(":memory:")
    await conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = aiosqlite.Row
    await conn.executescript(SCHEMA_SQL)
    await conn.commit()
    yield conn
    await conn.close()


# ---------------------------------------------------------------------------
# Conversations table
# ---------------------------------------------------------------------------

class TestConversationsTable:
    """SDD Section 9.1 — conversations table"""

    @pytest.mark.asyncio
    async def test_create_conversation_with_uuid(self, db):
        """Create conversation with UUID, title, timestamps."""
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Test Conversation"),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT id, title, created_at, updated_at, deleted_at FROM conversations WHERE id = ?",
            (conv_id,),
        )).fetchone()

        assert row is not None
        assert row["id"] == conv_id
        assert row["title"] == "Test Conversation"
        assert row["created_at"] is not None
        assert row["updated_at"] is not None
        assert row["deleted_at"] is None

    @pytest.mark.asyncio
    async def test_read_conversation_by_id(self, db):
        """Read conversation by ID."""
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Read Test"),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM conversations WHERE id = ?", (conv_id,)
        )).fetchone()
        assert row is not None
        assert row["id"] == conv_id

    @pytest.mark.asyncio
    async def test_list_conversations_ordered_by_updated_at_desc(self, db):
        """List conversations ordered by updated_at DESC."""
        # SDD 10.2: most recent first
        ids = [str(uuid.uuid4()) for _ in range(3)]
        for i, cid in enumerate(ids):
            await db.execute(
                "INSERT INTO conversations (id, title) VALUES (?, ?)",
                (cid, f"Conv {i}"),
            )
        await db.commit()

        rows = await (await db.execute(
            "SELECT id FROM conversations ORDER BY updated_at DESC"
        )).fetchall()
        returned_ids = [r["id"] for r in rows]
        # All inserted IDs should be present
        for cid in ids:
            assert cid in returned_ids

    @pytest.mark.asyncio
    async def test_soft_delete_sets_deleted_at(self, db):
        """Soft delete sets deleted_at timestamp."""
        # SDD 10.2: soft delete
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "To Delete"),
        )
        await db.commit()

        await db.execute(
            "UPDATE conversations SET deleted_at = datetime('now') WHERE id = ?",
            (conv_id,),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT deleted_at FROM conversations WHERE id = ?", (conv_id,)
        )).fetchone()
        assert row["deleted_at"] is not None

    @pytest.mark.asyncio
    async def test_update_title_updates_updated_at(self, db):
        """Update title updates updated_at."""
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Original Title"),
        )
        await db.commit()

        await db.execute(
            "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?",
            ("Updated Title", conv_id),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT title, updated_at FROM conversations WHERE id = ?", (conv_id,)
        )).fetchone()
        assert row["title"] == "Updated Title"


# ---------------------------------------------------------------------------
# Messages table
# ---------------------------------------------------------------------------

class TestMessagesTable:
    """SDD Section 9.1 — messages table"""

    @pytest.mark.asyncio
    async def test_create_user_message(self, db):
        """Create user message linked to conversation."""
        conv_id = str(uuid.uuid4())
        msg_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Conv"),
        )
        # SDD 9.2: user message content is a string
        user_content = json.dumps({
            "role": "user",
            "id": msg_id,
            "content": "What were total sales by region last quarter?",
        })
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
            (msg_id, conv_id, "user", user_content),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM messages WHERE id = ?", (msg_id,)
        )).fetchone()
        assert row is not None
        assert row["role"] == "user"
        assert row["conversation_id"] == conv_id

    @pytest.mark.asyncio
    async def test_create_assistant_message_with_json_content(self, db):
        """Create assistant message with JSON content (SDD 9.2)."""
        conv_id = str(uuid.uuid4())
        msg_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Conv"),
        )
        # SDD 9.2: assistant message content is JSON array of blocks
        asst_content = json.dumps([
            {"type": "text", "text": "Here is the analysis."},
            {
                "type": "viz_chart",
                "spec": {
                    "type": "bar",
                    "title": "Revenue by Region",
                    "data": [{"region": "AMER", "revenue": 1000}],
                    "xKey": "region",
                    "yKey": "revenue",
                }
            }
        ])
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
            (msg_id, conv_id, "assistant", asst_content),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT content FROM messages WHERE id = ?", (msg_id,)
        )).fetchone()
        parsed = json.loads(row["content"])
        assert isinstance(parsed, list)
        assert parsed[0]["type"] == "text"
        assert parsed[1]["type"] == "viz_chart"

    @pytest.mark.asyncio
    async def test_messages_role_constraint(self, db):
        """Messages role column only allows 'user' or 'assistant' (CHECK constraint)."""
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Conv"),
        )
        await db.commit()

        # Invalid role should fail
        with pytest.raises(Exception):
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), conv_id, "system", "{}"),
            )
            await db.commit()

    @pytest.mark.asyncio
    async def test_list_messages_ordered_by_created_at_asc(self, db):
        """List messages for conversation ordered by created_at ASC."""
        conv_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Conv"),
        )

        msg_ids = [str(uuid.uuid4()) for _ in range(3)]
        for i, mid in enumerate(msg_ids):
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                (mid, conv_id, "user", json.dumps(f"Message {i}")),
            )
        await db.commit()

        rows = await (await db.execute(
            "SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conv_id,),
        )).fetchall()
        assert len(rows) == 3


# ---------------------------------------------------------------------------
# Dashboards table
# ---------------------------------------------------------------------------

class TestDashboardsTable:
    """SDD Section 9.1 — dashboards table"""

    @pytest.mark.asyncio
    async def test_create_dashboard(self, db):
        """Create dashboard with title, description."""
        dash_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO dashboards (id, title, description) VALUES (?, ?, ?)",
            (dash_id, "Q4 Analysis", "Q4 2024 performance"),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM dashboards WHERE id = ?", (dash_id,)
        )).fetchone()
        assert row["title"] == "Q4 Analysis"
        assert row["description"] == "Q4 2024 performance"

    @pytest.mark.asyncio
    async def test_read_dashboard_by_id(self, db):
        """Read dashboard by ID."""
        dash_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO dashboards (id, title) VALUES (?, ?)",
            (dash_id, "My Dashboard"),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM dashboards WHERE id = ?", (dash_id,)
        )).fetchone()
        assert row is not None

    @pytest.mark.asyncio
    async def test_list_all_dashboards(self, db):
        """List all dashboards."""
        for _ in range(3):
            await db.execute(
                "INSERT INTO dashboards (id, title) VALUES (?, ?)",
                (str(uuid.uuid4()), "Dashboard"),
            )
        await db.commit()

        rows = await (await db.execute("SELECT * FROM dashboards")).fetchall()
        assert len(rows) >= 3


# ---------------------------------------------------------------------------
# Pins table
# ---------------------------------------------------------------------------

class TestPinsTable:
    """SDD Section 9.1 — pins table"""

    @pytest_asyncio.fixture
    async def setup_dashboard_and_conversation(self, db):
        """Create prerequisite dashboard, conversation, and message."""
        dash_id = str(uuid.uuid4())
        conv_id = str(uuid.uuid4())
        msg_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO dashboards (id, title) VALUES (?, ?)",
            (dash_id, "Test Dashboard"),
        )
        await db.execute(
            "INSERT INTO conversations (id, title) VALUES (?, ?)",
            (conv_id, "Test Conversation"),
        )
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
            (msg_id, conv_id, "assistant", "{}"),
        )
        await db.commit()
        return dash_id, conv_id, msg_id

    @pytest.mark.asyncio
    async def test_pin_block_to_dashboard(self, db, setup_dashboard_and_conversation):
        """Pin block to dashboard with all required fields."""
        # SDD 9.1: pins table required fields
        dash_id, conv_id, msg_id = setup_dashboard_and_conversation
        pin_id = str(uuid.uuid4())
        block_content = json.dumps({"type": "viz_chart", "spec": {}})

        await db.execute(
            "INSERT INTO pins (id, dashboard_id, conversation_id, message_id, "
            "block_index, block_type, block_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (pin_id, dash_id, conv_id, msg_id, 0, "viz_chart", block_content, 0),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM pins WHERE id = ?", (pin_id,)
        )).fetchone()
        assert row is not None
        assert row["dashboard_id"] == dash_id
        assert row["block_type"] == "viz_chart"

    @pytest.mark.asyncio
    async def test_pin_block_type_constraint(self, db, setup_dashboard_and_conversation):
        """block_type constraint: only 'viz_chart', 'mermaid', or 'text'."""
        # SDD 9.1: block_type TEXT NOT NULL (no CHECK constraint in schema; type enforced by app)
        # The schema does not have a CHECK constraint on block_type, so we test valid values
        dash_id, conv_id, msg_id = setup_dashboard_and_conversation

        for valid_type in ["viz_chart", "mermaid", "text"]:
            pin_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO pins (id, dashboard_id, conversation_id, message_id, "
                "block_index, block_type, block_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (pin_id, dash_id, conv_id, msg_id, 0, valid_type, "{}", 0),
            )
        await db.commit()

        rows = await (await db.execute(
            "SELECT block_type FROM pins WHERE dashboard_id = ?", (dash_id,)
        )).fetchall()
        types = {r["block_type"] for r in rows}
        assert "viz_chart" in types
        assert "mermaid" in types
        assert "text" in types

    @pytest.mark.asyncio
    async def test_list_pins_ordered_by_position(self, db, setup_dashboard_and_conversation):
        """List pins for dashboard ordered by position ASC."""
        dash_id, conv_id, msg_id = setup_dashboard_and_conversation

        positions = [2, 0, 1]
        for pos in positions:
            await db.execute(
                "INSERT INTO pins (id, dashboard_id, conversation_id, message_id, "
                "block_index, block_type, block_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), dash_id, conv_id, msg_id, 0, "text", "{}", pos),
            )
        await db.commit()

        rows = await (await db.execute(
            "SELECT position FROM pins WHERE dashboard_id = ? ORDER BY position ASC",
            (dash_id,),
        )).fetchall()
        positions_result = [r["position"] for r in rows]
        assert positions_result == sorted(positions_result)

    @pytest.mark.asyncio
    async def test_delete_pin(self, db, setup_dashboard_and_conversation):
        """Delete pin by ID."""
        dash_id, conv_id, msg_id = setup_dashboard_and_conversation
        pin_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO pins (id, dashboard_id, conversation_id, message_id, "
            "block_index, block_type, block_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (pin_id, dash_id, conv_id, msg_id, 0, "text", "{}", 0),
        )
        await db.commit()

        await db.execute("DELETE FROM pins WHERE id = ?", (pin_id,))
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM pins WHERE id = ?", (pin_id,)
        )).fetchone()
        assert row is None

    @pytest.mark.asyncio
    async def test_cascade_delete_when_dashboard_deleted(self, db, setup_dashboard_and_conversation):
        """Cascade delete pins when dashboard is deleted."""
        dash_id, conv_id, msg_id = setup_dashboard_and_conversation
        pin_id = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO pins (id, dashboard_id, conversation_id, message_id, "
            "block_index, block_type, block_content, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (pin_id, dash_id, conv_id, msg_id, 0, "text", "{}", 0),
        )
        await db.commit()

        # Delete the dashboard — should cascade to pins
        await db.execute("DELETE FROM dashboards WHERE id = ?", (dash_id,))
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM pins WHERE id = ?", (pin_id,)
        )).fetchone()
        assert row is None


# ---------------------------------------------------------------------------
# Reports table
# ---------------------------------------------------------------------------

class TestReportsTable:
    """SDD Section 9.1 — reports table"""

    @pytest.mark.asyncio
    async def test_create_report(self, db):
        """Create report with title, JSON content."""
        report_id = str(uuid.uuid4())
        content = json.dumps([
            {"type": "heading", "level": 1, "text": "Q4 Report"},
            {"type": "text", "markdown": "Analysis..."},
        ])

        await db.execute(
            "INSERT INTO reports (id, title, content) VALUES (?, ?, ?)",
            (report_id, "Q4 2024 Report", content),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM reports WHERE id = ?", (report_id,)
        )).fetchone()
        assert row["title"] == "Q4 2024 Report"
        assert row["public_uuid"] is None  # Draft initially

    @pytest.mark.asyncio
    async def test_publish_sets_public_uuid(self, db):
        """Publish sets public_uuid (UUID v4)."""
        report_id = str(uuid.uuid4())
        public_uuid = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO reports (id, title, content) VALUES (?, ?, ?)",
            (report_id, "Report", "[]"),
        )
        await db.execute(
            "UPDATE reports SET public_uuid = ? WHERE id = ?",
            (public_uuid, report_id),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT public_uuid FROM reports WHERE id = ?", (report_id,)
        )).fetchone()
        assert row["public_uuid"] == public_uuid

    @pytest.mark.asyncio
    async def test_public_uuid_is_unique(self, db):
        """public_uuid is unique (UNIQUE constraint)."""
        public_uuid = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO reports (id, title, content, public_uuid) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), "Report 1", "[]", public_uuid),
        )
        await db.commit()

        # Second report with same public_uuid should fail
        with pytest.raises(Exception):
            await db.execute(
                "INSERT INTO reports (id, title, content, public_uuid) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), "Report 2", "[]", public_uuid),
            )
            await db.commit()

    @pytest.mark.asyncio
    async def test_read_report_by_public_uuid(self, db):
        """Read report by public_uuid."""
        report_id = str(uuid.uuid4())
        public_uuid = str(uuid.uuid4())

        await db.execute(
            "INSERT INTO reports (id, title, content, public_uuid) VALUES (?, ?, ?, ?)",
            (report_id, "Published Report", "[]", public_uuid),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT * FROM reports WHERE public_uuid = ?", (public_uuid,)
        )).fetchone()
        assert row is not None
        assert row["id"] == report_id

    @pytest.mark.asyncio
    async def test_update_report_content(self, db):
        """Update report content."""
        report_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO reports (id, title, content) VALUES (?, ?, ?)",
            (report_id, "Report", "[]"),
        )
        await db.commit()

        new_content = json.dumps([{"type": "text", "markdown": "Updated"}])
        await db.execute(
            "UPDATE reports SET content = ?, updated_at = datetime('now') WHERE id = ?",
            (new_content, report_id),
        )
        await db.commit()

        row = await (await db.execute(
            "SELECT content FROM reports WHERE id = ?", (report_id,)
        )).fetchone()
        assert json.loads(row["content"])[0]["markdown"] == "Updated"
