"""
Pytest fixtures for Rendara backend tests.

Uses an in-memory SQLite database so tests do not affect demo.db.
Sets OPENROUTER_API_KEY env var to a dummy value for config loading.
"""

import os
import sys
import pytest
import pytest_asyncio
import aiosqlite

# Ensure OPENROUTER_API_KEY is set before any backend module is imported
os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-key-for-testing")
os.environ.setdefault("DATABASE_PATH", ":memory:")

# Add the project root and backend dir to sys.path
sys.path.insert(0, "/home/Daniel/workingfolder/rendara")
sys.path.insert(0, "/home/Daniel/workingfolder/rendara/backend")


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def db():
    """
    Provide an in-memory aiosqlite connection with full schema.
    Isolated per test.
    """
    # Import here so env vars are set first
    from backend.database import SCHEMA_SQL

    conn = await aiosqlite.connect(":memory:")
    await conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = aiosqlite.Row
    await conn.executescript(SCHEMA_SQL)
    await conn.commit()
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def client():
    """
    Provide an httpx AsyncClient against the FastAPI app.
    Uses TestClient pattern with httpx.
    """
    import httpx
    from backend.main import app

    async with httpx.AsyncClient(app=app, base_url="http://test") as c:
        yield c
