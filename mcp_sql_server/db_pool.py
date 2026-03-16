"""Shared asyncpg connection pool for the MCP SQL server."""
import asyncpg

PG_DSN = "postgresql://rendara:rendara123@localhost:5432/telco_lakehouse"

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool (lazy init)."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(PG_DSN, min_size=2, max_size=10)
    return _pool

async def close_pool():
    """Close the pool on shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
