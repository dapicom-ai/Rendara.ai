"""
SQL safety helpers for the LangGraph MCP server.
Enforces read-only access, row limits, and query timeouts.
"""
import re
import asyncio
from typing import Any


def validate_select_only(sql: str) -> None:
    """Raise ValueError if sql is not a SELECT statement."""
    clean = sql.strip().lstrip(";").strip().upper()
    forbidden = re.compile(
        r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|CALL)\b"
    )
    if not clean.startswith("SELECT"):
        raise ValueError(f"Only SELECT statements allowed. Got: {sql[:80]!r}")
    if forbidden.search(clean):
        raise ValueError(f"Forbidden SQL keyword detected in: {sql[:80]!r}")


def enforce_row_limit(sql: str, limit: int, hard_cap: int = 5000) -> str:
    """Append LIMIT clause if not present. Never exceed hard_cap."""
    effective = min(limit, hard_cap)
    if re.search(r"\bLIMIT\b", sql, re.IGNORECASE):
        return sql
    return f"{sql.rstrip(';').rstrip()} LIMIT {effective}"


async def execute_with_timeout(coro: Any, timeout_seconds: int) -> Any:
    """Wrap a coroutine with asyncio.wait_for timeout."""
    return await asyncio.wait_for(coro, timeout=float(timeout_seconds))
